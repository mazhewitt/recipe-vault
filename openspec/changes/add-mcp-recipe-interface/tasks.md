# Implementation Tasks: Add MCP Recipe Interface

## Phase 1: MCP Protocol Foundation
- [ ] Add `tokio-util` dependency to Cargo.toml for codec utilities
- [ ] Create `src/mcp/mod.rs` with module structure
- [ ] Create `src/mcp/protocol.rs` defining JSON-RPC types:
  - `JsonRpcRequest` struct (jsonrpc, method, params, id)
  - `JsonRpcResponse` struct (jsonrpc, result, error, id)
  - `JsonRpcError` struct (code, message)
  - `ToolDefinition` struct (name, description, inputSchema)
- [ ] Create `src/mcp/server.rs` with stdio message loop:
  - Read line-delimited JSON from stdin
  - Parse to JsonRpcRequest
  - Dispatch to tool handlers
  - Write JsonRpcResponse to stdout
  - Handle malformed JSON gracefully

## Phase 2: Tool Definitions
- [ ] Create `src/mcp/tools.rs` defining tool schemas:
  - `list_recipes_tool()` → returns ToolDefinition
  - `get_recipe_tool()` → returns ToolDefinition with recipe_id parameter
  - `create_recipe_tool()` → returns ToolDefinition with full recipe schema
- [ ] Add `fn get_all_tools() -> Vec<ToolDefinition>` for tool discovery
- [ ] Add unit tests for tool schema validation:
  - Test required fields are present
  - Test parameter types match
  - Test descriptions are clear

## Phase 3: Tool Handlers
- [ ] Implement `list_recipes` handler in `src/mcp/tools.rs`:
  - Call `db::queries::list_recipes(pool)`
  - Return JSON array of recipes
  - Handle database errors → JSON-RPC error
- [ ] Implement `get_recipe` handler:
  - Parse recipe_id from params
  - Call `db::queries::get_recipe_with_details(pool, recipe_id)`
  - Return full RecipeWithDetails
  - Handle NotFound → JSON-RPC error -32001
  - Handle invalid UUID → JSON-RPC error -32602
- [ ] Implement `create_recipe` handler:
  - Parse CreateRecipe from params
  - Call `db::queries::create_recipe(pool, create_recipe)`
  - Return created recipe with ID
  - Handle validation errors → JSON-RPC error -32602
  - Handle conflict (duplicate title) → JSON-RPC error -32002
  - Handle database errors → JSON-RPC error -32603

## Phase 4: MCP Server Binary
- [ ] Create `src/bin/recipe_vault_mcp.rs`:
  - Load environment variables (DATABASE_URL)
  - Create database pool (reuse `db::connection::create_pool`)
  - Run migrations (reuse `db::connection::run_migrations`)
  - Initialize MCP server loop
  - Pass pool to server for tool handlers
- [ ] Add MCP binary to Cargo.toml:
  ```toml
  [[bin]]
  name = "recipe-vault-mcp"
  path = "src/bin/recipe_vault_mcp.rs"
  ```
- [ ] Test binary builds: `cargo build --bin recipe-vault-mcp`
- [ ] Test binary runs: `echo '{"test": true}' | ./target/debug/recipe-vault-mcp`

## Phase 5: Integration Testing
- [ ] Create `tests/mcp_server_test.rs`
- [ ] Add test helper to send JSON-RPC request and parse response
- [ ] Test `list_recipes` JSON-RPC call:
  - Empty database → returns []
  - With recipes → returns array of recipes
- [ ] Test `get_recipe` JSON-RPC call:
  - Valid ID → returns RecipeWithDetails
  - Invalid ID → returns error -32001
  - Malformed ID → returns error -32602
- [ ] Test `create_recipe` JSON-RPC call:
  - Valid recipe → returns created recipe with ID
  - Duplicate title → returns error -32002
  - Missing required field → returns error -32602
  - Invalid data type → returns error -32602

## Phase 6: Documentation
- [ ] Update `README.md` with Claude Desktop integration section:
  - Prerequisites (Claude Desktop installed)
  - Build MCP server: `cargo build --release --bin recipe-vault-mcp`
  - Configure Claude Desktop (add to `claude_desktop_config.json`)
  - Example configuration with absolute paths
  - How to verify tools are loaded
- [ ] Add `MCP.md` with detailed tool documentation:
  - Each tool's purpose
  - Parameter descriptions
  - Example natural language prompts
  - Expected responses
  - Error scenarios
- [ ] Add example interaction scripts for manual testing

## Phase 7: Validation
- [ ] Run all tests: `cargo test`
- [ ] Build release binary: `cargo build --release --bin recipe-vault-mcp`
- [ ] Manual test: Configure Claude Desktop and verify:
  - Tools appear in Claude's interface
  - "List all recipes" works
  - "Show me recipe for [title]" works
  - "Create a recipe for pancakes" works
  - Error handling works (invalid IDs, duplicates)
- [ ] Validate with OpenSpec: `openspec validate add-mcp-recipe-interface --strict --no-interactive`

## Phase 8: Commit and Documentation
- [ ] Commit MCP implementation
- [ ] Update CHANGELOG (if present) with MCP feature
- [ ] Tag release (if appropriate)

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

- [ ] MCP server binary builds without errors
- [ ] All automated tests pass
- [ ] Claude Desktop successfully loads the MCP server
- [ ] All 3 tools are usable via natural language
- [ ] Error handling provides clear feedback
- [ ] Documentation is complete and accurate
