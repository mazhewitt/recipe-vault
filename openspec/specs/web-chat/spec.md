# Web Chat Specification

## Purpose

The Web Chat feature provides a browser-based interface for conversing with Claude, with Claude having access to Recipe Vault tools via MCP. This replicates the Claude Desktop + MCP experience in a web browser.

## Requirements

### Requirement: Chat Message Handling

The system SHALL accept chat messages via API and return AI responses.

#### Scenario: Send message and receive response
- GIVEN the chat endpoint is available
- WHEN a user sends a message via POST /api/chat
- THEN the message is sent to Claude API
- AND Claude's response is streamed back
- AND the response includes any tool use results

#### Scenario: Message with tool use
- GIVEN a user asks "What recipes do I have?"
- WHEN Claude determines it needs to call list_recipes
- THEN the MCP tool is invoked
- AND the tool result is incorporated into Claude's response
- AND the user sees the recipe list in the response

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

The system SHALL maintain conversation context within a browser session.

#### Scenario: Follow-up questions
- GIVEN a user has asked about a recipe
- WHEN they ask a follow-up question like "How long does it take?"
- THEN Claude understands "it" refers to the previous recipe
- AND responds with relevant timing information

#### Scenario: New session
- GIVEN a user refreshes the page
- WHEN they send a new message
- THEN conversation history is cleared
- AND Claude has no memory of previous messages

#### Scenario: Context window management
- GIVEN a conversation has many messages
- WHEN a new message is sent
- THEN older messages are truncated if needed
- AND the most recent context is preserved

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

### Requirement: Authentication

The system SHALL require authentication for chat access.

#### Scenario: Valid API key
- GIVEN a request includes a valid X-API-Key header
- WHEN the chat endpoint is called
- THEN the request is processed normally

#### Scenario: Missing API key
- GIVEN a request has no API key
- WHEN the chat endpoint is called
- THEN a 401 Unauthorized response is returned
- AND the response indicates the key is required

#### Scenario: Web UI authentication
- GIVEN a user accesses the chat web UI
- WHEN they have not provided credentials
- THEN they are prompted for the API key
- OR the key is read from a cookie/session

## Data Types

### ChatRequest
```
ChatRequest {
    message: String
    conversation_id: Option<String>
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
