# Change: Add Update Recipe Tool to MCP Server

## Why
Users currently have no way to modify existing recipes via the MCP interface (Claude Desktop/CLI). While they can create and delete recipes, making changes (e.g., fixing a typo, adjusting ingredients) requires deleting and recreating the recipe, which is inefficient.

## What Changes
- Add `update_recipe` tool to the MCP server.
- Expose the existing update functionality from the recipe domain to the MCP layer.
- Allow partial updates (e.g., just changing the title) as well as full replacements of ingredients/steps.

## Impact
- **Affected specs:** `mcp-interface`
- **Affected code:** `src/mcp/tools.rs`, `src/mcp/server.rs`
