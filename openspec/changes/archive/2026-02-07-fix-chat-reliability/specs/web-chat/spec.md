## MODIFIED Requirements

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

### Requirement: Chat Message Handling

The system SHALL accept chat messages via API and return AI responses.

#### Scenario: Send message and receive response
- **WHEN** a user sends a message via POST /api/chat
- **THEN** the message is sent to Claude API
- **AND** Claude's response is streamed back
- **AND** the response includes any tool use results

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
