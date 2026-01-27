# Design: Add MCP Recipe Interface

## Architecture Overview

We're adding a **second binary** to the project that implements an MCP (Model Context Protocol) server. This server exposes the existing recipe database through a JSON-RPC 2.0 interface over stdio, enabling Claude Desktop to interact with recipes using natural language.

```
┌─────────────────┐         stdio          ┌──────────────────────┐
│ Claude Desktop  │ ◄──────────────────────► │ recipe-vault-mcp     │
│                 │      JSON-RPC 2.0        │ (MCP Server)         │
└─────────────────┘                          └──────────────────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────────┐
                                              │ SQLite Database      │
                                              │ (recipes.db)         │
                                              └──────────────────────┘

┌─────────────────┐         HTTP            ┌──────────────────────┐
│ Web Clients     │ ◄──────────────────────► │ recipe-vault         │
│                 │      REST API            │ (Axum Server)        │
└─────────────────┘                          └──────────────────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────────┐
                                              │ SQLite Database      │
                                              │ (recipes.db)         │
                                              └──────────────────────┘
```

**Key Principle**: Both binaries share the same database and business logic. The MCP server is a thin wrapper around existing `db::queries` functions.

## MCP Protocol Implementation

### Transport Layer
- **Protocol**: JSON-RPC 2.0
- **Transport**: stdio (standard input/output)
- **Message Format**: Line-delimited JSON (one message per line)

### MCP Tool Schema

Each tool follows this structure:
```json
{
  "name": "tool_name",
  "description": "What the tool does",
  "inputSchema": {
    "type": "object",
    "properties": { ... },
    "required": [ ... ]
  }
}
```

### Tool Definitions

#### 1. list_recipes
**Purpose**: Discover available recipes

```json
{
  "name": "list_recipes",
  "description": "List all recipes in the database. Returns recipe ID, title, and description for each recipe.",
  "inputSchema": {
    "type": "object",
    "properties": {}
  }
}
```

**Implementation**: Calls `db::queries::list_recipes(pool)` and serializes results

**Output**: Array of `{id, title, description}`

#### 2. get_recipe
**Purpose**: Retrieve full recipe details including ingredients and steps

```json
{
  "name": "get_recipe",
  "description": "Get complete details for a specific recipe by ID, including all ingredients and cooking steps.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "recipe_id": {
        "type": "string",
        "description": "The UUID of the recipe to retrieve"
      }
    },
    "required": ["recipe_id"]
  }
}
```

**Implementation**: Calls `db::queries::get_recipe_with_details(pool, recipe_id)`

**Output**: Full `RecipeWithDetails` object

#### 3. create_recipe
**Purpose**: Add a new recipe to the database

```json
{
  "name": "create_recipe",
  "description": "Create a new recipe with ingredients and cooking steps. Returns the created recipe with generated ID.",
  "inputSchema": {
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
  }
}
```

**Implementation**:
- Parse input to `CreateRecipe` struct (reuse existing model)
- Call `db::queries::create_recipe(pool, create_recipe)`
- Return full created recipe

**Validation**: Same validation as REST API (unique title, valid structure)

## Code Organization

```
src/
  mcp/
    mod.rs         # Module exports
    server.rs      # MCP server loop (stdio read/write, JSON-RPC dispatch)
    tools.rs       # Tool definitions and handlers
    protocol.rs    # JSON-RPC types (Request, Response, Error)
  bin/
    recipe_vault_mcp.rs  # Binary entry point
```

### Shared Code

The MCP server reuses:
- `src/models/*` - All domain models
- `src/db/queries.rs` - All database operations
- `src/db/connection.rs` - Database pool creation
- `src/config.rs` - Configuration (DATABASE_URL)
- `src/error.rs` - Error types (map to JSON-RPC errors)

## Error Handling

Map `ApiError` to JSON-RPC error codes:
```rust
ApiError::NotFound(_) → -32001 (custom: not found)
ApiError::Validation(_) → -32602 (invalid params)
ApiError::Conflict(_) → -32002 (custom: conflict)
ApiError::Database(_) → -32603 (internal error)
```

JSON-RPC error response:
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32001,
    "message": "Recipe not found: abc-123"
  },
  "id": 1
}
```

## Testing Strategy

### Layer 1: Business Logic Tests (Already Complete)
The behavioral tests in `tests/recipes_test.rs` validate all CRUD operations. These tests ensure the underlying database operations work correctly.

**No new business logic tests needed** - we're reusing existing validated functions.

### Layer 2: MCP Protocol Tests

**Unit Tests** (`src/mcp/tools.rs`):
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_list_recipes_tool_schema() {
        let tool = list_recipes_tool();
        assert_eq!(tool.name, "list_recipes");
        assert!(tool.input_schema.properties.is_empty());
    }

    #[test]
    fn test_get_recipe_tool_schema() {
        let tool = get_recipe_tool();
        assert!(tool.input_schema.required.contains(&"recipe_id".to_string()));
    }

    #[test]
    fn test_create_recipe_tool_schema() {
        let tool = create_recipe_tool();
        assert!(tool.input_schema.required.contains(&"title".to_string()));
        assert!(tool.input_schema.required.contains(&"description".to_string()));
    }
}
```

**Integration Tests** (`tests/mcp_server_test.rs`):
```rust
// Test JSON-RPC request/response parsing
#[tokio::test]
async fn test_list_recipes_json_rpc() {
    let pool = setup_test_db().await;
    let request = json!({
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {"name": "list_recipes", "arguments": {}},
        "id": 1
    });

    let response = handle_request(&pool, request).await;
    assert_eq!(response["jsonrpc"], "2.0");
    assert_eq!(response["id"], 1);
    assert!(response["result"].is_array());
}
```

### Layer 3: Manual Testing with Claude Desktop

**Setup** (`README.md` instructions):
1. Build MCP server: `cargo build --release --bin recipe-vault-mcp`
2. Configure Claude Desktop (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "recipe-vault": {
      "command": "/path/to/recipe-vault/target/release/recipe-vault-mcp",
      "env": {
        "DATABASE_URL": "sqlite:///path/to/recipes.db"
      }
}
  }
}
```
3. Restart Claude Desktop
4. Test natural language interactions:
   - "List all recipes"
   - "Show me the recipe for [title]"
   - "Create a new recipe for chocolate chip cookies with these ingredients..."

**Test Cases**:
- List empty database → returns empty array
- List with recipes → returns all recipes
- Get valid recipe → returns full details
- Get invalid ID → error message
- Create valid recipe → success, returns ID
- Create duplicate title → conflict error
- Create invalid recipe → validation error

## Claude Desktop Configuration

Users will add this to their Claude Desktop config:
```json
{
  "mcpServers": {
    "recipe-vault": {
      "command": "/absolute/path/to/recipe-vault-mcp",
      "env": {
        "DATABASE_URL": "sqlite:///absolute/path/to/recipes.db"
      }
    }
  }
}
```

The MCP server will be discovered automatically and tools will appear in Claude's interface.

## Dependencies

New dependencies needed:
```toml
[dependencies]
# JSON-RPC protocol
serde_json = "1.0"  # Already present
tokio = { version = "1.41", features = ["full"] }  # Already present

# Async stdio (if needed)
tokio-util = { version = "0.7", features = ["codec"] }
```

All other dependencies already present from REST API implementation.

## Future Enhancements (Out of Scope)

These are explicitly NOT included in this change:
- Search/filter recipes (can be added as separate `search_recipes` tool)
- Update/delete operations (CRUD operations exist, just not exposed via MCP yet)
- Cooking sessions (spec-2.md cooking guidance features)
- Recipe images or attachments
- User authentication (MCP is local-only, trusts Claude Desktop)

The current 3-tool interface validates the MCP approach and can be incrementally expanded.
