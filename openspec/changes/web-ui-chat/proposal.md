# Proposal: Web Chat Interface with MCP Recipe Access

## Summary

Add a web-based chat interface that connects to Claude API with MCP integration, replicating the Claude Desktop experience for recipe management in a browser. This is the foundation for future cooking assistance features.

## Motivation

### Current State
- Recipe Vault works great with Claude Desktop + MCP
- Users can ask Claude to list recipes, get details, create new ones
- This requires Claude Desktop and MCP configuration

### Goal for This Change
Replicate the Claude Desktop + MCP experience in a web browser:
- Chat with Claude in a web UI
- Claude has access to recipe-vault MCP tools
- Same capabilities: list, get, create, update, delete recipes
- Works on any device with a browser

### What This Enables
Once we have browser-based chat with MCP working, we can incrementally add:
- Cooking session mode (future change)
- Kitchen-optimized UI (future change)
- Voice input (future change)

## Proposed Solution

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Web Browser                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Simple Chat UI                                  │   │
│  │  - Message input                                 │   │
│  │  - Conversation display                          │   │
│  │  - Streaming responses                           │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                              │ HTTP
                              ▼
┌─────────────────────────────────────────────────────────┐
│                 Recipe Vault Server                      │
│                                                          │
│  ┌─────────────┐    ┌─────────────────────────────┐    │
│  │  Chat       │    │  AI Layer                    │    │
│  │  Endpoint   │───▶│  (claude-agent + MCP client) │    │
│  │  /api/chat  │    │                              │    │
│  └─────────────┘    └──────────────┬──────────────┘    │
│                                     │                    │
│                                     │ MCP (stdio)        │
│                                     ▼                    │
│                     ┌─────────────────────────────┐     │
│                     │  recipe-vault-mcp           │     │
│                     │  (existing binary)          │     │
│                     └──────────────┬──────────────┘     │
│                                     │                    │
│                                     ▼                    │
│                     ┌─────────────────────────────┐     │
│                     │  SQLite Database            │     │
│                     └─────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### Key Points

1. **Reuse existing MCP server**: The `recipe-vault-mcp` binary already implements all recipe tools. We connect to it via stdio, just like Claude Desktop does.

2. **claude-agent as orchestrator**: Handles Claude API calls AND MCP tool execution in a unified way.

3. **Simple chat UI**: No cooking session logic yet - just a conversation interface.

4. **Stateless (for now)**: Each page load starts fresh. Conversation persistence comes later.

## Scope

### In Scope
- Chat endpoint that accepts messages and streams responses
- MCP client that spawns and communicates with `recipe-vault-mcp`
- Claude API integration with tool use
- Basic web UI for chatting
- SSE streaming for responses

### Explicitly Out of Scope (Future Changes)
- Cooking session / step-by-step mode
- Conversation persistence across page loads
- Kitchen-optimized mobile UI
- Voice input/output
- Token budgets and usage tracking

## Success Criteria

1. User can open web UI and ask "What recipes do I have?"
2. Claude responds with recipe list (fetched via MCP)
3. User can ask "Show me the chicken curry recipe"
4. Claude responds with full recipe details
5. User can ask "Create a new recipe for pasta..." 
6. Claude creates it via MCP and confirms
7. Responses stream in real-time (not all-at-once)

## Technical Approach

### MCP Integration via claude-agent

The `claude-agent` crate supports MCP servers. We configure it to spawn our existing `recipe-vault-mcp` binary:

```rust
use claude_agent::{Agent, McpServerConfig};

let agent = Agent::builder()
    .model("claude-sonnet-4-5")
    .mcp_server(McpServerConfig {
        command: "./target/release/recipe-vault-mcp",
        args: vec![],
        env: vec![
            ("API_BASE_URL", "http://localhost:3000"),
            ("API_KEY", api_key),
        ],
    })
    .build()
    .await?;
```

### Chat Endpoint

```
POST /api/chat
Content-Type: application/json

{
  "message": "What recipes do I have?"
}

Response: text/event-stream (SSE)

event: chunk
data: {"text": "Let me check your recipes..."}

event: tool_use
data: {"tool": "list_recipes", "status": "calling"}

event: chunk  
data: {"text": "You have 5 recipes: ..."}

event: done
data: {"tokens_used": 250}
```

### Web UI

Minimal HTML + htmx:
- Text input for messages
- Submit button
- Conversation display area
- SSE connection for streaming

No framework, no build step - just server-rendered templates.

## Estimated Effort

| Component | Estimate |
|-----------|----------|
| MCP client setup with claude-agent | 3 hours |
| Chat endpoint with streaming | 3 hours |
| Web UI (basic chat interface) | 3 hours |
| Testing & debugging MCP integration | 3 hours |
| **Total** | ~12 hours (~1.5 days) |

## Risks

| Risk | Mitigation |
|------|------------|
| claude-agent MCP support immature | Fall back to rmcp crate directly |
| MCP stdio communication issues | Extensive logging, test with simple tools first |
| Streaming complexity | Start with non-streaming, add SSE after basics work |

## Open Questions

1. **Conversation memory within session**: Should we maintain conversation history for the duration of a browser session (in-memory), or truly stateless per request?
   - *Recommendation*: In-memory session (lost on page refresh is fine for MVP)

2. **Authentication**: Reuse existing API key auth, or allow unauthenticated access for home use?
   - *Recommendation*: Reuse API key for consistency, can relax later

## Future Changes (Enabled by This)

After this change is complete, we can incrementally add:

1. **Conversation persistence** - Save chat history to database
2. **Cooking session mode** - Recipe-focused UI with step tracking
3. **Kitchen UI** - Mobile-optimized, large touch targets
4. **Voice interface** - Browser speech recognition
