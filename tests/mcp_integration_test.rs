//! MCP Integration Tests
//!
//! These tests verify the MCP (Model Context Protocol) integration with the AI agent.
//! They require external dependencies and are ignored by default.
//!
//! Prerequisites:
//! - Built MCP binary: `cargo build --release --bin recipe-vault-mcp`
//! - Valid ANTHROPIC_API_KEY in environment
//! - Running recipe-vault API server (for MCP to connect to)
//!
//! Run with: cargo test --test mcp_integration_test -- --ignored

use std::env;

// ==== Task 2.4: Test MCP connection independently ====

#[tokio::test]
#[ignore = "Requires MCP binary and API server"]
async fn test_mcp_server_starts_successfully() {
    // Verify the MCP server binary exists and can start
    //
    // Manual test steps:
    // 1. Build MCP: cargo build --release --bin recipe-vault-mcp
    // 2. Start API server: cargo run
    // 3. Test MCP server:
    //    echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.1.0"}},"id":1}' | \
    //    API_BASE_URL=http://localhost:3000 API_KEY=your-key ./target/release/recipe-vault-mcp
    // 4. Should receive JSON response with server capabilities

    let mcp_path = env::var("MCP_BINARY_PATH")
        .unwrap_or_else(|_| "./target/release/recipe-vault-mcp".to_string());

    assert!(
        std::path::Path::new(&mcp_path).exists(),
        "MCP binary not found at {}. Build with: cargo build --release --bin recipe-vault-mcp",
        mcp_path
    );
}

#[tokio::test]
#[ignore = "Requires MCP binary and API server"]
async fn test_mcp_tools_list_returns_recipe_tools() {
    // Verify MCP server exposes the expected recipe tools
    //
    // Expected tools:
    // - list_recipes: List all recipes
    // - get_recipe: Get a specific recipe by ID
    // - create_recipe: Create a new recipe
    // - update_recipe: Update an existing recipe
    // - delete_recipe: Delete a recipe
    //
    // Manual test:
    // echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}' | \
    //   API_BASE_URL=http://localhost:3000 API_KEY=your-key ./target/release/recipe-vault-mcp

    println!("Manual verification required - see test comments for steps");
}

// ==== Task 6.1: Integration test - MCP tool execution ====

#[tokio::test]
#[ignore = "Requires MCP binary, API server, and ANTHROPIC_API_KEY"]
async fn test_agent_can_list_recipes_via_mcp() {
    // Verify the AI agent can successfully call the list_recipes tool
    //
    // This tests the full chain:
    // User message -> Claude API -> Tool call -> MCP server -> API server -> Response
    //
    // Manual test:
    // 1. Start API server with some recipes in the database
    // 2. Use the chat UI or curl to ask "What recipes do I have?"
    // 3. Verify response includes recipe list from database

    println!("Integration test - requires full stack running");
}

#[tokio::test]
#[ignore = "Requires MCP binary, API server, and ANTHROPIC_API_KEY"]
async fn test_agent_can_get_recipe_by_id_via_mcp() {
    // Verify the AI agent can call get_recipe with a specific ID
    //
    // Manual test:
    // 1. Create a recipe via API
    // 2. Ask Claude "Show me the [recipe name] recipe"
    // 3. Verify Claude returns the full recipe details

    println!("Integration test - requires full stack running");
}

#[tokio::test]
#[ignore = "Requires MCP binary, API server, and ANTHROPIC_API_KEY"]
async fn test_agent_can_create_recipe_via_mcp() {
    // Verify the AI agent can create recipes through MCP
    //
    // Manual test:
    // 1. Ask Claude "Create a recipe for chocolate chip cookies with 2 cups flour, 1 cup sugar..."
    // 2. Verify Claude calls create_recipe tool
    // 3. Verify recipe appears in database/list

    println!("Integration test - requires full stack running");
}

#[tokio::test]
#[ignore = "Requires MCP binary, API server, and ANTHROPIC_API_KEY"]
async fn test_agent_handles_mcp_tool_errors() {
    // Verify the agent handles MCP errors gracefully
    //
    // Manual test:
    // 1. Ask for a recipe that doesn't exist by ID
    // 2. Verify Claude returns a helpful error message, not a crash

    println!("Integration test - requires full stack running");
}

// ==== Task 6.3: Manual Testing Checklist ====
// This is a documentation test that reminds what to manually verify

#[test]
fn manual_testing_checklist() {
    // Before archiving the web-ui-chat change, manually verify:
    //
    // [ ] "What recipes do I have?" → Lists recipes from database
    // [ ] "Show me [recipe name]" → Shows full recipe details
    // [ ] "Create a recipe for [X]" → Creates recipe and confirms
    // [ ] Follow-up questions use conversation context
    // [ ] Works on mobile browser (responsive layout)
    // [ ] API key prompt appears on first visit
    // [ ] Invalid API key shows error message
    // [ ] Tool use indicators appear during MCP calls
    // [ ] Streaming text appears progressively
    // [ ] Error messages are user-friendly
    //
    // Run the server and test each item in a browser.

    println!("See test comments for manual testing checklist");
}

// ==== MCP Process Management Tests ====

#[tokio::test]
#[ignore = "Requires MCP binary"]
async fn test_mcp_server_recovers_from_crash() {
    // Verify that if the MCP server crashes, the agent can restart it
    //
    // Manual test:
    // 1. Start a chat session
    // 2. Kill the MCP server process externally
    // 3. Send another message
    // 4. Verify the agent recovers and responds

    println!("Integration test - requires manual process manipulation");
}

// ==== Recipe Authorship Tests ====

#[tokio::test]
#[ignore = "Requires MCP binary with DEFAULT_AUTHOR_EMAIL set"]
async fn test_mcp_recipe_creation_with_author_email() {
    // Verify MCP-created recipes have correct authorship when DEFAULT_AUTHOR_EMAIL is set
    //
    // Manual test:
    // 1. Configure MCP with DEFAULT_AUTHOR_EMAIL=test@example.com in environment
    // 2. Start API server and MCP
    // 3. Create a recipe via MCP (e.g., "Create a recipe for pancakes")
    // 4. Check database or API response
    // 5. Verify created_by and updated_by are both "test@example.com"
    //
    // SQL verification:
    // SELECT title, created_by, updated_by FROM recipes WHERE title = 'Pancakes';

    println!("Manual test - verify MCP sends X-User-Email header and recipe has authorship");
}

#[tokio::test]
#[ignore = "Requires MCP binary without DEFAULT_AUTHOR_EMAIL"]
async fn test_mcp_recipe_creation_without_author_email() {
    // Verify MCP-created recipes have null authorship when DEFAULT_AUTHOR_EMAIL is not set
    //
    // Manual test:
    // 1. Configure MCP WITHOUT DEFAULT_AUTHOR_EMAIL in environment
    // 2. Start API server and MCP
    // 3. Create a recipe via MCP
    // 4. Check database or API response
    // 5. Verify created_by and updated_by are both NULL
    //
    // SQL verification:
    // SELECT title, created_by, updated_by FROM recipes WHERE created_by IS NULL;

    println!("Manual test - verify MCP without DEFAULT_AUTHOR_EMAIL creates null authorship");
}

// ==== Tag support in the MCP tools ====
//
// These run in-process: the REST API is served on a loopback port and the tool
// handlers talk to it through the real blocking `ApiClient`, so they exercise
// the whole MCP -> HTTP -> handler -> database path with the mock LLM.

mod common;

use recipe_vault::mcp::http_client::ApiClient;
use recipe_vault::mcp::tools;
use serde_json::json;
use serde_json::Value;

/// Serve the test API on a random loopback port and return its base URL
async fn spawn_test_api() -> String {
    spawn_test_api_with_pool().await.0
}

/// As `spawn_test_api`, but also hands back the pool so a test can seed rows
/// directly, bypassing the create handler's background auto-tagging
async fn spawn_test_api_with_pool() -> (String, sqlx::SqlitePool) {
    let pool = common::create_test_db().await;
    let app = common::create_test_app(pool.clone());

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app).await.ok();
    });

    (format!("http://{}", addr), pool)
}

/// Run a tool handler on a blocking thread (the MCP client is blocking reqwest)
async fn call_tool<F>(base_url: &str, handler: F) -> Result<Value, recipe_vault::mcp::protocol::JsonRpcError>
where
    F: FnOnce(&ApiClient) -> Result<Value, recipe_vault::mcp::protocol::JsonRpcError> + Send + 'static,
{
    let base_url = base_url.to_string();
    tokio::task::spawn_blocking(move || {
        let client = ApiClient::new(
            base_url,
            Some("test-api-key".to_string()),
            Some("test@example.com".to_string()),
        )
        .unwrap();
        handler(&client)
    })
    .await
    .unwrap()
}

fn tag_list(value: &Value) -> Vec<String> {
    value["tags"]
        .as_array()
        .expect("tags array")
        .iter()
        .map(|t| t.as_str().unwrap().to_string())
        .collect()
}

#[tokio::test(flavor = "multi_thread")]
async fn test_mcp_create_recipe_with_tags() {
    let base_url = spawn_test_api().await;

    let created = call_tool(&base_url, |client| {
        tools::handle_create_recipe(
            client,
            json!({
                "title": "Tarte Tatin",
                "description": "Upside-down apple tart",
                "tags": ["Dessert", " french "]
            }),
        )
    })
    .await
    .expect("create should succeed");

    // Stored normalised, returned sorted
    assert_eq!(tag_list(&created), vec!["dessert", "french"]);
}

#[tokio::test(flavor = "multi_thread")]
async fn test_mcp_create_recipe_with_invalid_tags_is_rejected() {
    let base_url = spawn_test_api().await;

    let error = call_tool(&base_url, |client| {
        tools::handle_create_recipe(
            client,
            json!({
                "title": "Bad Tags",
                "description": "Should not be created",
                "tags": ["main!"]
            }),
        )
    })
    .await
    .expect_err("invalid tags should fail");

    assert_eq!(error.code, -32602, "tag validation should be invalid params");
    assert!(error.message.contains("main!"), "error should name the tag: {}", error.message);

    // Nothing was created
    let listed = call_tool(&base_url, |client| tools::handle_list_recipes(client, json!({})))
        .await
        .unwrap();
    assert_eq!(listed["recipes"].as_array().unwrap().len(), 0);
}

#[tokio::test(flavor = "multi_thread")]
async fn test_mcp_update_recipe_replaces_tags() {
    let base_url = spawn_test_api().await;

    let created = call_tool(&base_url, |client| {
        tools::handle_create_recipe(
            client,
            json!({
                "title": "Apple Pie",
                "description": "A classic",
                "tags": ["main", "english"]
            }),
        )
    })
    .await
    .unwrap();
    let recipe_id = created["id"].as_str().unwrap().to_string();

    // Replace semantics: the whole set is swapped, not merged
    let id = recipe_id.clone();
    let updated = call_tool(&base_url, move |client| {
        tools::handle_update_recipe(client, json!({"recipe_id": id, "tags": ["dessert", "french"]}))
    })
    .await
    .expect("update should succeed");
    assert_eq!(tag_list(&updated), vec!["dessert", "french"]);

    // Omitting tags leaves them alone
    let id = recipe_id.clone();
    let untouched = call_tool(&base_url, move |client| {
        tools::handle_update_recipe(client, json!({"recipe_id": id, "servings": 8}))
    })
    .await
    .unwrap();
    assert_eq!(tag_list(&untouched), vec!["dessert", "french"]);
    assert_eq!(untouched["servings"], json!(8));

    // An invalid tag changes nothing
    let id = recipe_id.clone();
    let error = call_tool(&base_url, move |client| {
        tools::handle_update_recipe(client, json!({"recipe_id": id, "tags": ["DESSERT?"]}))
    })
    .await
    .expect_err("invalid tags should fail");
    assert_eq!(error.code, -32602);

    let id = recipe_id.clone();
    let after = call_tool(&base_url, move |client| {
        tools::handle_get_recipe(client, json!({"recipe_id": id}))
    })
    .await
    .unwrap();
    assert_eq!(tag_list(&after), vec!["dessert", "french"]);
}

#[tokio::test(flavor = "multi_thread")]
async fn test_mcp_list_recipes_includes_tags() {
    let (base_url, pool) = spawn_test_api_with_pool().await;

    call_tool(&base_url, |client| {
        tools::handle_create_recipe(
            client,
            json!({"title": "Tagged", "description": "Has tags", "tags": ["dessert"]}),
        )
    })
    .await
    .unwrap();

    // Seeded straight through the queries layer, so the create handler's
    // background auto-tagger never runs and this recipe stays untagged
    recipe_vault::db::queries::create_recipe(
        &pool,
        recipe_vault::models::recipe::CreateRecipeInput {
            title: "Untagged".to_string(),
            description: Some("No tags".to_string()),
            prep_time_minutes: None,
            cook_time_minutes: None,
            servings: None,
            difficulty: None,
            ingredients: vec![],
            steps: vec![],
            tags: vec![],
        },
        Some("test@example.com".to_string()),
    )
    .await
    .unwrap();

    let listed = call_tool(&base_url, |client| tools::handle_list_recipes(client, json!({})))
        .await
        .unwrap();

    let recipes = listed["recipes"].as_array().unwrap();
    assert_eq!(recipes.len(), 2);
    for recipe in recipes {
        assert!(recipe.get("tags").is_some(), "every listed recipe carries tags");
        assert!(recipe["tags"].is_array(), "tags should always be an array");
    }
    let tagged = recipes.iter().find(|r| r["title"] == "Tagged").unwrap();
    assert_eq!(tag_list(tagged), vec!["dessert"]);

    // A recipe with no tags lists an empty array, never a missing field
    let untagged = recipes.iter().find(|r| r["title"] == "Untagged").unwrap();
    assert_eq!(tag_list(untagged), Vec::<String>::new());
}

#[tokio::test(flavor = "multi_thread")]
async fn test_mcp_create_without_tags_gets_them_assigned() {
    let base_url = spawn_test_api().await;

    let created = call_tool(&base_url, |client| {
        tools::handle_create_recipe(
            client,
            json!({"title": "Chicken Curry", "description": "Weeknight curry"}),
        )
    })
    .await
    .unwrap();
    let recipe_id = created["id"].as_str().unwrap().to_string();
    assert_eq!(tag_list(&created), Vec::<String>::new(), "tags start empty");

    // The background assessment uses the mock LLM, which returns ["main","curry"]
    let mut tags = Vec::new();
    for _ in 0..40 {
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        let id = recipe_id.clone();
        let recipe = call_tool(&base_url, move |client| {
            tools::handle_get_recipe(client, json!({"recipe_id": id}))
        })
        .await
        .unwrap();
        tags = tag_list(&recipe);
        if !tags.is_empty() {
            break;
        }
    }

    assert_eq!(tags, vec!["curry", "main"], "auto-assigned tags should be stored");
}
