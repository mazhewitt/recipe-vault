# Change: Add MCP Recipe Interface

## Why

Recipe Vault currently only has a REST API. To enable natural language interaction via Claude Desktop and validate the MCP (Model Context Protocol) approach, we need to expose recipes as MCP tools.

This provides:
- **Faster validation** of MCP integration approach
- **Natural language** recipe management via Claude Desktop
- **Foundation** for future cooking guidance features
- **Proof of concept** for MCP + SQLite architecture

## What Changes

- Implement MCP server binary that exposes existing recipe CRUD operations
- Define 3 MCP tools that wrap existing database queries
- Tools: `list_recipes`, `get_recipe`, `create_recipe`
- No new database tables (uses existing recipes)
- No new business logic (reuses db::queries functions)

## Impact

- **Affected specs**: `mcp-interface` (new capability)
- **Affected code**:
  - `Cargo.toml` - Add MCP/JSON-RPC dependencies
  - `src/mcp/` - New module for MCP server and tool definitions
  - `src/bin/recipe_vault_mcp.rs` - MCP server binary entry point
  - `README.md` - Add Claude Desktop configuration instructions
- **New dependencies**: JSON-RPC and stdio handling (tokio, serde_json already present)
- **Breaking changes**: None (additive only, REST API unchanged)
- **Related capability**: Exposes `recipe-domain` via MCP
- **Deployment**: Two processes - REST API (existing) + MCP server (new)
