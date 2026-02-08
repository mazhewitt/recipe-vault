# Web Chat Specification

## Purpose

The Web Chat feature provides a browser-based interface for conversing with Claude, with Claude having access to Recipe Vault tools via MCP. This replicates the Claude Desktop + MCP experience in a web browser.

## Requirements

### Requirement: Chat Message Handling

The system SHALL accept chat messages via API and return AI responses. Messages MAY include optional image attachments alongside text.

#### Scenario: Send message and receive response
- **WHEN** a user sends a message via POST /api/chat
- **THEN** the message is sent to Claude API
- **AND** Claude's response is streamed back
- **AND** the response includes any tool use results

#### Scenario: Send message with image attachment
- **WHEN** a user sends a message via POST /api/chat with an image field
- **THEN** the message text and image are both sent to Claude API
- **AND** Claude can see and analyze the image content
- **AND** Claude's response may reference or extract data from the image
- **AND** the response is streamed back

#### Scenario: Message with tool use
- **WHEN** a user asks "What recipes do I have?"
- **AND** Claude determines it needs to call list_recipes
- **THEN** the MCP tool is invoked
- **AND** the tool result is incorporated into Claude's response
- **AND** the user sees the recipe list in the response

#### Scenario: LLM returns text alongside tool calls
- **WHEN** Claude returns both text and tool calls in a single response
- **THEN** the agent loop SHALL execute the tool calls
- **AND** send the tool results back to the LLM
- **AND** continue the loop so the LLM can produce a final response incorporating tool output
- **AND** the final response text shown to the user is from the LLM's response after seeing tool results

### Requirement: MCP Tool Access

The system SHALL provide Claude with access to Recipe Vault tools via MCP.

#### Scenario: List recipes via MCP
- GIVEN Claude needs to list recipes
- WHEN Claude calls the list_recipes tool
- THEN the MCP server executes the tool
- AND returns the recipe list to Claude

#### Scenario: Get recipe details via MCP
- GIVEN Claude needs to get a specific recipe
- WHEN Claude calls the get_recipe tool with a recipe ID
- THEN the MCP server returns the full recipe
- AND Claude can describe the recipe to the user

#### Scenario: Create recipe via MCP
- GIVEN a user asks Claude to create a recipe
- WHEN Claude calls the create_recipe tool
- THEN the MCP server creates the recipe
- AND returns the created recipe details
- AND Claude confirms creation to the user

#### Scenario: MCP server unavailable
- GIVEN the MCP server process has crashed
- WHEN a user sends a message requiring tool use
- THEN an error is returned to the user
- AND the system attempts to restart the MCP server

### Requirement: Streaming Responses

The system SHALL stream AI responses to the browser in real-time.

#### Scenario: Stream text chunks
- GIVEN Claude is generating a response
- WHEN response tokens are produced
- THEN they are sent as SSE events immediately
- AND the browser displays text as it arrives

#### Scenario: Stream tool use notifications
- GIVEN Claude is calling a tool
- WHEN the tool call begins
- THEN a tool_use event is sent
- AND the browser can show "Searching recipes..." or similar

#### Scenario: Stream completion
- GIVEN Claude has finished responding
- WHEN the response is complete
- THEN a done event is sent
- AND the browser knows the response is finished

### Requirement: Conversation Context

The system SHALL maintain conversation context within a browser session, including the full message sequence of user messages, assistant messages (with any tool calls), and tool results.

#### Scenario: Follow-up questions
- **WHEN** a user has asked about a recipe
- **AND** they ask a follow-up question like "How long does it take?"
- **THEN** Claude understands "it" refers to the previous recipe
- **AND** responds with relevant timing information

#### Scenario: New session
- **WHEN** a user refreshes the page
- **AND** they send a new message
- **THEN** conversation history is cleared
- **AND** Claude has no memory of previous messages

#### Scenario: Context window management
- **WHEN** a conversation has many messages
- **AND** a new message is sent
- **THEN** older messages are truncated if needed
- **AND** the most recent context is preserved

#### Scenario: Tool interactions preserved across turns
- **WHEN** Claude calls `list_recipes` and receives recipe IDs in the tool result
- **AND** the user sends a follow-up message referencing a recipe by name
- **THEN** the conversation history sent to the LLM includes the prior tool call and tool result
- **AND** Claude can use the recipe IDs from the prior tool result without calling `list_recipes` again

#### Scenario: Multiple tool calls preserved
- **WHEN** Claude calls `create_recipe` followed by `display_recipe` in one turn
- **AND** the user sends a follow-up message
- **THEN** both tool calls and their results are present in the conversation history

### Requirement: Web User Interface

The system SHALL provide a web-based chat interface.

#### Scenario: Send message via UI
- GIVEN the chat page is loaded
- WHEN a user types a message and clicks send
- THEN the message is sent to the API
- AND appears in the conversation display

#### Scenario: Display streaming response
- GIVEN an AI response is streaming
- WHEN chunks arrive via SSE
- THEN text appears progressively in the UI
- AND the display scrolls to show new content

#### Scenario: Display tool use
- GIVEN Claude is using a tool
- WHEN a tool_use event is received
- THEN the UI indicates tool activity
- AND the user understands something is happening

#### Scenario: Handle errors gracefully
- GIVEN an error occurs during chat
- WHEN the error event is received
- THEN the UI displays a helpful message
- AND the user can try again

#### Scenario: Display recipe artifact
- GIVEN Claude calls the display_recipe tool
- WHEN a recipe_artifact event is received
- THEN the recipe panel becomes visible with loading state
- AND the frontend fetches recipe data from /api/recipes/:id
- AND renders the recipe when fetch completes

#### Scenario: Responsive layout with artifact
- GIVEN a recipe is being displayed
- WHEN the viewport is desktop-sized (>= 768px)
- THEN chat and recipe panel are side by side
- WHEN the viewport is mobile-sized (< 768px)
- THEN recipe panel overlays the chat with a close button

### Requirement: Recipe Artifact Event Handling

The system SHALL handle recipe_artifact SSE events from the chat API.

#### Scenario: Parse recipe artifact event
- **WHEN** a recipe_artifact SSE event is received
- **THEN** the recipe_id is extracted from the event data
- **AND** the panel shows loading state immediately

#### Scenario: Fetch recipe data
- **WHEN** a recipe_artifact event triggers a fetch
- **THEN** the frontend calls GET /api/recipes/:id with credentials: same-origin
- **AND** populates the panel with recipe content on success

#### Scenario: Recipe fetch error handling
- **WHEN** the recipe fetch returns 404
- **THEN** the panel shows "Recipe not found" message
- **AND** the panel remains visible (does not hide)

#### Scenario: Recipe panel close button on mobile
- **WHEN** viewing on mobile with recipe panel open
- **AND** user clicks the close button
- **THEN** the panel closes
- **AND** the chat is visible again

### Requirement: Authentication

The system SHALL require authentication for chat access.

#### Scenario: Valid session cookie
- **WHEN** a request includes a valid `rv_session` cookie
- **THEN** the chat endpoint processes the request normally

#### Scenario: Valid API key
- **WHEN** a request includes a valid `X-API-Key` header
- **THEN** the chat endpoint processes the request normally

#### Scenario: No valid authentication
- **WHEN** a request has neither valid session cookie nor valid API key
- **THEN** a 401 Unauthorized response is returned

#### Scenario: Web UI authentication
- **WHEN** a user accesses the chat web UI without a valid session
- **THEN** they are shown a login form requesting the family password
- **AND** upon successful login, they are redirected to the chat interface

## ADDED Requirements

### Requirement: Unified System Prompt

The system SHALL use a single authoritative system prompt for all chat interactions.

#### Scenario: Single prompt source
- **WHEN** the chat agent is initialized
- **THEN** exactly one system prompt is sent to the LLM
- **AND** no default prompt from the agent config competes with the handler prompt

#### Scenario: Prompt includes tool-use triggers
- **WHEN** the system prompt is sent to the LLM
- **THEN** it includes explicit mappings from user intent to required tool calls:
  - Listing/browsing requests → `list_recipes`
  - Viewing/cooking/reading a specific recipe → `display_recipe`
  - After successful recipe creation → `display_recipe` with the new recipe_id

#### Scenario: Prompt examples match tool schemas
- **WHEN** the system prompt includes tool call examples
- **THEN** the examples use only parameters that exist in the tool schemas
- **AND** no phantom parameters (e.g., `query` on `list_recipes`) are shown

### Requirement: Long-Conversation Reminder

The system SHALL inject a reminder into messages when conversations reach 5 or more messages.

#### Scenario: Reminder covers all tool-use patterns
- **WHEN** a conversation has 5 or more messages
- **AND** a new user message is sent
- **THEN** a reminder is appended to the user message covering:
  - Use `list_recipes` when the user asks to see their recipes
  - Use `display_recipe` to show recipe details in the side panel
  - After creating a recipe, call `display_recipe` with the new recipe_id
  - Do not output full ingredient lists or steps in chat

### Requirement: Logout UI

The system SHALL provide a logout button in the chat interface.

#### Scenario: Logout button displayed
- **WHEN** a user is viewing the chat interface
- **THEN** a logout button is visible in the header

#### Scenario: Logout button clicked
- **WHEN** a user clicks the logout button
- **THEN** a POST request is made to `/logout`
- **AND** the user is redirected to the login form

## Data Types

### ChatRequest
```
ChatRequest {
    message: String
    conversation_id: Option<String>
    image: Option<ImageAttachment>    // optional image attachment
}
```

### ImageAttachment
```
ImageAttachment {
    data: String           // base64-encoded image data (without data URL prefix)
    media_type: String     // MIME type (e.g., "image/jpeg", "image/png")
}
```

### Message
```
Message (enum) {
    User {
        content: Vec<ContentBlock>    // text and/or images
    }
    Assistant {
        content: Option<String>
        tool_calls: Option<Vec<ToolCall>>
    }
    Tool {
        tool_results: Vec<ToolResult>
    }
}
```

### ContentBlock
```
ContentBlock (enum) {
    Text { text: String }
    Image { source: ImageSource }
}
```

### ImageSource
```
ImageSource {
    source_type: String    // "base64"
    media_type: String     // "image/jpeg", "image/png", etc.
    data: String          // base64-encoded image data
}
```

### SSE Events
```
ChunkEvent {
    event: "chunk"
    data: { text: String }
}

ToolUseEvent {
    event: "tool_use"
    data: { tool: String, status: String }
}

RecipeArtifactEvent {
    event: "recipe_artifact"
    data: { recipe_id: String }
}

DoneEvent {
    event: "done"
    data: { tokens_used: Option<u32> }
}

ErrorEvent {
    event: "error"
    data: { message: String, recoverable: bool }
}
```

### ConversationSession (In-Memory)
```
ConversationSession {
    id: String
    messages: Vec<Message>
    created_at: Instant
    last_activity: Instant
}
```

## Non-Functional Requirements

### Performance
- First token should stream within 2 seconds of request
- UI should remain responsive during streaming

### Reliability
- MCP server crashes should be recoverable
- Network interruptions should be handled gracefully

### Security
- API key must not be exposed to browser (server-side only)
- User input should be sanitized before sending to Claude
