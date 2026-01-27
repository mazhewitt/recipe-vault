# MCP Interface Specification

## Purpose

The MCP Interface capability enables natural language interaction with the Recipe Vault database through Claude Desktop using the Model Context Protocol (MCP). This provides an alternative interface to the REST API, optimized for conversational AI interaction.

## ADDED Requirements

### Requirement: List Recipes via MCP

The system SHALL expose recipe listing through an MCP tool that Claude Desktop can invoke.

#### Scenario: List all recipes
- GIVEN the MCP server is running
- WHEN Claude Desktop calls the `list_recipes` tool
- THEN all recipes in the database are returned
- AND each recipe includes id, title, and description
- AND the response is valid JSON

#### Scenario: List recipes from empty database
- GIVEN the database has no recipes
- WHEN Claude Desktop calls the `list_recipes` tool
- THEN an empty array is returned
- AND no error occurs

### Requirement: Retrieve Recipe Details via MCP

The system SHALL expose recipe retrieval through an MCP tool that accepts a recipe ID and returns complete details.

#### Scenario: Get recipe by valid ID
- GIVEN a recipe exists with ID "abc-123"
- WHEN Claude Desktop calls `get_recipe` with recipe_id "abc-123"
- THEN the complete recipe is returned
- AND all ingredients are included in order
- AND all steps are included in order
- AND the response matches the RecipeWithDetails structure

#### Scenario: Get recipe with invalid ID
- GIVEN no recipe exists with ID "invalid-id"
- WHEN Claude Desktop calls `get_recipe` with recipe_id "invalid-id"
- THEN a JSON-RPC error is returned
- AND the error code is -32001 (not found)
- AND the error message indicates the recipe was not found

#### Scenario: Get recipe with malformed ID
- GIVEN an invalid UUID format is provided
- WHEN Claude Desktop calls `get_recipe` with recipe_id "not-a-uuid"
- THEN a JSON-RPC error is returned
- AND the error code is -32602 (invalid params)
- AND the error message indicates invalid parameter format

### Requirement: Create Recipe via MCP

The system SHALL expose recipe creation through an MCP tool that accepts recipe details and returns the created recipe.

#### Scenario: Create recipe with minimal fields
- GIVEN a valid title "Simple Pasta" and description
- WHEN Claude Desktop calls `create_recipe` with title and description
- THEN a new recipe is created
- AND a UUID is generated
- AND the created recipe is returned
- AND created_at timestamp is set

#### Scenario: Create recipe with full details
- GIVEN a complete recipe with title, description, ingredients, and steps
- WHEN Claude Desktop calls `create_recipe` with all fields
- THEN a new recipe is created with all details
- AND ingredients are stored with correct positions
- AND steps are stored with correct positions
- AND the complete recipe is returned

#### Scenario: Create recipe with duplicate title
- GIVEN a recipe exists with title "Chocolate Cake"
- WHEN Claude Desktop calls `create_recipe` with title "Chocolate Cake"
- THEN a JSON-RPC error is returned
- AND the error code is -32002 (conflict)
- AND the error message indicates the title already exists

#### Scenario: Create recipe with missing required field
- GIVEN a recipe request without a title
- WHEN Claude Desktop calls `create_recipe` without the title parameter
- THEN a JSON-RPC error is returned
- AND the error code is -32602 (invalid params)
- AND the error message indicates which field is missing

#### Scenario: Create recipe with invalid servings
- GIVEN a recipe request with servings = -5
- WHEN Claude Desktop calls `create_recipe` with invalid servings
- THEN a JSON-RPC error is returned
- AND the error code is -32602 (invalid params)
- AND the error message indicates invalid servings value

### Requirement: MCP Protocol Compliance

The system SHALL implement the Model Context Protocol correctly for Claude Desktop integration.

#### Scenario: MCP server initialization
- GIVEN the MCP server binary is started
- WHEN it reads from stdin
- THEN it waits for JSON-RPC requests
- AND it responds to tool discovery requests
- AND it lists all available tools

#### Scenario: Tool discovery
- GIVEN Claude Desktop connects to the MCP server
- WHEN it requests available tools
- THEN the server responds with tool definitions
- AND `list_recipes` is included
- AND `get_recipe` is included
- AND `create_recipe` is included
- AND each tool has a valid JSON Schema

#### Scenario: JSON-RPC request format
- GIVEN a valid JSON-RPC 2.0 request
- WHEN the MCP server receives it via stdin
- THEN it parses the request
- AND extracts the method and params
- AND routes to the appropriate tool handler

#### Scenario: JSON-RPC response format
- GIVEN a tool handler completes successfully
- WHEN the MCP server returns the result
- THEN the response is valid JSON-RPC 2.0
- AND it includes jsonrpc: "2.0"
- AND it includes the matching request id
- AND it includes the result or error

#### Scenario: Malformed JSON-RPC request
- GIVEN an invalid JSON message
- WHEN the MCP server receives it via stdin
- THEN it returns a JSON-RPC parse error
- AND the error code is -32700
- AND it continues listening for new messages

### Requirement: Error Handling

The system SHALL map application errors to appropriate JSON-RPC error codes.

#### Scenario: Database connection error
- GIVEN the database file is inaccessible
- WHEN any tool is called
- THEN a JSON-RPC error is returned
- AND the error code is -32603 (internal error)
- AND the error message indicates database unavailability

#### Scenario: Transaction rollback
- GIVEN a database constraint violation during creation
- WHEN `create_recipe` is called
- THEN the transaction is rolled back
- AND no partial data is saved
- AND an appropriate JSON-RPC error is returned

## Data Types

### ToolDefinition
```
ToolDefinition {
    name: String
    description: String
    input_schema: JsonSchema
}
```

### JsonRpcRequest
```
JsonRpcRequest {
    jsonrpc: "2.0"
    method: String
    params: JsonValue
    id: u64
}
```

### JsonRpcResponse
```
JsonRpcResponse {
    jsonrpc: "2.0"
    result: Option<JsonValue>
    error: Option<JsonRpcError>
    id: u64
}
```

### JsonRpcError
```
JsonRpcError {
    code: i32
    message: String
}
```

## Error Codes

Standard JSON-RPC 2.0 codes:
- `-32700`: Parse error (invalid JSON)
- `-32600`: Invalid request (missing required fields)
- `-32601`: Method not found (unknown tool)
- `-32602`: Invalid params (wrong parameter types or missing required params)
- `-32603`: Internal error (database or server errors)

Custom application codes:
- `-32001`: Not found (resource doesn't exist)
- `-32002`: Conflict (duplicate resource)

## Related Capabilities

- **recipe-domain**: This capability exposes the Recipe Domain through MCP
- **cooking-guidance**: Future enhancement could add cooking session tools

## Integration Notes

The MCP interface reuses all business logic from the `recipe-domain` capability. No new database tables or validation logic is required. The MCP server acts as a protocol adapter, translating JSON-RPC tool calls to existing function calls and responses back to JSON-RPC format.

Claude Desktop integration requires:
1. Building the MCP server binary
2. Configuring `claude_desktop_config.json` with server path and environment
3. Restarting Claude Desktop to load the server
4. Tools appear automatically in Claude's interface

## Testing Strategy

**Unit tests** validate tool schema definitions and parameter specifications.

**Integration tests** validate JSON-RPC protocol handling and tool invocation with database operations.

**Manual tests** with Claude Desktop validate natural language interaction quality and error handling in real usage scenarios.
