## MODIFIED Requirements

### Requirement: Web User Interface

The system SHALL provide a web-based chat interface with support for recipe artifact display.

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

## ADDED Requirements

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
