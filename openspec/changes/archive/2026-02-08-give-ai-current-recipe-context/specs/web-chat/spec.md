## MODIFIED Requirements

### Requirement: Conversation Context

The system SHALL maintain conversation context within a browser session, including the full message sequence of user messages, assistant messages (with any tool calls), tool results, and explicit current recipe context from the UI when available.

#### Scenario: Follow-up questions
- **WHEN** a user has asked about a recipe
- **AND** they ask a follow-up question like "How long does it take?"
- **THEN** Claude understands "it" refers to the previous recipe
- **AND** responds with relevant timing information

#### Scenario: Current recipe context included in chat request
- **WHEN** a recipe is displayed in the UI
- **AND** the user sends a chat message
- **THEN** the conversation context sent to the LLM includes `current_recipe` with `recipe_id`
- **AND** includes `title` when available

#### Scenario: No current recipe context
- **WHEN** the recipe index is displayed
- **AND** the user sends a chat message
- **THEN** the conversation context omits `current_recipe` or sets it to null

#### Scenario: LLM uses current recipe context for details
- **WHEN** `current_recipe` is present in the chat request
- **AND** the user asks about "this recipe"
- **THEN** Claude treats `current_recipe` as the active recipe
- **AND** calls `get_recipe` if it needs full recipe details

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
