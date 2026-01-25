## 1. API Server Authentication

- [x] 1.1 Create `src/auth.rs` module
  - Function to load or generate API key from `/app/data/.api_key`
  - Generate 32-char hex key using `rand` crate
  - Log key on first generation only
- [x] 1.2 Create Axum middleware for API key validation
  - Extract `X-API-Key` header
  - Compare against loaded key (constant-time comparison)
  - Return 401 with JSON error if missing/invalid
- [x] 1.3 Update `src/main.rs` to apply auth middleware
  - Load API key on startup
  - Apply middleware layer to `/api/*` routes
- [x] 1.4 Add `rand` dependency to Cargo.toml

## 2. MCP Client Updates

- [x] 2.1 Update `src/mcp/http_client.rs`
  - Accept API key in `ApiClient::new()`
  - Add `X-API-Key` header to all requests
- [x] 2.2 Update `src/bin/recipe_vault_mcp.rs`
  - Read `API_KEY` from environment (optional with warning)
  - Pass key to ApiClient

## 3. Testing

- [x] 3.1 Add unit tests for key generation
- [x] 3.2 Add unit tests for constant-time comparison
- [x] 3.3 Add unit tests for 401 error mapping in HTTP client
- [ ] 3.4 Add integration tests for auth middleware (future)

## 4. Documentation

- [x] 4.1 Update README with API key setup instructions
- [x] 4.2 Update Claude Desktop config example with API_KEY
