## Why

The current architecture supports only a single MCP server at a time. To enable URL-based recipe extraction using Anthropic's official `@modelcontextprotocol/server-fetch`, we need to run multiple MCP servers simultaneously (the existing recipe-vault-mcp for recipe CRUD operations, plus the fetch server for web content retrieval). This architectural change unblocks a key user request: the ability to save recipes directly from URLs, similar to the experience in Claude Desktop.

## What Changes

- Refactor `AiAgent` to manage multiple MCP server processes concurrently
- Add tool registry to route tool calls to the correct MCP server
- Integrate official `@modelcontextprotocol/server-fetch` server for URL fetching
- Update `AiAgentConfig` to support multiple server configurations
- Add Python/uvx runtime to Docker container for fetch server
- Update system prompt to document URL recipe extraction capability
- Modify startup/shutdown logic to handle multiple processes

## Capabilities

### New Capabilities

- `multi-mcp-server`: Managing multiple MCP server processes, routing tool calls, and aggregating tools from different servers
- `url-recipe-extraction`: Fetching and extracting recipes from web URLs using the official fetch MCP server

### Modified Capabilities

<!-- No existing capabilities have requirement changes - this is new functionality -->

## Impact

**Code:**
- `src/ai/client.rs`: Major refactor to support multiple MCP processes (AiAgent struct, start/stop, call routing)
- `src/handlers/chat.rs`: Configuration changes to specify multiple MCP servers
- System prompt in chat handler: Add URL extraction documentation

**Infrastructure:**
- `Dockerfile`: Add Python 3, pip, and uv package manager
- Docker container memory: +15-20MB for Python fetch server process

**Dependencies:**
- New runtime dependency: Python 3 + uvx for fetch server
- New MCP server: `@modelcontextprotocol/server-fetch` (official)

**User-facing:**
- New capability: Users can paste recipe URLs and have them automatically fetched and saved
- No breaking changes to existing recipe functionality
