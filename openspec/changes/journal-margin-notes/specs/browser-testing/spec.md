## MODIFIED Requirements

### Requirement: Chat UI can be tested automatically

The system SHALL provide Playwright tests that verify chat input, response display and margin rendering.

#### Scenario: User can send chat message
- **WHEN** user types a message and submits (Enter or button)
- **THEN** the message appears in the chat history with "User:" prefix

#### Scenario: Assistant response displays
- **WHEN** a chat message receives a response from the backend
- **THEN** the response appears in the chat history with "AI:" prefix
- **AND** the same response appears as a margin note on the open page

#### Scenario: Chat triggers recipe display
- **WHEN** user sends a message that triggers `display_recipe` tool
- **THEN** the specified recipe is displayed in the recipe panel

#### Scenario: Assistant reply appears as a margin note
- **WHEN** a recipe is displayed and a chat message receives a response
- **THEN** a `.margin-note[data-kind="reply"]` containing the response is visible in `#page-margin`
- **AND** sending four messages leaves at most three notes visible

#### Scenario: AI edit refreshes the page
- **WHEN** the mock LLM answers "halve this recipe" by calling `update_recipe`
- **THEN** the displayed recipe re-renders with the updated servings
- **AND** a one-line margin note describes the change
