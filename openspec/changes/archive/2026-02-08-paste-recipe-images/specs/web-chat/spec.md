# Web Chat Specification (Delta)

## MODIFIED Requirements

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

## Data Types

### ChatRequest
```
ChatRequest {
    message: String
    conversation_id: Option<String>
    image: Option<ImageAttachment>    // ADDED: optional image attachment
}
```

### ImageAttachment
```
ImageAttachment {
    data: String           // base64-encoded image data (without data URL prefix)
    media_type: String     // MIME type (e.g., "image/jpeg", "image/png")
}
```

### Message (User variant updated)
```
Message (enum) {
    User {
        content: Vec<ContentBlock>    // CHANGED: was String, now Vec<ContentBlock>
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
