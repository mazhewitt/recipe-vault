# Implementation Tasks: Add MCP Recipe Interface

## Phase 1: MCP Protocol Foundation
- [x] Add `tokio-util` dependency to Cargo.toml for codec utilities
- [x] Create `src/mcp/mod.rs` with module structure
- [x] Create `src/mcp/protocol.rs` defining JSON-RPC types:
  - `JsonRpcRequest` struct (jsonrpc, method, params, id)
  - `JsonRpcResponse` struct (jsonrpc, result, error, id)
  - `JsonRpcError` struct (code, message)
  - `ToolDefinition` struct (name, description, inputSchema)
- [x] Create `src/mcp/server.rs` with stdio message loop:
  - Read line-delimited JSON from stdin
  - Parse to JsonRpcRequest
  - Dispatch to tool handlers
  - Write JsonRpcResponse to stdout
  - Handle malformed JSON gracefully

## Phase 2: Tool Definitions
- [x] Create `src/mcp/tools.rs` defining tool schemas:
  - `list_recipes_tool()` → returns ToolDefinition
  - `get_recipe_tool()` → returns ToolDefinition with recipe_id parameter
  - `create_recipe_tool()` → returns ToolDefinition with full recipe schema
- [x] Add `fn get_all_tools() -> Vec<ToolDefinition>` for tool discovery
- [x] Add unit tests for tool schema validation:
  - Test required fields are present
  - Test parameter types match
  - Test descriptions are clear

## Phase 3: Tool Handlers
- [x] Implement `list_recipes` handler in `src/mcp/tools.rs`:
  - Call `db::queries::list_recipes(pool)`
  - Return JSON array of recipes
  - Handle database errors → JSON-RPC error
- [x] Implement `get_recipe` handler:
  - Parse recipe_id from params
  - Call `db::queries::get_recipe_with_details(pool, recipe_id)`
  - Return full RecipeWithDetails
  - Handle NotFound → JSON-RPC error -32001
  - Handle invalid UUID → JSON-RPC error -32602
- [x] Implement `create_recipe` handler:
  - Parse CreateRecipe from params
  - Call `db::queries::create_recipe(pool, create_recipe)`
  - Return created recipe with ID
  - Handle validation errors → JSON-RPC error -32602
  - Handle conflict (duplicate title) → JSON-RPC error -32002
  - Handle database errors → JSON-RPC error -32603

## Phase 4: MCP Server Binary
- [x] Create `src/bin/recipe_vault_mcp.rs`:
  - Load environment variables (DATABASE_URL)
  - Create database pool (reuse `db::connection::create_pool`)
  - Run migrations (reuse `db::connection::run_migrations`)
  - Initialize MCP server loop
  - Pass pool to server for tool handlers
- [x] Add MCP binary to Cargo.toml:
  ```toml
  [[bin]]
  name = "recipe-vault-mcp"
  path = "src/bin/recipe_vault_mcp.rs"
  ```
- [x] Test binary builds: `cargo build --bin recipe-vault-mcp`
- [x] Test binary runs: `echo '{"test": true}' | ./target/debug/recipe-vault-mcp`

## Phase 5: Integration Testing
- [x] Create `tests/mcp_server_test.rs`
- [x] Add test helper to send JSON-RPC request and parse response
- [x] Test `list_recipes` JSON-RPC call:
  - Empty database → returns []
  - With recipes → returns array of recipes
- [x] Test `get_recipe` JSON-RPC call:
  - Valid ID → returns RecipeWithDetails
  - Invalid ID → returns error -32001
  - Malformed ID → returns error -32602
- [x] Test `create_recipe` JSON-RPC call:
  - Valid recipe → returns created recipe with ID
  - Duplicate title → returns error -32002
  - Missing required field → returns error -32602
  - Invalid data type → returns error -32602

## Phase 6: Documentation
- [x] Update `README.md` with Claude Desktop integration section:
  - Prerequisites (Claude Desktop installed)
  - Build MCP server: `cargo build --release --bin recipe-vault-mcp`
  - Configure Claude Desktop (add to `claude_desktop_config.json`)
  - Example configuration with absolute paths
  - How to verify tools are loaded
- [x] Add `MCP.md` with detailed tool documentation:
  - Each tool's purpose
  - Parameter descriptions
  - Example natural language prompts
  - Expected responses
  - Error scenarios
- [x] Add example interaction scripts for manual testing

## Phase 7: Validation
- [x] Run all tests: `cargo test`
- [x] Build release binary: `cargo build --release --bin recipe-vault-mcp`
- [x] Manual test: Configure Claude Desktop and verify:
  - Tools appear in Claude's interface
  - "List all recipes" works
  - "Show me recipe for [title]" works
  - "Create a recipe for pancakes" works
  - Error handling works (invalid IDs, duplicates)
- [x] Validate with OpenSpec: `openspec validate add-mcp-recipe-interface --strict --no-interactive`

## Phase 8: Commit and Documentation
- [x] Commit MCP implementation
- [x] Update CHANGELOG (if present) with MCP feature
- [x] Tag release (if appropriate)

## Testing Notes

**Unit Tests**: Focus on tool schema correctness and parameter validation

**Integration Tests**: Focus on JSON-RPC protocol correctness, reuse existing database test fixtures from `recipes_test.rs`

**Manual Tests**: Essential for validating Claude Desktop integration and natural language interaction quality

## Dependencies

No new external dependencies needed beyond `tokio-util`. All MCP protocol handling can be done with:
- `serde_json` (already present)
- `tokio` (already present)
- Standard library I/O

## Success Criteria

- [x] MCP server binary builds without errors
- [x] All automated tests pass
- [x] Claude Desktop successfully loads the MCP server
- [x] All 3 tools are usable via natural language
- [x] Error handling provides clear feedback
- [x] Documentation is complete and accurate
