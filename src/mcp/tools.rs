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
        start_timer_tool(),
        set_servings_tool(),
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
        "Get complete details for a specific recipe by ID, including all ingredients and cooking steps. If current_recipe context is provided in the chat request, prefer using its recipe_id for follow-up questions.",
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
                "difficulty": {
                    "type": "integer",
                    "description": "Recipe difficulty rating from 1 (Easy) to 5 (Hard) (optional, will be auto-assigned by AI if not specified)",
                    "minimum": 1,
                    "maximum": 5
                },
                "tags": {
                    "type": "array",
                    "description": "Lowercase tags. Use 'main' for main courses and 'dessert' for sweets; optionally add a cuisine (e.g. 'italian') or diet tag (e.g. 'vegetarian'). Omit on create to have tags assigned automatically.",
                    "items": {"type": "string"}
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
        "Update an existing recipe. Supports partial updates (e.g., just title) or full replacements of ingredients/steps/tags. Omitting tags leaves them unchanged.",
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
                "difficulty": {
                    "type": "integer",
                    "description": "Recipe difficulty rating from 1 (Easy) to 5 (Hard) (optional)",
                    "minimum": 1,
                    "maximum": 5
                },
                "tags": {
                    "type": "array",
                    "description": "Lowercase tags. Use 'main' for main courses and 'dessert' for sweets; optionally add a cuisine (e.g. 'italian') or diet tag (e.g. 'vegetarian'). Omit on create to have tags assigned automatically.",
                    "items": {"type": "string"}
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

/// Tool definition for starting a cooking timer
pub fn start_timer_tool() -> ToolDefinition {
    ToolDefinition::new(
        "start_timer",
        "Start a cooking timer for the user. Use this when guiding through a recipe and the user needs to wait for something (marinating, simmering, resting, baking, etc.).",
        json!({
            "type": "object",
            "properties": {
                "duration_minutes": {
                    "type": "number",
                    "description": "How long the timer should run (in minutes). Can be decimal (e.g., 1.5 for 90 seconds)."
                },
                "label": {
                    "type": "string",
                    "description": "Short description of what the timer is for (e.g., 'Marinate chicken', 'Simmer sauce')"
                },
                "step_number": {
                    "type": "integer",
                    "minimum": 1,
                    "description": "The 1-based method step this wait belongs to, when there is one"
                }
            },
            "required": ["duration_minutes", "label"]
        })
    )
}

/// Tool definition for setting the servings the open recipe's page shows
pub fn set_servings_tool() -> ToolDefinition {
    ToolDefinition::new(
        "set_servings",
        "Set how many servings the open recipe's page shows, for cooking tonight. The page rescales its ingredient quantities; this never changes the saved recipe and makes no database write. Use this for \"make it for 6\", \"halve it\", \"just two of us\". Use update_recipe only to save a change to the recipe itself.",
        json!({
            "type": "object",
            "properties": {
                "servings": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 24,
                    "description": "The number of servings the page should show (1-24)"
                }
            },
            "required": ["servings"]
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
            "servings": r.servings,
            "tags": r.tags
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
    serde_json::to_value(recipe)
        .map_err(|e| JsonRpcError::internal_error(format!("Serialization error: {}", e)))
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

    // Validate difficulty if provided
    if let Some(d) = params.get("difficulty").and_then(|v| v.as_i64())
        && !(1..=5).contains(&d) {
            return Err(JsonRpcError::invalid_params("Difficulty must be between 1 and 5"));
        }

    // Parse tags if provided; omitting them leaves the recipe's tags unchanged
    let tags = parse_tags(&params)?;

    let update_input = UpdateRecipeInput {
        title: params.get("title").and_then(|v| v.as_str()).map(|s| s.to_string()),
        description: params.get("description").and_then(|v| v.as_str()).map(|s| s.to_string()),
        servings: params.get("servings").and_then(|v| v.as_i64()).map(|v| v as i32),
        prep_time_minutes: params.get("prep_time_minutes").and_then(|v| v.as_i64()).map(|v| v as i32),
        cook_time_minutes: params.get("cook_time_minutes").and_then(|v| v.as_i64()).map(|v| v as i32),
        difficulty: params.get("difficulty").and_then(|v| v.as_i64()).map(|v| v as i32),
        ingredients,
        steps,
        tags,
    };

    let recipe = client.update_recipe(recipe_id, update_input)?;
    serde_json::to_value(recipe)
        .map_err(|e| JsonRpcError::internal_error(format!("Serialization error: {}", e)))
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

/// Handle set_servings tool call: validates only, the page does the scaling
pub fn handle_set_servings(_client: &ApiClient, params: JsonValue) -> Result<JsonValue, JsonRpcError> {
    let v = params
        .get("servings")
        .ok_or_else(|| JsonRpcError::invalid_params("Missing servings parameter"))?;
    // Accept integer-valued floats (e.g. 6.0) since some models emit them
    let servings = v
        .as_u64()
        .or_else(|| v.as_f64().filter(|f| f.fract() == 0.0 && *f >= 0.0).map(|f| f as u64))
        .ok_or_else(|| JsonRpcError::invalid_params("servings must be a whole number"))?;
    if !(1..=24).contains(&servings) {
        return Err(JsonRpcError::invalid_params("servings must be between 1 and 24"));
    }

    Ok(json!({
        "servings": servings,
        "message": format!("The page now shows {} servings; the saved recipe is unchanged", servings)
    }))
}

/// Handle start_timer tool call
pub fn handle_start_timer(_client: &ApiClient, params: JsonValue) -> Result<JsonValue, JsonRpcError> {
    let duration_minutes = params
        .get("duration_minutes")
        .and_then(|v| v.as_f64())
        .ok_or_else(|| JsonRpcError::invalid_params("Missing or invalid duration_minutes parameter"))?;

    let label = params
        .get("label")
        .and_then(|v| v.as_str())
        .ok_or_else(|| JsonRpcError::invalid_params("Missing or invalid label parameter"))?
        .to_string();

    // Validate duration is positive
    if duration_minutes <= 0.0 {
        return Err(JsonRpcError::invalid_params("duration_minutes must be greater than 0"));
    }

    // Optional 1-based method step the timer belongs to
    let step_number = match params.get("step_number") {
        None | Some(JsonValue::Null) => None,
        Some(v) => {
            // Accept integer-valued floats (e.g. 2.0) since some models emit them
            let n = v
                .as_u64()
                .or_else(|| v.as_f64().filter(|f| f.fract() == 0.0 && *f >= 0.0).map(|f| f as u64))
                .ok_or_else(|| JsonRpcError::invalid_params("step_number must be a positive integer"))?;
            if n == 0 {
                return Err(JsonRpcError::invalid_params("step_number must be at least 1"));
            }
            Some(n)
        }
    };

    // Generate a timer ID
    let timer_id = uuid::Uuid::new_v4().to_string();

    let mut message = format!("Timer started: {} for {} minutes", label, duration_minutes);
    if let Some(n) = step_number {
        message.push_str(&format!(" (step {})", n));
    }

    let mut result = json!({
        "timer_id": timer_id,
        "duration_minutes": duration_minutes,
        "label": label,
        "message": message
    });
    if let Some(n) = step_number {
        result["step_number"] = json!(n);
    }

    Ok(result)
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
    let difficulty = params.get("difficulty").and_then(|v| v.as_i64()).map(|v| v as i32);

    // Validate servings if provided
    if let Some(s) = servings
        && s <= 0 {
            return Err(JsonRpcError::invalid_params("Servings must be greater than 0"));
        }

    // Validate difficulty if provided
    if let Some(d) = difficulty
        && !(1..=5).contains(&d) {
            return Err(JsonRpcError::invalid_params("Difficulty must be between 1 and 5"));
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

    // Parse tags; an empty set means the AI assigns them in the background
    let tags = parse_tags(&params)?.unwrap_or_default();

    let create_recipe = CreateRecipeInput {
        title,
        description: Some(description),
        servings,
        prep_time_minutes,
        cook_time_minutes,
        difficulty,
        ingredients,
        steps,
        tags,
    };

    let recipe = client.create_recipe(create_recipe)?;
    serde_json::to_value(recipe)
        .map_err(|e| JsonRpcError::internal_error(format!("Serialization error: {}", e)))
}

/// Parse the optional `tags` parameter into a list of names.
/// Returns `None` when the parameter is absent or null. Name validation
/// (lowercase, allowed characters, limits) is done by the API.
fn parse_tags(params: &JsonValue) -> Result<Option<Vec<String>>, JsonRpcError> {
    let value = match params.get("tags") {
        None | Some(JsonValue::Null) => return Ok(None),
        Some(v) => v,
    };

    let array = value
        .as_array()
        .ok_or_else(|| JsonRpcError::invalid_params("tags must be an array of strings"))?;

    array
        .iter()
        .map(|tag| {
            tag.as_str()
                .map(|s| s.to_string())
                .ok_or_else(|| JsonRpcError::invalid_params("tags must be an array of strings"))
        })
        .collect::<Result<Vec<_>, _>>()
        .map(Some)
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
        assert_eq!(tools.len(), 7);
        assert_eq!(tools[0].name, "list_recipes");
        assert_eq!(tools[1].name, "get_recipe");
        assert_eq!(tools[2].name, "create_recipe");
        assert_eq!(tools[3].name, "update_recipe");
        assert_eq!(tools[4].name, "delete_recipe");
        assert_eq!(tools[5].name, "start_timer");
        assert_eq!(tools[6].name, "set_servings");
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

    /// Test 6.6: Verify update_recipe tool exposes difficulty parameter
    #[test]
    fn test_update_recipe_tool_has_difficulty_field() {
        let tool = update_recipe_tool();
        let properties = tool.input_schema
            .get("properties")
            .expect("Should have properties");

        let difficulty = properties
            .get("difficulty")
            .expect("Should have difficulty field");

        assert_eq!(
            difficulty.get("type").and_then(|v| v.as_str()),
            Some("integer"),
            "Difficulty should be integer type"
        );
        assert_eq!(
            difficulty.get("minimum").and_then(|v| v.as_i64()),
            Some(1),
            "Difficulty minimum should be 1"
        );
        assert_eq!(
            difficulty.get("maximum").and_then(|v| v.as_i64()),
            Some(5),
            "Difficulty maximum should be 5"
        );

        let description = difficulty.get("description")
            .and_then(|v| v.as_str())
            .expect("Should have description");
        assert!(description.contains("1") && description.contains("5"),
            "Description should mention range 1-5");
    }

    /// Test: Verify create_recipe tool exposes difficulty parameter
    #[test]
    fn test_create_recipe_tool_has_difficulty_field() {
        let tool = create_recipe_tool();
        let properties = tool.input_schema
            .get("properties")
            .expect("Should have properties");

        let difficulty = properties
            .get("difficulty")
            .expect("Should have difficulty field");

        assert_eq!(
            difficulty.get("type").and_then(|v| v.as_str()),
            Some("integer"),
            "Difficulty should be integer type"
        );
        assert_eq!(
            difficulty.get("minimum").and_then(|v| v.as_i64()),
            Some(1),
            "Difficulty minimum should be 1"
        );
        assert_eq!(
            difficulty.get("maximum").and_then(|v| v.as_i64()),
            Some(5),
            "Difficulty maximum should be 5"
        );
    }

    fn timer_test_client() -> ApiClient {
        ApiClient::new("http://127.0.0.1:0".to_string(), None, None).unwrap()
    }

    #[test]
    fn test_start_timer_tool_schema_has_optional_step_number() {
        let tool = start_timer_tool();
        let props = tool.input_schema.get("properties").unwrap();
        let step = props.get("step_number").expect("step_number property");
        assert_eq!(step.get("type").and_then(|v| v.as_str()), Some("integer"));
        assert_eq!(step.get("minimum").and_then(|v| v.as_u64()), Some(1));
        let required = tool.input_schema.get("required").and_then(|v| v.as_array()).unwrap();
        assert!(!required.iter().any(|v| v.as_str() == Some("step_number")));
    }

    #[test]
    fn test_start_timer_without_step_number() {
        let client = timer_test_client();
        let result = handle_start_timer(
            &client,
            json!({"duration_minutes": 30, "label": "Marinate chicken"}),
        )
        .unwrap();
        assert!(result.get("timer_id").is_some());
        assert_eq!(result["duration_minutes"], json!(30.0));
        assert_eq!(result["label"], "Marinate chicken");
        assert!(result.get("step_number").is_none(), "step_number must be omitted when absent");
        assert_eq!(result["message"], "Timer started: Marinate chicken for 30 minutes");
    }

    #[test]
    fn test_start_timer_with_step_number() {
        let client = timer_test_client();
        let result = handle_start_timer(
            &client,
            json!({"duration_minutes": 30, "label": "Marinate chicken", "step_number": 2}),
        )
        .unwrap();
        assert_eq!(result["step_number"], json!(2));
        assert_eq!(result["message"], "Timer started: Marinate chicken for 30 minutes (step 2)");
    }

    #[test]
    fn test_start_timer_accepts_integer_valued_float_step_number() {
        let client = timer_test_client();
        let result = handle_start_timer(
            &client,
            json!({"duration_minutes": 30, "label": "Marinate chicken", "step_number": 2.0}),
        )
        .unwrap();
        assert_eq!(result["step_number"], json!(2));
    }

    #[test]
    fn test_start_timer_rejects_zero_step_number() {
        let client = timer_test_client();
        let err = handle_start_timer(
            &client,
            json!({"duration_minutes": 30, "label": "Marinate chicken", "step_number": 0}),
        )
        .unwrap_err();
        assert_eq!(err.code, -32602, "expected invalid params error");
    }

    #[test]
    fn test_start_timer_rejects_non_integer_step_number() {
        let client = timer_test_client();
        for bad in [json!(1.5), json!("2"), json!(-1)] {
            let err = handle_start_timer(
                &client,
                json!({"duration_minutes": 30, "label": "Marinate chicken", "step_number": bad}),
            )
            .unwrap_err();
            assert_eq!(err.code, -32602, "expected invalid params error");
        }
    }

    #[test]
    fn test_set_servings_tool_schema() {
        let tool = set_servings_tool();
        let props = tool.input_schema.get("properties").unwrap().as_object().unwrap();
        assert_eq!(props.len(), 1, "servings is the only property");
        let servings = props.get("servings").expect("servings property");
        assert_eq!(servings.get("type").and_then(|v| v.as_str()), Some("integer"));
        assert_eq!(servings.get("minimum").and_then(|v| v.as_u64()), Some(1));
        assert_eq!(servings.get("maximum").and_then(|v| v.as_u64()), Some(24));
        let required = tool.input_schema.get("required").and_then(|v| v.as_array()).unwrap();
        assert!(required.iter().any(|v| v.as_str() == Some("servings")));
        assert!(tool.description.contains("saved recipe"));
        assert!(tool.description.contains("update_recipe"));
    }

    #[test]
    fn test_set_servings_valid() {
        // The client points nowhere: any API call would fail the handler
        let client = timer_test_client();
        let result = handle_set_servings(&client, json!({"servings": 6})).unwrap();
        assert_eq!(result["servings"], json!(6));
        assert!(result["message"].as_str().unwrap().contains('6'));
    }

    #[test]
    fn test_set_servings_accepts_integer_valued_float() {
        let client = timer_test_client();
        let result = handle_set_servings(&client, json!({"servings": 6.0})).unwrap();
        assert_eq!(result["servings"], json!(6));
    }

    #[test]
    fn test_set_servings_rejects_invalid() {
        let client = timer_test_client();
        let err = handle_set_servings(&client, json!({})).unwrap_err();
        assert_eq!(err.code, -32602, "missing servings");
        for bad in [json!(0), json!(25), json!(-2), json!(2.5), json!("6")] {
            let err = handle_set_servings(&client, json!({"servings": bad.clone()})).unwrap_err();
            assert_eq!(err.code, -32602, "expected invalid params for {}", bad);
        }
    }

    /// Both tag-carrying tools declare the same optional array-of-strings parameter
    #[test]
    fn test_create_and_update_tools_declare_tags_parameter() {
        for tool in [create_recipe_tool(), update_recipe_tool()] {
            let tags = tool.input_schema
                .get("properties")
                .and_then(|p| p.get("tags"))
                .unwrap_or_else(|| panic!("{} should have a tags property", tool.name));

            assert_eq!(tags.get("type").and_then(|v| v.as_str()), Some("array"));
            assert_eq!(
                tags.get("items").and_then(|i| i.get("type")).and_then(|v| v.as_str()),
                Some("string"),
                "tags items should be strings"
            );

            let description = tags.get("description").and_then(|v| v.as_str())
                .expect("tags should have a description");
            assert!(description.contains("'main'"), "description should name the main course tag");
            assert!(description.contains("'dessert'"), "description should name the dessert tag");
            assert!(description.contains("'italian'"), "description should give a cuisine example");
            assert!(description.contains("'vegetarian'"), "description should give a diet example");
            assert!(
                description.contains("Omit on create to have tags assigned automatically."),
                "description should explain auto-assignment"
            );

            let required = tool.input_schema.get("required").and_then(|v| v.as_array()).unwrap();
            assert!(
                !required.iter().any(|v| v.as_str() == Some("tags")),
                "tags must stay optional on {}",
                tool.name
            );
        }
    }

    #[test]
    fn test_parse_tags_absent_and_null() {
        assert_eq!(parse_tags(&json!({"title": "Pie"})).unwrap(), None);
        assert_eq!(parse_tags(&json!({"tags": null})).unwrap(), None);
    }

    #[test]
    fn test_parse_tags_reads_array_of_strings() {
        let parsed = parse_tags(&json!({"tags": ["dessert", "french"]})).unwrap();
        assert_eq!(parsed, Some(vec!["dessert".to_string(), "french".to_string()]));
        assert_eq!(parse_tags(&json!({"tags": []})).unwrap(), Some(vec![]));
    }

    #[test]
    fn test_parse_tags_rejects_non_string_values() {
        for bad in [json!({"tags": "dessert"}), json!({"tags": [1]})] {
            let err = parse_tags(&bad).unwrap_err();
            assert_eq!(err.code, -32602, "expected invalid params error");
        }
    }
}
