## Context

Recipe Vault provides an API server and MCP server for recipe management. Users can interact with recipes through Claude Desktop + MCP, but this requires local installation and configuration.

This change adds a browser-based chat interface that replicates the Claude Desktop experience, allowing users to manage recipes through natural language conversation from any device with a browser.

The existing infrastructure includes:
- REST API (`/api/recipes/*`) with SQLite backend
- MCP server binary (`recipe-vault-mcp`) that wraps the API
- API key authentication for secure access

## Goals / Non-Goals

**Goals:**
- Provide a web-based chat interface for recipe management
- Integrate with Claude API for natural language understanding
- Connect to existing MCP server for tool execution
- Stream responses in real-time via SSE
- Maintain conversation context within a browser session
- Reuse existing authentication mechanism

**Non-Goals:**
- Conversation persistence across page refreshes (future change)
- Cooking session / step-by-step mode (future change)
- Voice input/output (future change)
- Token usage tracking or budgets
- Mobile-optimized kitchen UI (future change)

## Decisions

### Decision 1: Custom AI Layer vs claude-agent Crate

**Choice**: Build a custom AI layer (`src/ai/`) with direct Anthropic API integration and MCP client.

**Alternatives Considered**:
- Use `claude-agent` crate as proposed
- Use `rmcp` crate for MCP only

**Rationale**: Building a custom layer provides:
- Full control over the agent loop and tool execution
- Direct MCP stdio communication without extra dependencies
- Flexibility to support both Anthropic and OpenAI providers
- Better debugging and logging visibility

### Decision 2: MCP Communication Protocol

**Choice**: Spawn MCP binary as child process, communicate via JSON-RPC over stdio.

**Rationale**: This mirrors how Claude Desktop connects to MCP servers:
- Simple, proven approach
- Reuses existing MCP binary without modification
- Process isolation for stability
- Easy to recover from MCP crashes by respawning

### Decision 3: Conversation State Management

**Choice**: In-memory HashMap with UUID session IDs, cleared on server restart.

**Alternatives Considered**:
- Database persistence (SQLite)
- Redis/external cache
- Stateless (no conversation context)

**Rationale**: In-memory is simplest for MVP:
- No additional infrastructure needed
- Acceptable that conversations reset on page refresh
- Easy to upgrade to persistence later
- Sufficient for home/personal use case

### Decision 4: Response Streaming

**Choice**: Server-Sent Events (SSE) with typed event streams.

**Event Types**:
- `chunk`: Text content from Claude
- `tool_use`: MCP tool invocation notification
- `done`: Completion with conversation ID
- `error`: Error with recovery flag

**Alternatives Considered**:
- WebSockets (bidirectional)
- Long polling
- Non-streaming JSON response

**Rationale**: SSE is ideal for server-push scenarios:
- Native browser support (EventSource API)
- Works with htmx SSE extension
- Simpler than WebSockets for unidirectional streaming
- HTTP/2 compatible

### Decision 5: Frontend Technology

**Choice**: Vanilla HTML + htmx + minimal JavaScript.

**Alternatives Considered**:
- React/Vue/Svelte SPA
- Server-side templates (Askama)
- WebComponents

**Rationale**: No build step, minimal dependencies:
- Single HTML page embedded in Rust binary
- htmx handles form submission and SSE
- Custom JS only for SSE parsing and markdown rendering
- Fast initial load, works everywhere

### Decision 6: Authentication

**Choice**: Reuse existing X-API-Key header authentication.

**Rationale**: Consistent with REST API:
- Single authentication mechanism
- API key stored in localStorage on client
- Same key works for direct API access and chat
- Simple to add session-based auth later if needed

## Risks / Trade-offs

### Risk: MCP Process Crashes
**Impact**: Chat becomes unavailable until restart.
**Mitigation**: Agent auto-restarts MCP process on next request. Error message shown to user with "recoverable: true" flag.

### Risk: Context Window Overflow
**Impact**: Long conversations may exceed Claude's context limit.
**Mitigation**: Currently not implemented. Future: truncate oldest messages while preserving system prompt and recent context.

### Risk: Non-Streaming LLM Responses
**Impact**: Full response sent as single chunk instead of token-by-token streaming.
**Mitigation**: Acceptable for MVP. Can be improved by modifying LlmProvider to use streaming API. UI still shows progressive rendering via SSE events.

### Trade-off: In-Memory Sessions
**Accepted**: Conversations lost on server restart or page refresh.
**Benefit**: Simpler implementation, no database schema changes.
**Future**: Add optional persistence when cooking session mode is implemented.

### Trade-off: Embedded HTML
**Accepted**: UI changes require Rust recompilation.
**Benefit**: Single binary deployment, no static file serving needed.
**Future**: Could externalize to templates if frequent UI iteration needed.
