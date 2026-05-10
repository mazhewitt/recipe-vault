## MODIFIED Requirements

### Requirement: Chat Message Handling

The system SHALL accept chat messages via API and return AI responses using the configured LLM provider. Messages MAY include optional image attachments alongside text.

#### Scenario: Send message and receive response
- **WHEN** a user sends a message via POST /api/chat
- **THEN** the message is sent to the configured LLM provider
- **AND** the provider's response is streamed back
- **AND** the response includes any tool use results

#### Scenario: Send message with image attachment
- **WHEN** a user sends a message via POST /api/chat with an image field
- **THEN** the message text and image are both sent to the configured LLM provider
- **AND** the provider can see and analyze the image content
- **AND** the response may reference or extract data from the image
- **AND** the response is streamed back

#### Scenario: Message with tool use
- **WHEN** a user asks "What recipes do I have?"
- **AND** the configured LLM provider determines it needs to call list_recipes
- **THEN** the MCP tool is invoked
- **AND** the tool result is incorporated into the provider's response
- **AND** the user sees the recipe list in the response

#### Scenario: LLM returns text alongside tool calls
- **WHEN** the configured LLM provider returns both text and tool calls in a single response
- **THEN** the agent loop SHALL execute the tool calls
- **AND** send the tool results back to the provider
- **AND** continue the loop so the provider can produce a final response incorporating tool output
- **AND** the final response text shown to the user is from the provider's response after seeing tool results
