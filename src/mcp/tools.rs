use crate::mcp::http_client::ApiClient;
use crate::mcp::protocol::{JsonRpcError, ToolDefinition};
use crate::models::recipe::{CreateIngredientInput, CreateRecipeInput, CreateStepInput, UpdateRecipeInput};
use serde_json::{json, Value as JsonValue};

/// Get all available MCP tool definitions
pub fn get_all_tools() -> Vec<ToolDefinition> {
    vec![
        list_recipes_tool(),
        get_recipe_tool(),
        create_recipe_tool(),
        update_recipe_tool(),
        delete_recipe_tool(),
    ]
}

/// Tool definition for listing recipes
pub fn list_recipes_tool() -> ToolDefinition {
    ToolDefinition::new(
        "list_recipes",
        "List all saved recipes with their UUIDs. Returns recipe_id values that MUST be used with display_recipe or get_recipe. Never fabricate IDs—only use the exact UUIDs returned by this tool.",
        json!({
            "type": "object",
            "properties": {}
        })
    )
}

/// Tool definition for getting a recipe by ID
pub fn get_recipe_tool() -> ToolDefinition {
    ToolDefinition::new(
        "get_recipe",
        "Get complete details for a specific recipe by ID, including all ingredients and cooking steps.",
        json!({
            "type": "object",
            "properties": {
                "recipe_id": {
                    "type": "string",
                    "description": "The UUID of the recipe to retrieve"
                }
            },
            "required": ["recipe_id"]
        })
    )
}

/// Tool definition for creating a recipe
pub fn create_recipe_tool() -> ToolDefinition {
    ToolDefinition::new(
        "create_recipe",
        "Create and save a new recipe to the database. Use this when the user asks to 'save', 'store', 'create', or 'remember' a recipe. After successful creation, the assistant MUST call display_recipe with the new recipe_id to show it in the side panel.",
        json!({
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Recipe title (must be unique)"
                },
                "description": {
                    "type": "string",
                    "description": "Brief description of the recipe"
                },
                "servings": {
                    "type": "integer",
                    "description": "Number of servings (optional)"
                },
                "prep_time_minutes": {
                    "type": "integer",
                    "description": "Preparation time in minutes (optional)"
                },
                "cook_time_minutes": {
                    "type": "integer",
                    "description": "Cooking time in minutes (optional)"
                },
                "ingredients": {
                    "type": "array",
                    "description": "List of ingredients",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "quantity": {"type": "number"},
                            "unit": {"type": "string"},
                            "notes": {"type": "string"}
                        },
                        "required": ["name"]
                    }
                },
                "steps": {
                    "type": "array",
                    "description": "Cooking instructions in order",
                    "items": {
                        "type": "object",
                        "properties": {
                            "instruction": {"type": "string"},
                            "duration_minutes": {"type": "integer"},
                            "temperature_celsius": {"type": "integer"}
                        },
                        "required": ["instruction"]
                    }
                }
            },
            "required": ["title", "description"]
        })
    )
}

/// Tool definition for updating a recipe
pub fn update_recipe_tool() -> ToolDefinition {
    ToolDefinition::new(
        "update_recipe",
        "Update an existing recipe. Supports partial updates (e.g., just title) or full replacements of ingredients/steps.",
        json!({
            "type": "object",
            "properties": {
                "recipe_id": {
                    "type": "string",
                    "description": "The UUID of the recipe to update"
                },
                "title": {
                    "type": "string",
                    "description": "New recipe title (optional)"
                },
                "description": {
                    "type": "string",
                    "description": "New description (optional)"
                },
                "servings": {
                    "type": "integer",
                    "description": "New number of servings (optional)"
                },
                "prep_time_minutes": {
                    "type": "integer",
                    "description": "New prep time (optional)"
                },
                "cook_time_minutes": {
                    "type": "integer",
                    "description": "New cook time (optional)"
                },
                "ingredients": {
                    "type": "array",
                    "description": "New list of ingredients (replaces all existing)",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "quantity": {"type": "number"},
                            "unit": {"type": "string"},
                            "notes": {"type": "string"}
                        },
                        "required": ["name"]
                    }
                },
                "steps": {
                    "type": "array",
                    "description": "New cooking instructions (replaces all existing)",
                    "items": {
                        "type": "object",
                        "properties": {
                            "instruction": {"type": "string"},
                            "duration_minutes": {"type": "integer"},
                            "temperature_celsius": {"type": "integer"}
                        },
                        "required": ["instruction"]
                    }
                }
            },
            "required": ["recipe_id"]
        })
    )
}

/// Tool definition for deleting a recipe
pub fn delete_recipe_tool() -> ToolDefinition {
    ToolDefinition::new(
        "delete_recipe",
        "Delete a recipe by ID. Permanently removes the recipe and all associated data.",
        json!({
            "type": "object",
            "properties": {
                "recipe_id": {
                    "type": "string",
                    "description": "The UUID of the recipe to delete"
                }
            },
            "required": ["recipe_id"]
        })
    )
}

/// Handle list_recipes tool call
pub fn handle_list_recipes(client: &ApiClient, _params: JsonValue) -> Result<JsonValue, JsonRpcError> {
    let recipes = client.list_recipes()?;
    
    // Format recipes with prominent ID labels to prevent hallucination
    let formatted: Vec<JsonValue> = recipes.iter().map(|r| {
        json!({
            "recipe_id": r.id,  // Prominently labeled for tool use
            "title": r.title,
            "description": r.description,
            "prep_time_minutes": r.prep_time_minutes,
            "cook_time_minutes": r.cook_time_minutes,
            "servings": r.servings
        })
    }).collect();
    
    Ok(json!({
        "recipes": formatted,
        "note": "Use the exact recipe_id values above when calling display_recipe or get_recipe. Do not fabricate IDs."
    }))
}

/// Handle get_recipe tool call
pub fn handle_get_recipe(client: &ApiClient, params: JsonValue) -> Result<JsonValue, JsonRpcError> {
    let recipe_id = params
        .get("recipe_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| JsonRpcError::invalid_params("Missing or invalid recipe_id parameter"))?;

    let recipe = client.get_recipe(recipe_id)?;
    Ok(serde_json::to_value(recipe)
        .map_err(|e| JsonRpcError::internal_error(format!("Serialization error: {}", e)))?)
}

/// Handle update_recipe tool call
pub fn handle_update_recipe(client: &ApiClient, params: JsonValue) -> Result<JsonValue, JsonRpcError> {
    let recipe_id = params
        .get("recipe_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| JsonRpcError::invalid_params("Missing or invalid recipe_id parameter"))?;

    // Parse ingredients if provided
    let ingredients = if let Some(ingredients_array) = params.get("ingredients").and_then(|v| v.as_array()) {
        Some(parse_ingredients(ingredients_array)?)
    } else {
        None
    };

    // Parse steps if provided
    let steps = if let Some(steps_array) = params.get("steps").and_then(|v| v.as_array()) {
        Some(parse_steps(steps_array)?)
    } else {
        None
    };

    let update_input = UpdateRecipeInput {
        title: params.get("title").and_then(|v| v.as_str()).map(|s| s.to_string()),
        description: params.get("description").and_then(|v| v.as_str()).map(|s| s.to_string()),
        servings: params.get("servings").and_then(|v| v.as_i64()).map(|v| v as i32),
        prep_time_minutes: params.get("prep_time_minutes").and_then(|v| v.as_i64()).map(|v| v as i32),
        cook_time_minutes: params.get("cook_time_minutes").and_then(|v| v.as_i64()).map(|v| v as i32),
        ingredients,
        steps,
    };

    let recipe = client.update_recipe(recipe_id, update_input)?;
    Ok(serde_json::to_value(recipe)
        .map_err(|e| JsonRpcError::internal_error(format!("Serialization error: {}", e)))?)
}

/// Handle delete_recipe tool call
pub fn handle_delete_recipe(client: &ApiClient, params: JsonValue) -> Result<JsonValue, JsonRpcError> {
    let recipe_id = params
        .get("recipe_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| JsonRpcError::invalid_params("Missing or invalid recipe_id parameter"))?;

    client.delete_recipe(recipe_id)?;
    Ok(json!({ "status": "success", "message": format!("Recipe {} deleted", recipe_id) }))
}

/// Handle create_recipe tool call
pub fn handle_create_recipe(client: &ApiClient, params: JsonValue) -> Result<JsonValue, JsonRpcError> {
    let title = params
        .get("title")
        .and_then(|v| v.as_str())
        .ok_or_else(|| JsonRpcError::invalid_params("Missing or invalid title parameter"))?
        .to_string();

    let description = params
        .get("description")
        .and_then(|v| v.as_str())
        .ok_or_else(|| JsonRpcError::invalid_params("Missing or invalid description parameter"))?
        .to_string();

    let servings = params.get("servings").and_then(|v| v.as_i64()).map(|v| v as i32);
    let prep_time_minutes = params.get("prep_time_minutes").and_then(|v| v.as_i64()).map(|v| v as i32);
    let cook_time_minutes = params.get("cook_time_minutes").and_then(|v| v.as_i64()).map(|v| v as i32);

    // Validate servings if provided
    if let Some(s) = servings {
        if s <= 0 {
            return Err(JsonRpcError::invalid_params("Servings must be greater than 0"));
        }
    }

    // Parse ingredients
    let ingredients = if let Some(ingredients_array) = params.get("ingredients").and_then(|v| v.as_array()) {
        parse_ingredients(ingredients_array)?
    } else {
        vec![]
    };

    // Parse steps
    let steps = if let Some(steps_array) = params.get("steps").and_then(|v| v.as_array()) {
        parse_steps(steps_array)?
    } else {
        vec![]
    };

    let create_recipe = CreateRecipeInput {
        title,
        description: Some(description),
        servings,
        prep_time_minutes,
        cook_time_minutes,
        ingredients,
        steps,
    };

    let recipe = client.create_recipe(create_recipe)?;
    Ok(serde_json::to_value(recipe)
        .map_err(|e| JsonRpcError::internal_error(format!("Serialization error: {}", e)))?)
}

/// Parse ingredients from JSON array
fn parse_ingredients(ingredients_array: &[JsonValue]) -> Result<Vec<CreateIngredientInput>, JsonRpcError> {
    ingredients_array
        .iter()
        .enumerate()
        .map(|(idx, ing)| {
            let name = ing
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or_else(|| JsonRpcError::invalid_params(format!("Ingredient {} missing name", idx)))?
                .to_string();

            let quantity = ing.get("quantity").and_then(|v| v.as_f64());
            let unit = ing.get("unit").and_then(|v| v.as_str()).map(|s| s.to_string());
            let notes = ing.get("notes").and_then(|v| v.as_str()).map(|s| s.to_string());

            Ok(CreateIngredientInput {
                name,
                quantity,
                unit,
                notes,
            })
        })
        .collect()
}

/// Parse steps from JSON array
fn parse_steps(steps_array: &[JsonValue]) -> Result<Vec<CreateStepInput>, JsonRpcError> {
    steps_array
        .iter()
        .enumerate()
        .map(|(idx, step)| {
            let instruction = step
                .get("instruction")
                .and_then(|v| v.as_str())
                .ok_or_else(|| JsonRpcError::invalid_params(format!("Step {} missing instruction", idx)))?
                .to_string();

            let duration_minutes = step.get("duration_minutes").and_then(|v| v.as_i64()).map(|v| v as i32);
            let temperature_value = step.get("temperature_celsius").and_then(|v| v.as_i64()).map(|v| v as i32);
            let temperature_unit = if temperature_value.is_some() {
                Some("Celsius".to_string())
            } else {
                None
            };

            Ok(CreateStepInput {
                instruction,
                duration_minutes,
                temperature_value,
                temperature_unit,
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_list_recipes_tool_schema() {
        let tool = list_recipes_tool();
        assert_eq!(tool.name, "list_recipes");
        assert!(tool.input_schema.get("properties").is_some());
    }

    #[test]
    fn test_get_recipe_tool_schema() {
        let tool = get_recipe_tool();
        assert_eq!(tool.name, "get_recipe");
        let required = tool.input_schema
            .get("required")
            .and_then(|v| v.as_array())
            .unwrap();
        assert!(required.iter().any(|v| v.as_str() == Some("recipe_id")));
    }

    #[test]
    fn test_create_recipe_tool_schema() {
        let tool = create_recipe_tool();
        assert_eq!(tool.name, "create_recipe");
        let required = tool.input_schema
            .get("required")
            .and_then(|v| v.as_array())
            .unwrap();
        assert!(required.iter().any(|v| v.as_str() == Some("title")));
        assert!(required.iter().any(|v| v.as_str() == Some("description")));
    }

    #[test]
    fn test_update_recipe_tool_schema() {
        let tool = update_recipe_tool();
        assert_eq!(tool.name, "update_recipe");
        let required = tool.input_schema
            .get("required")
            .and_then(|v| v.as_array())
            .unwrap();
        assert!(required.iter().any(|v| v.as_str() == Some("recipe_id")));
        assert!(tool.input_schema.get("properties").unwrap().get("title").is_some());
    }

    #[test]
    fn test_delete_recipe_tool_schema() {
        let tool = delete_recipe_tool();
        assert_eq!(tool.name, "delete_recipe");
        let required = tool.input_schema
            .get("required")
            .and_then(|v| v.as_array())
            .unwrap();
        assert!(required.iter().any(|v| v.as_str() == Some("recipe_id")));
    }

    #[test]
    fn test_get_all_tools() {
        let tools = get_all_tools();
        assert_eq!(tools.len(), 5);
        assert_eq!(tools[0].name, "list_recipes");
        assert_eq!(tools[1].name, "get_recipe");
        assert_eq!(tools[2].name, "create_recipe");
        assert_eq!(tools[3].name, "update_recipe");
        assert_eq!(tools[4].name, "delete_recipe");
    }

    #[test]
    fn test_parse_ingredients() {
        let ingredients = vec![
            json!({"name": "flour", "quantity": 2.0, "unit": "cups"}),
            json!({"name": "salt"}),
        ];
        let parsed = parse_ingredients(&ingredients).unwrap();
        assert_eq!(parsed.len(), 2);
        assert_eq!(parsed[0].name, "flour");
        assert_eq!(parsed[0].quantity, Some(2.0));
        assert_eq!(parsed[1].name, "salt");
        assert_eq!(parsed[1].quantity, None);
    }

    #[test]
    fn test_parse_steps() {
        let steps = vec![
            json!({"instruction": "Mix ingredients", "duration_minutes": 5}),
            json!({"instruction": "Bake", "duration_minutes": 30, "temperature_celsius": 180}),
        ];
        let parsed = parse_steps(&steps).unwrap();
        assert_eq!(parsed.len(), 2);
        assert_eq!(parsed[0].instruction, "Mix ingredients");
        assert_eq!(parsed[0].duration_minutes, Some(5));
        assert_eq!(parsed[1].temperature_value, Some(180));
        assert_eq!(parsed[1].temperature_unit, Some("Celsius".to_string()));
    }
}
