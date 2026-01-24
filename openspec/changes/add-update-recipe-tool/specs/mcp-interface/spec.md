## ADDED Requirements

### Requirement: Update Recipe via MCP

The system SHALL expose recipe modification through an MCP tool that accepts a recipe ID and optional fields to update.

#### Scenario: Update recipe title
- GIVEN a recipe exists with ID "abc-123" and title "Old Title"
- WHEN Claude Desktop calls `update_recipe` with recipe_id "abc-123" and title "New Title"
- THEN the recipe title is updated in the database
- AND the updated recipe is returned
- AND the updated_at timestamp is refreshed

#### Scenario: Replace ingredients
- GIVEN a recipe exists with ID "abc-123"
- WHEN Claude Desktop calls `update_recipe` with recipe_id "abc-123" and a new list of ingredients
- THEN the old ingredients are removed
- AND the new ingredients are stored
- AND the recipe steps remain unchanged (unless also provided)

#### Scenario: Update non-existent recipe
- GIVEN no recipe exists with ID "invalid-id"
- WHEN Claude Desktop calls `update_recipe` with recipe_id "invalid-id"
- THEN a JSON-RPC error is returned
- AND the error code is -32001 (not found)

#### Scenario: Update recipe with duplicate title
- GIVEN a recipe exists with title "Cake"
- WHEN Claude Desktop calls `update_recipe` on another recipe setting title to "Cake"
- THEN a JSON-RPC error is returned
- AND the error code is -32002 (conflict)

## MODIFIED Requirements

### Requirement: MCP Protocol Compliance

The system SHALL implement the Model Context Protocol correctly for Claude Desktop integration.

#### Scenario: Tool discovery
- GIVEN Claude Desktop connects to the MCP server
- WHEN it requests available tools
- THEN the server responds with tool definitions
- AND `list_recipes` is included
- AND `get_recipe` is included
- AND `create_recipe` is included
- AND `delete_recipe` is included
- AND `update_recipe` is included
- AND each tool has a valid JSON Schema
