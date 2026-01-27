# Tasks: Web Chat Interface with MCP Recipe Access

## 1. Dependencies & Configuration

- [x] 1.1 Add `claude-agent` dependency to Cargo.toml
  ```toml
  claude-agent = { version = "0.2", features = ["mcp"] }
  ```

- [x] 1.2 Add environment variables to config
  - `ANTHROPIC_API_KEY` - Claude API access
  - `AI_MODEL` - Model to use (default: claude-sonnet-4-5)

- [x] 1.3 Update `.env.example` with new variables

## 2. MCP Client Integration

- [x] 2.1 Create `src/ai/mod.rs` module
  - Module exports
  - Re-export key types

- [x] 2.2 Create `src/ai/client.rs` - Agent setup
  - Initialize `claude-agent` with MCP server config
  - Configure to spawn `recipe-vault-mcp` binary
  - Pass through API_BASE_URL and API_KEY to MCP server
  - Handle agent lifecycle (start/stop)

- [x] 2.3 Create shared agent instance
  - Lazy initialization on first request
  - Or initialize at server startup
  - Handle MCP server process management

- [ ] 2.4 Test MCP connection independently
  - Verify agent can call `list_recipes` tool
  - Verify tool results are returned correctly
  - Log MCP communication for debugging

## 3. Chat API Endpoint

- [x] 3.1 Create `src/handlers/chat.rs` module

- [x] 3.2 Implement `POST /api/chat` endpoint
  - Accept JSON body: `{ "message": "..." }`
  - Accept optional `conversation_id` for session continuity
  - Return SSE stream

- [x] 3.3 Implement conversation session (in-memory)
  - Generate session ID on first message
  - Store conversation history in memory (HashMap)
  - Include history in subsequent requests
  - Clear on timeout or explicit reset

- [x] 3.4 Implement SSE streaming response
  - Stream text chunks as `event: chunk`
  - Send tool use notifications as `event: tool_use`
  - Send completion as `event: done`
  - Handle errors as `event: error`

- [x] 3.5 Wire up to router in `main.rs`
  - Add route: `POST /api/chat`
  - Apply API key authentication

## 4. Web UI

- [x] 4.1 Create `src/handlers/ui.rs` for HTML pages

- [x] 4.2 Create chat page template
  - Route: `GET /chat`
  - Basic HTML structure
  - Include htmx library
  - Include minimal CSS

- [x] 4.3 Implement message input component
  - Text input field
  - Send button
  - Form submission via htmx

- [x] 4.4 Implement conversation display
  - Container for messages
  - User messages styled differently from assistant
  - Auto-scroll to bottom on new messages

- [x] 4.5 Implement SSE handling with htmx
  - Connect to `/api/chat` endpoint
  - Append streamed chunks to display
  - Show tool use indicators (e.g., "Searching recipes...")
  - Handle completion and errors

- [x] 4.6 Add basic styling
  - Clean, readable layout
  - Distinguish user vs assistant messages
  - Loading indicator during response
  - Mobile-responsive (basic)

## 5. Error Handling

- [x] 5.1 Handle MCP server failures
  - Detect if MCP process crashes
  - Return helpful error to user
  - Attempt restart on next request

- [x] 5.2 Handle Claude API errors
  - Rate limiting → "Please wait a moment"
  - API down → "AI service unavailable"
  - Timeout → "Request took too long"

- [x] 5.3 Handle streaming errors
  - Client disconnect → Clean up resources
  - Mid-stream error → Send error event, close stream

## 6. Testing

- [ ] 6.1 Integration test: MCP tool execution
  - Agent can list recipes
  - Agent can get recipe by ID
  - Agent can create recipe

- [ ] 6.2 Integration test: Chat endpoint
  - Returns SSE stream
  - Streams chunks correctly
  - Handles conversation context

- [ ] 6.3 Manual testing checklist
  - [ ] "What recipes do I have?" → Lists recipes
  - [ ] "Show me [recipe name]" → Shows details
  - [ ] "Create a recipe for [X]" → Creates recipe
  - [ ] Follow-up questions use context
  - [ ] Works on mobile browser

## 7. Documentation

- [x] 7.1 Update README.md
  - Document web chat feature
  - Configuration instructions
  - Usage examples

- [x] 7.2 Add inline code documentation
  - Document AI module public interface
  - Document SSE event format
