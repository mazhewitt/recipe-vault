## ADDED Requirements

### Requirement: Delete Recipe via MCP

The system SHALL expose recipe deletion through an MCP tool that accepts a recipe ID and removes it from the database.

#### Scenario: Delete recipe by valid ID
- GIVEN a recipe exists with ID "abc-123"
- WHEN Claude Desktop calls `delete_recipe` with recipe_id "abc-123"
- THEN the recipe is deleted from the database
- AND all associated ingredients and steps are removed
- AND a success message is returned confirming deletion

#### Scenario: Delete recipe with invalid ID
- GIVEN no recipe exists with ID "invalid-id"
- WHEN Claude Desktop calls `delete_recipe` with recipe_id "invalid-id"
- THEN a JSON-RPC error is returned
- AND the error code is -32001 (not found)
- AND the error message indicates the recipe was not found

#### Scenario: Delete recipe with malformed ID
- GIVEN an invalid UUID format is provided
- WHEN Claude Desktop calls `delete_recipe` with recipe_id "not-a-uuid"
- THEN a JSON-RPC error is returned
- AND the error code is -32602 (invalid params)
- AND the error message indicates invalid parameter format

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
- AND each tool has a valid JSON Schema
