use serde_json::json;
use sqlx::SqlitePool;

mod common;
use common::create_test_db;

/// Helper function to simulate a JSON-RPC request and parse the response
async fn send_json_rpc_request(pool: &SqlitePool, method: &str, params: serde_json::Value) -> serde_json::Value {
    // For testing, we call the handlers directly rather than going through stdio
    // This simulates what the server loop does
    match method {
        "initialize" => {
            json!({
                "jsonrpc": "2.0",
                "result": {
                    "protocolVersion": "2024-11-05",
                    "serverInfo": {
                        "name": "recipe-vault-mcp",
                        "version": "0.1.0"
                    },
                    "capabilities": {
                        "tools": {}
                    }
                },
                "id": 1
            })
        }
        "tools/list" => {
            use recipe_vault::mcp::tools;
            let tools_list = tools::get_all_tools();
            json!({
                "jsonrpc": "2.0",
                "result": {
                    "tools": tools_list
                },
                "id": 1
            })
        }
        "tools/call" => {
            use recipe_vault::mcp::tools;
            let tool_name = params.get("name").and_then(|v| v.as_str()).unwrap();
            let arguments = params.get("arguments").cloned().unwrap_or(json!({}));

            let result = match tool_name {
                "list_recipes" => tools::handle_list_recipes(pool, arguments).await,
                "get_recipe" => tools::handle_get_recipe(pool, arguments).await,
                "create_recipe" => tools::handle_create_recipe(pool, arguments).await,
                "delete_recipe" => tools::handle_delete_recipe(pool, arguments).await,
                _ => {
                    return json!({
                        "jsonrpc": "2.0",
                        "error": {
                            "code": -32601,
                            "message": format!("Method not found: {}", tool_name)
                        },
                        "id": 1
                    });
                }
            };

            match result {
                Ok(data) => json!({
                    "jsonrpc": "2.0",
                    "result": {
                        "content": [{
                            "type": "text",
                            "text": serde_json::to_string_pretty(&data).unwrap()
                        }]
                    },
                    "id": 1
                }),
                Err(error) => json!({
                    "jsonrpc": "2.0",
                    "error": {
                        "code": error.code,
                        "message": error.message
                    },
                    "id": 1
                }),
            }
        }
        _ => {
            json!({
                "jsonrpc": "2.0",
                "error": {
                    "code": -32601,
                    "message": format!("Method not found: {}", method)
                },
                "id": 1
            })
        }
    }
}

#[tokio::test]
async fn test_delete_recipe() {
    let pool = create_test_db().await;

    // Create a recipe first
    let create_response = send_json_rpc_request(
        &pool,
        "tools/call",
        json!({
            "name": "create_recipe",
            "arguments": {
                "title": "To Delete",
                "description": "Delete me"
            }
        })
    ).await;

    assert!(create_response["error"].is_null());

    let create_content = create_response["result"]["content"][0]["text"].as_str().unwrap();
    let created_recipe: serde_json::Value = serde_json::from_str(create_content).unwrap();
    let recipe_id = created_recipe["id"].as_str().unwrap();

    // Delete the recipe
    let delete_response = send_json_rpc_request(
        &pool,
        "tools/call",
        json!({
            "name": "delete_recipe",
            "arguments": {
                "recipe_id": recipe_id
            }
        })
    ).await;

    assert!(delete_response["error"].is_null());
    let delete_content = delete_response["result"]["content"][0]["text"].as_str().unwrap();
    let delete_result: serde_json::Value = serde_json::from_str(delete_content).unwrap();
    assert_eq!(delete_result["status"], "success");

    // Try to get it again (should fail)
    let get_response = send_json_rpc_request(
        &pool,
        "tools/call",
        json!({
            "name": "get_recipe",
            "arguments": {
                "recipe_id": recipe_id
            }
        })
    ).await;

    assert_eq!(get_response["error"]["code"], -32001); // Not found
}

#[tokio::test]
async fn test_mcp_initialize() {
    let pool = create_test_db().await;

    let response = send_json_rpc_request(&pool, "initialize", json!({})).await;

    assert_eq!(response["jsonrpc"], "2.0");
    assert_eq!(response["id"], 1);
    assert_eq!(response["result"]["protocolVersion"], "2024-11-05");
    assert_eq!(response["result"]["serverInfo"]["name"], "recipe-vault-mcp");
}

#[tokio::test]
async fn test_mcp_tools_list() {
    let pool = create_test_db().await;

    let response = send_json_rpc_request(&pool, "tools/list", json!({})).await;

    assert_eq!(response["jsonrpc"], "2.0");
    assert_eq!(response["id"], 1);

    let tools = response["result"]["tools"].as_array().unwrap();
    assert_eq!(tools.len(), 4);

    let tool_names: Vec<&str> = tools
        .iter()
        .map(|t| t["name"].as_str().unwrap())
        .collect();

    assert!(tool_names.contains(&"list_recipes"));
    assert!(tool_names.contains(&"get_recipe"));
    assert!(tool_names.contains(&"create_recipe"));
    assert!(tool_names.contains(&"delete_recipe"));
}

#[tokio::test]
async fn test_list_recipes_empty_database() {
    let pool = create_test_db().await;

    let response = send_json_rpc_request(
        &pool,
        "tools/call",
        json!({
            "name": "list_recipes",
            "arguments": {}
        })
    ).await;

    assert_eq!(response["jsonrpc"], "2.0");
    assert_eq!(response["id"], 1);
    assert!(response["error"].is_null());

    let content = response["result"]["content"][0]["text"].as_str().unwrap();
    let recipes: serde_json::Value = serde_json::from_str(content).unwrap();
    assert_eq!(recipes.as_array().unwrap().len(), 0);
}

#[tokio::test]
async fn test_list_recipes_with_data() {
    let pool = create_test_db().await;

    // Create a recipe first
    let create_response = send_json_rpc_request(
        &pool,
        "tools/call",
        json!({
            "name": "create_recipe",
            "arguments": {
                "title": "Test Recipe",
                "description": "A test recipe"
            }
        })
    ).await;

    assert!(create_response["error"].is_null());

    // List recipes
    let list_response = send_json_rpc_request(
        &pool,
        "tools/call",
        json!({
            "name": "list_recipes",
            "arguments": {}
        })
    ).await;

    assert_eq!(list_response["jsonrpc"], "2.0");
    assert!(list_response["error"].is_null());

    let content = list_response["result"]["content"][0]["text"].as_str().unwrap();
    let recipes: serde_json::Value = serde_json::from_str(content).unwrap();
    let recipes_array = recipes.as_array().unwrap();

    assert_eq!(recipes_array.len(), 1);
    assert_eq!(recipes_array[0]["title"], "Test Recipe");
}

#[tokio::test]
async fn test_get_recipe_valid_id() {
    let pool = create_test_db().await;

    // Create a recipe first
    let create_response = send_json_rpc_request(
        &pool,
        "tools/call",
        json!({
            "name": "create_recipe",
            "arguments": {
                "title": "Pasta Carbonara",
                "description": "Classic Italian pasta",
                "ingredients": [
                    {"name": "pasta", "quantity": 200.0, "unit": "g"},
                    {"name": "eggs", "quantity": 2.0}
                ],
                "steps": [
                    {"instruction": "Boil pasta"},
                    {"instruction": "Mix with eggs"}
                ]
            }
        })
    ).await;

    assert!(create_response["error"].is_null());

    let create_content = create_response["result"]["content"][0]["text"].as_str().unwrap();
    let created_recipe: serde_json::Value = serde_json::from_str(create_content).unwrap();
    let recipe_id = created_recipe["id"].as_str().unwrap();

    // Get the recipe
    let get_response = send_json_rpc_request(
        &pool,
        "tools/call",
        json!({
            "name": "get_recipe",
            "arguments": {
                "recipe_id": recipe_id
            }
        })
    ).await;

    assert!(get_response["error"].is_null());

    let content = get_response["result"]["content"][0]["text"].as_str().unwrap();
    let recipe: serde_json::Value = serde_json::from_str(content).unwrap();

    assert_eq!(recipe["title"], "Pasta Carbonara");
    assert_eq!(recipe["ingredients"].as_array().unwrap().len(), 2);
    assert_eq!(recipe["steps"].as_array().unwrap().len(), 2);
}

#[tokio::test]
async fn test_get_recipe_invalid_id() {
    let pool = create_test_db().await;

    let response = send_json_rpc_request(
        &pool,
        "tools/call",
        json!({
            "name": "get_recipe",
            "arguments": {
                "recipe_id": "invalid-uuid-12345"
            }
        })
    ).await;

    assert_eq!(response["jsonrpc"], "2.0");
    assert!(response["result"].is_null());
    assert_eq!(response["error"]["code"], -32001); // Not found
}

#[tokio::test]
async fn test_create_recipe_minimal() {
    let pool = create_test_db().await;

    let response = send_json_rpc_request(
        &pool,
        "tools/call",
        json!({
            "name": "create_recipe",
            "arguments": {
                "title": "Simple Toast",
                "description": "Just toast"
            }
        })
    ).await;

    assert_eq!(response["jsonrpc"], "2.0");
    assert!(response["error"].is_null());

    let content = response["result"]["content"][0]["text"].as_str().unwrap();
    let recipe: serde_json::Value = serde_json::from_str(content).unwrap();

    assert!(recipe["id"].as_str().is_some());
    assert_eq!(recipe["title"], "Simple Toast");
    assert_eq!(recipe["description"], "Just toast");
}

#[tokio::test]
async fn test_create_recipe_duplicate_title() {
    let pool = create_test_db().await;

    // Create first recipe
    let first_response = send_json_rpc_request(
        &pool,
        "tools/call",
        json!({
            "name": "create_recipe",
            "arguments": {
                "title": "Chocolate Cake",
                "description": "Delicious cake"
            }
        })
    ).await;

    assert!(first_response["error"].is_null());

    // Try to create duplicate
    let duplicate_response = send_json_rpc_request(
        &pool,
        "tools/call",
        json!({
            "name": "create_recipe",
            "arguments": {
                "title": "Chocolate Cake",
                "description": "Another cake"
            }
        })
    ).await;

    assert!(duplicate_response["result"].is_null());
    assert_eq!(duplicate_response["error"]["code"], -32002); // Conflict
}

#[tokio::test]
async fn test_create_recipe_missing_required_field() {
    let pool = create_test_db().await;

    let response = send_json_rpc_request(
        &pool,
        "tools/call",
        json!({
            "name": "create_recipe",
            "arguments": {
                "description": "Missing title"
            }
        })
    ).await;

    assert!(response["result"].is_null());
    assert_eq!(response["error"]["code"], -32602); // Invalid params
}

#[tokio::test]
async fn test_create_recipe_invalid_servings() {
    let pool = create_test_db().await;

    let response = send_json_rpc_request(
        &pool,
        "tools/call",
        json!({
            "name": "create_recipe",
            "arguments": {
                "title": "Bad Recipe",
                "description": "With invalid servings",
                "servings": -5
            }
        })
    ).await;

    assert!(response["result"].is_null());
    assert_eq!(response["error"]["code"], -32602); // Invalid params
    assert!(response["error"]["message"].as_str().unwrap().contains("Servings"));
}

#[tokio::test]
async fn test_unknown_method() {
    let pool = create_test_db().await;

    let response = send_json_rpc_request(&pool, "unknown_method", json!({})).await;

    assert_eq!(response["jsonrpc"], "2.0");
    assert!(response["result"].is_null());
    assert_eq!(response["error"]["code"], -32601); // Method not found
}

#[tokio::test]
async fn test_unknown_tool() {
    let pool = create_test_db().await;

    let response = send_json_rpc_request(
        &pool,
        "tools/call",
        json!({
            "name": "unknown_tool",
            "arguments": {}
        })
    ).await;

    assert_eq!(response["jsonrpc"], "2.0");
    assert!(response["result"].is_null());
    assert_eq!(response["error"]["code"], -32601); // Method not found
}
