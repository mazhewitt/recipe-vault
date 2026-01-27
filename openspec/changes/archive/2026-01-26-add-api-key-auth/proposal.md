# Change: Add API Key Authentication

## Why

The API server is currently open to anyone on the network. Any device on the home network could delete or modify recipes. Adding API key authentication protects the API while remaining simple enough for home use.

## What Changes

- API server requires `X-API-Key` header on all `/api/*` requests
- On first startup (if no key exists), server generates a random key and saves to `/app/data/.api_key`
- Server logs the generated key once for user to save
- MCP HTTP client sends `API_KEY` from environment in request headers
- Requests without valid key receive 401 Unauthorized

## Impact

- Affected specs: New `api-security` capability
- Affected code:
  - `src/main.rs` - Add auth middleware layer
  - `src/auth.rs` - New module for key loading/generation and middleware
  - `src/mcp/http_client.rs` - Add API key header to requests
  - `src/config.rs` - Add optional API_KEY config
