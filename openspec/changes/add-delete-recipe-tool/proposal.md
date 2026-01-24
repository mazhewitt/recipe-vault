# Change: Add Delete Recipe Tool to MCP Server

## Why
Users currently have no way to remove recipes via the MCP interface (Claude Desktop/CLI). While the REST API supports deletion, the MCP server lacks this capability, forcing users to switch interfaces to manage their recipe list effectively.

## What Changes
- Add `delete_recipe` tool to the MCP server.
- Expose the existing delete functionality from the recipe domain to the MCP layer.

## Impact
- **Affected specs:** `mcp-interface`
- **Affected code:** `src/mcp/tools.rs`, `src/mcp/server.rs`
