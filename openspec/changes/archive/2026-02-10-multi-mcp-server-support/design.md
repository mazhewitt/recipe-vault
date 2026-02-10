## Context

**Current State:**
The `AiAgent` in `src/ai/client.rs` spawns a single MCP server process (`recipe-vault-mcp`) and communicates via stdin/stdout using JSON-RPC. The agent maintains:
- `mcp_process: Arc<Mutex<Option<McpProcess>>>` - Single process handle
- `tools: Arc<Mutex<Vec<ToolDefinition>>>` - Tool definitions from that one server

**Constraints:**
- Running on NAS with 2GB total RAM
- Production deployment via Docker
- Family users (small scale, ~5 users)
- Must maintain existing recipe functionality without breaking changes

**Stakeholders:**
- End users: Want to save recipes from URLs (like Claude Desktop experience)
- Developers: Need maintainable multi-server architecture

## Goals / Non-Goals

**Goals:**
- Support multiple concurrent MCP server processes
- Integrate official `@modelcontextprotocol/server-fetch` for URL fetching
- Route tool calls to the correct server automatically
- Maintain backward compatibility with existing recipe tools
- Keep memory footprint reasonable (<50MB additional)

**Non-Goals:**
- Dynamic server discovery/registration (servers are configured at startup)
- Load balancing or failover between servers
- Server health monitoring/automatic restart
- Supporting MCP servers that require HTTP transport (stdin/stdout only)

## Decisions

### Decision 1: Multiple Processes with HashMap Registry

**Choice:** Use `HashMap<String, McpProcess>` to track servers by name, plus `HashMap<String, String>` for tool-to-server routing.

**Rationale:**
- Simple lookup by server name when routing tool calls
- Extensible: easy to add more servers in future
- Clear ownership: each tool belongs to exactly one server

**Alternatives Considered:**
- Vector of processes with linear search: O(n) lookup, less clear
- Single combined server that proxies to others: unnecessary complexity, another point of failure

### Decision 2: Server Configuration Schema

**Choice:** Introduce `McpServerConfig` struct with command, args, env:

```rust
pub struct McpServerConfig {
    pub name: String,        // e.g., "recipes", "fetch"
    pub command: String,     // e.g., "uvx", "./target/release/recipe-vault-mcp"
    pub args: Vec<String>,   // e.g., ["mcp-server-fetch"]
    pub env: HashMap<String, String>,  // e.g., {"API_KEY": "..."}
}

pub struct AiAgentConfig {
    pub mcp_servers: Vec<McpServerConfig>,
    pub system_prompt: Option<String>,
}
```

**Rationale:**
- Flexible: supports different executables (Rust binary, uvx, npm, etc.)
- Environment isolation: each server gets its own env vars
- Declarative: configuration clearly expresses intent

**Alternatives Considered:**
- Hard-coded server list: not extensible
- Auto-discovery from directory: overkill for our use case

### Decision 3: Tool Registry for Routing

**Choice:** Build `tool_registry: HashMap<String, String>` at startup mapping tool names to server names.

**Initialization Flow:**
1. Spawn each server
2. Call `tools/list` on each server
3. For each tool returned, store `tool_name → server_name` in registry
4. Merge all tool definitions into single list for Claude

**Routing Flow:**
1. Claude calls a tool
2. Look up tool name in registry to get server name
3. Look up server in `mcp_processes` HashMap
4. Send `tools/call` to that server's stdin

**Rationale:**
- O(1) tool-to-server lookup
- Fail fast if tool is unknown
- Supports native tools (like `display_recipe`) by using special "native" server name

**Alternatives Considered:**
- Ask each server until one succeeds: slow, error-prone
- Prefix tool names with server name: breaks Claude's tool calling

### Decision 4: Use Official Fetch Server vs Custom Implementation

**Choice:** Use `@modelcontextprotocol/server-fetch` via uvx.

**Rationale:**
- Battle-tested by Anthropic
- Handles edge cases: robots.txt, chunking, encoding, etc.
- Maintained and updated by official team
- Memory cost (+15-20MB) is acceptable for our 2GB constraint

**Alternatives Considered:**
- Custom Rust tool using reqwest + html2text:
  - Pros: no extra process, ~500KB memory
  - Cons: need to maintain, missing edge case handling
  - Rejected: maintenance burden not worth memory savings

### Decision 5: Sequential Server Initialization

**Choice:** Start servers sequentially (not in parallel) during `AiAgent::start()`.

**Rationale:**
- Simplifies error handling: if server 2 fails, server 1 is already running
- Easier to debug: clear logs of which server failed
- Negligible performance impact: startup happens once per chat session

**Alternatives Considered:**
- Parallel spawning with `join_all`: faster but harder to debug failures

### Decision 6: System Prompt Update Strategy

**Choice:** Add URL extraction guidance to existing system prompt in `chat.rs`, documented under new "Fetching Recipes from URLs" section.

**Example:**
```
## Fetching Recipes from URLs

When the user provides a URL to a recipe:
- Use the `fetch` tool with the URL parameter
- Extract recipe details from the returned markdown
- Use `create_recipe` to save it
- Use `display_recipe` to show it to the user
```

**Rationale:**
- Keeps all tool usage guidance in one place
- Follows existing pattern (image extraction section)
- Claude learns the workflow: fetch → extract → create → display

## Risks / Trade-offs

### Risk: Increased Memory Usage
**Impact:** +15-20MB for Python fetch server
**Mitigation:** Acceptable for 2GB NAS. Monitor in production. If needed, can switch to custom Rust implementation later.

### Risk: Server Crash Handling
**Impact:** If one server crashes, tool calls to that server fail
**Mitigation:** Initial version: fail loudly with error message. Future: per-server health checks and restart logic.

### Risk: Tool Name Conflicts
**Impact:** If two servers expose tools with the same name, second one overwrites in registry
**Mitigation:** Initial version: last-write-wins. Log warning if conflict detected. Future: namespace tools by server (e.g., `recipes:create`, `fetch:get`).

### Risk: Initialization Race Condition
**Impact:** If chat request arrives during server startup, calls fail
**Mitigation:** `AiAgent::chat()` checks if processes exist and calls `start()` if needed (already implemented).

### Trade-off: Complexity vs Flexibility
**Trade-off:** Multi-server architecture is more complex than single server
**Justification:** Enables official fetch server (better long-term) and sets foundation for future MCP integrations (e.g., search, database tools).

### Trade-off: Python Dependency
**Trade-off:** Adds Python runtime to Docker image (~100MB)
**Justification:** Python is already common in Docker. Alternative (custom Rust) has higher maintenance cost.

## Migration Plan

### Deployment Steps

1. **Add Python to Dockerfile:**
   ```dockerfile
   RUN apk add --no-cache python3 py3-pip
   RUN pip3 install --no-cache-dir uv
   ```

2. **Update `AiAgent` code:** Refactor to support multiple servers (see tasks.md)

3. **Update `ChatState` configuration:** Add fetch server to config

4. **Test locally:** Verify both servers start and tools work

5. **Deploy to NAS:** Standard git tag deploy (CI/CD)

6. **Verify in production:** Test URL fetching with real recipe sites

### Rollback Strategy

If issues arise:
- Remove fetch server from config (keeps multi-server architecture)
- Or revert entire change via git (previous commit still has single-server code)

No data migration needed (pure code change).

## Open Questions

**Q:** Should we validate that tool names are unique across servers?
**A:** Yes - log warning if duplicate detected during initialization. For v1, last-write-wins in registry.

**Q:** How to handle server that fails to initialize?
**A:** For v1: fail entire `AiAgent::start()`. Future: allow partial startup with degraded functionality.

**Q:** Should fetch tool respect robots.txt by default?
**A:** Yes - official server does this. Family use case is ethical scraping. Can disable with `--ignore-robots-txt` if needed for specific sites.
