# Change: Refactor MCP Server to HTTP Client Architecture

## Why

The current architecture has the MCP server directly accessing the SQLite database. This prevents running the MCP server on one machine (laptop) while the database and API server run on another (Mac Studio). By making the MCP server a thin HTTP client that communicates with the containerized API server, we enable remote usage scenarios and simplify deployment to a single container.

## What Changes

- **BREAKING**: MCP server no longer accesses SQLite directly; instead calls API server via HTTP
- MCP server becomes a local native process (not containerized)
- API server remains containerized with SQLite database and mounted volume
- Docker Compose removed (single container deployment)
- MCP server requires `API_BASE_URL` environment variable to locate the API server

## Impact

- Affected specs: `deployment`, `mcp-interface`
- Affected code:
  - `src/mcp/tools.rs` - Change from direct DB queries to HTTP client calls
  - `src/bin/recipe-vault-mcp.rs` - Remove database initialization, add HTTP client setup
  - `Dockerfile` - Remove MCP binary from image
  - `docker-compose.yml` - Remove file (single container)
  - Claude Desktop config - Add `API_BASE_URL` environment variable
