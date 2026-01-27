## 1. MCP HTTP Client Implementation

- [x] 1.1 Add reqwest dependency with blocking feature to Cargo.toml
- [x] 1.2 Create `src/mcp/http_client.rs` with API client wrapper
  - Struct holding base_url and reqwest::blocking::Client
  - Methods: list_recipes, get_recipe, create_recipe, update_recipe, delete_recipe
  - Error mapping from HTTP status codes to JsonRpcError
- [x] 1.3 Update `src/mcp/mod.rs` to export http_client module
- [x] 1.4 Refactor `src/mcp/tools.rs` handlers to use http_client instead of SqlitePool
  - Change handler signatures from `(pool: &SqlitePool, params)` to `(client: &ApiClient, params)`
  - Each handler delegates to corresponding http_client method

## 2. MCP Server Binary Updates

- [x] 2.1 Update `src/bin/recipe-vault-mcp.rs`
  - Remove database initialization
  - Read API_BASE_URL from environment
  - Initialize ApiClient instead of SqlitePool
  - Exit with error if API_BASE_URL not set
- [x] 2.2 Update `src/mcp/server.rs` to accept ApiClient instead of SqlitePool
  - Change run_server signature
  - Change handle_request signature
  - Pass client to tool handlers

## 3. Docker Simplification

- [x] 3.1 Update `Dockerfile`
  - Remove recipe-vault-mcp from cargo build command
  - Remove COPY for recipe-vault-mcp binary
- [x] 3.2 Delete `docker-compose.yml`
- [x] 3.3 Update README with new docker run command

## 4. Testing

- [x] 4.1 Add unit tests for http_client error mapping
- [x] 4.2 Update or remove MCP integration tests that use direct database access
- [ ] 4.3 Add integration test for MCP -> API communication (requires API server running)

## 5. Documentation

- [x] 5.1 Update Claude Desktop config example with API_BASE_URL
- [x] 5.2 Document the new architecture in README
