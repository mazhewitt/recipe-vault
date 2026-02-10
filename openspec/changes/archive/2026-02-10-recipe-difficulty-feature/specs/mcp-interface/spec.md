# MCP Interface Delta Specification

## ADDED Requirements

### Requirement: Update Recipe via MCP

The system SHALL expose recipe updating through an MCP tool that accepts recipe ID and fields to update, including difficulty.

#### Scenario: Update recipe difficulty via MCP
- **WHEN** Claude calls `update_recipe` with recipe_id and difficulty (1-5)
- **THEN** the recipe's difficulty is updated in the database
- **AND** the updated recipe is returned
- **AND** updated_at timestamp is refreshed

#### Scenario: Update multiple fields including difficulty
- **WHEN** Claude calls `update_recipe` with recipe_id, title, and difficulty
- **THEN** both title and difficulty are updated
- **AND** other fields remain unchanged
- **AND** the complete updated recipe is returned

#### Scenario: Update recipe with invalid difficulty
- **WHEN** Claude calls `update_recipe` with difficulty outside range 1-5
- **THEN** a JSON-RPC error is returned
- **AND** the error code is -32602 (invalid params)
- **AND** the error message indicates valid difficulty range is 1-5
- **AND** no changes are persisted

#### Scenario: Update recipe that doesn't exist
- **WHEN** Claude calls `update_recipe` with an invalid recipe_id
- **THEN** a JSON-RPC error is returned
- **AND** the error code is -32001 (not found)
- **AND** the error message indicates the recipe was not found

#### Scenario: Update recipe in different family
- **WHEN** USER_EMAIL is configured (scoped mode)
- **AND** Claude calls `update_recipe` for a recipe created by a different family
- **THEN** a JSON-RPC error is returned
- **AND** the error code is -32001 (not found)
- **AND** the recipe details are not disclosed

#### Scenario: Update recipe in god mode
- **WHEN** USER_EMAIL is NOT configured (god mode)
- **AND** Claude calls `update_recipe` for any recipe
- **THEN** the recipe is updated regardless of which family created it
- **AND** the updated recipe is returned

### Requirement: Update Recipe Tool Definition

The system SHALL include update_recipe in the tool discovery response with appropriate schema.

#### Scenario: Tool discovery includes update_recipe
- **WHEN** Claude Desktop requests available tools
- **THEN** the response includes `update_recipe` tool
- **AND** the tool schema includes recipe_id as required parameter
- **AND** the tool schema includes optional parameters: title, description, prep_time_minutes, cook_time_minutes, servings, difficulty
- **AND** difficulty parameter specifies minimum: 1, maximum: 5

#### Scenario: Update recipe schema validation
- **WHEN** the MCP server validates update_recipe parameters
- **THEN** recipe_id must be present (required)
- **AND** at least one optional field must be provided
- **AND** difficulty must be integer 1-5 if provided
- **AND** other fields follow existing validation rules

## Modified Data Types

### UpdateRecipeParams
```
UpdateRecipeParams {
    recipe_id: String (UUID)                  // Required
    title: Option<String> (1-200 chars)       // Optional
    description: Option<String> (max 2000)    // Optional
    prep_time_minutes: Option<u32>            // Optional
    cook_time_minutes: Option<u32>            // Optional
    servings: Option<u32>                     // Optional
    difficulty: Option<u8> (1-5)              // NEW - Optional
}
```

### ToolDefinition for update_recipe
```json
{
  "name": "update_recipe",
  "description": "Update recipe metadata including title, description, times, servings, and difficulty rating",
  "inputSchema": {
    "type": "object",
    "properties": {
      "recipe_id": {
        "type": "string",
        "description": "The UUID of the recipe to update"
      },
      "title": {
        "type": "string",
        "description": "New recipe title (1-200 characters)"
      },
      "description": {
        "type": "string",
        "description": "New recipe description (max 2000 characters)"
      },
      "prep_time_minutes": {
        "type": "integer",
        "description": "Preparation time in minutes"
      },
      "cook_time_minutes": {
        "type": "integer",
        "description": "Cooking time in minutes"
      },
      "servings": {
        "type": "integer",
        "description": "Number of servings"
      },
      "difficulty": {
        "type": "integer",
        "minimum": 1,
        "maximum": 5,
        "description": "Difficulty rating (1=Easy, 2=Medium-Easy, 3=Medium, 4=Medium-Hard, 5=Hard)"
      }
    },
    "required": ["recipe_id"]
  }
}
```

## Related Capabilities

- **recipe-difficulty-rating**: Users can override AI-assigned difficulty via this tool
- **recipe-domain**: This tool maps to the update_recipe endpoint in the recipe domain
