## MODIFIED Requirements

### Requirement: Chat UI can be tested automatically

The system SHALL provide Playwright tests that verify the note input, margin rendering and the Notes thread.

#### Scenario: User can send chat message
- **WHEN** user types a note in `#message-input` and submits (Enter or the send button)
- **THEN** the note appears in `.notes-thread` (Notes tab) as a user entry without a "User:" prefix

#### Scenario: Assistant response displays
- **WHEN** a note receives a response from the backend
- **THEN** the response appears as a `.margin-note[data-kind="reply"]` on the open page without an "AI:" prefix
- **AND** it also appears in `.notes-thread`

#### Scenario: Chat triggers recipe display
- **WHEN** user sends a note that triggers `display_recipe` tool
- **THEN** the specified recipe is displayed on the right page of the book

#### Scenario: Assistant reply appears as a margin note
- **WHEN** a recipe is displayed and a note receives a response
- **THEN** a `.margin-note[data-kind="reply"]` containing the response is visible in `#page-margin`
- **AND** sending four notes leaves at most three notes visible in the margin

#### Scenario: AI edit refreshes the page
- **WHEN** the mock LLM answers "update this recipe" by calling `update_recipe`
- **THEN** the displayed recipe re-renders with the updated servings
- **AND** a one-line margin note describes the change

#### Scenario: AI scaling sets the page's servings
- **WHEN** an 8-serving recipe is displayed and the mock LLM answers "halve this recipe" by calling `set_servings` with 4
- **THEN** `.servings-count` reads "4" and the quantities are scaled, with no re-render of the recipe and no request to `/api/recipes`

#### Scenario: Phone tabs can be tested
- **WHEN** a recipe is displayed in the mobile-chrome project and the Method tab is tapped
- **THEN** `.prep-list` is visible and `.ingredients-list` is hidden
- **AND** tapping Notes shows `.notes-thread`

