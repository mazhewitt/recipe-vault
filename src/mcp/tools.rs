use crate::db::queries;
use crate::error::ApiError;
use crate::models::recipe::{CreateRecipeInput, CreateIngredientInput, CreateStepInput};
use crate::mcp::protocol::{JsonRpcError, ToolDefinition};
use serde_json::{json, Value as JsonValue};
use sqlx::SqlitePool;

/// Get all available MCP tool definitions
pub fn get_all_tools() -> Vec<ToolDefinition> {
    vec![
        list_recipes_tool(),
        get_recipe_tool(),
        create_recipe_tool(),
        delete_recipe_tool(),
    ]
}

/// Tool definition for listing recipes
pub fn list_recipes_tool() -> ToolDefinition {
    ToolDefinition::new(
        "list_recipes",
        "List all recipes in the database. Returns recipe ID, title, and description for each recipe.",
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
        "Create a new recipe with ingredients and cooking steps. Returns the created recipe with generated ID.",
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
pub async fn handle_list_recipes(pool: &SqlitePool, _params: JsonValue) -> Result<JsonValue, JsonRpcError> {
    let recipes = queries::list_recipes(pool)
        .await
        .map_err(|e| JsonRpcError::internal_error(format!("Database error: {}", e)))?;

    Ok(json!(recipes))
}

/// Handle get_recipe tool call
pub async fn handle_get_recipe(pool: &SqlitePool, params: JsonValue) -> Result<JsonValue, JsonRpcError> {
    let recipe_id = params
        .get("recipe_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| JsonRpcError::invalid_params("Missing or invalid recipe_id parameter"))?;

    let recipe = queries::get_recipe(pool, recipe_id)
        .await
        .map_err(|e| match e {
            ApiError::NotFound(msg) => JsonRpcError::not_found(msg),
            ApiError::Validation(msg) => JsonRpcError::invalid_params(msg),
            _ => JsonRpcError::internal_error(format!("Database error: {}", e)),
        })?;

    Ok(serde_json::to_value(recipe).map_err(|e| JsonRpcError::internal_error(format!("Serialization error: {}", e)))?)
}

/// Handle delete_recipe tool call
pub async fn handle_delete_recipe(pool: &SqlitePool, params: JsonValue) -> Result<JsonValue, JsonRpcError> {
    let recipe_id = params
        .get("recipe_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| JsonRpcError::invalid_params("Missing or invalid recipe_id parameter"))?;

    queries::delete_recipe(pool, recipe_id)
        .await
        .map_err(|e| match e {
            ApiError::NotFound(msg) => JsonRpcError::not_found(msg),
            _ => JsonRpcError::internal_error(format!("Database error: {}", e)),
        })?;

    Ok(json!({ "status": "success", "message": format!("Recipe {} deleted", recipe_id) }))
}

/// Handle create_recipe tool call
pub async fn handle_create_recipe(pool: &SqlitePool, params: JsonValue) -> Result<JsonValue, JsonRpcError> {
    // Parse the CreateRecipe from params
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

    let servings = params
        .get("servings")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);

    let prep_time_minutes = params
        .get("prep_time_minutes")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);

    let cook_time_minutes = params
        .get("cook_time_minutes")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);

    // Parse ingredients
    let ingredients = if let Some(ingredients_array) = params.get("ingredients").and_then(|v| v.as_array()) {
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
            .collect::<Result<Vec<_>, JsonRpcError>>()?
    } else {
        vec![]
    };

    // Parse steps
    let steps = if let Some(steps_array) = params.get("steps").and_then(|v| v.as_array()) {
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
            .collect::<Result<Vec<_>, JsonRpcError>>()?
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

    // Validate servings if provided
    if let Some(s) = create_recipe.servings {
        if s <= 0 {
            return Err(JsonRpcError::invalid_params("Servings must be greater than 0"));
        }
    }

    // Create the recipe
    let recipe = queries::create_recipe(pool, create_recipe)
        .await
        .map_err(|e| match e {
            ApiError::Conflict(msg) => JsonRpcError::conflict(msg),
            ApiError::Validation(msg) => JsonRpcError::invalid_params(msg),
            _ => JsonRpcError::internal_error(format!("Database error: {}", e)),
        })?;

    Ok(serde_json::to_value(recipe).map_err(|e| JsonRpcError::internal_error(format!("Serialization error: {}", e)))?)
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
        assert_eq!(tools.len(), 4);
        assert_eq!(tools[0].name, "list_recipes");
        assert_eq!(tools[1].name, "get_recipe");
        assert_eq!(tools[2].name, "create_recipe");
        assert_eq!(tools[3].name, "delete_recipe");
    }
}
