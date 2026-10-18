# Browser Testing Specification

## Purpose

The Browser Testing capability provides automated end-to-end (E2E) testing of the Recipe Vault user interface using Playwright. This ensures that user-facing features like recipe browsing and chat work correctly across different browsers.

## Requirements

### Requirement: Recipe navigation can be tested automatically

The system SHALL provide Playwright tests that verify recipe navigation via arrow buttons.

#### Scenario: Next arrow navigates to next recipe
- **WHEN** multiple recipes exist and user clicks the next arrow button
- **THEN** the next recipe is displayed in the recipe panel

#### Scenario: Previous arrow navigates to previous recipe
- **WHEN** user is viewing a recipe (not the first) and clicks the previous arrow button
- **THEN** the previous recipe is displayed in the recipe panel

#### Scenario: Navigation buttons disable at boundaries
- **WHEN** user is viewing the first recipe
- **THEN** the previous arrow button is disabled
- **WHEN** user is viewing the last recipe
- **THEN** the next arrow button is disabled

### Requirement: Recipe display can be tested automatically

The system SHALL provide Playwright tests that verify recipe content renders correctly.

#### Scenario: Recipe title displays
- **WHEN** a recipe is displayed
- **THEN** the recipe title is visible in the recipe panel

#### Scenario: Recipe ingredients display
- **WHEN** a recipe with ingredients is displayed
- **THEN** all ingredients are visible in the ingredients section

#### Scenario: Recipe steps display
- **WHEN** a recipe with steps is displayed
- **THEN** all preparation steps are visible in the preparation section

#### Scenario: Long recipe content scrolls
- **WHEN** a recipe has content that exceeds the visible area
- **THEN** the content is scrollable and all content can be accessed

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

### Requirement: Tests can run against local server

The system SHALL support running Playwright tests against a locally running server.

#### Scenario: Tests connect to local server
- **WHEN** server is running on `http://127.0.0.1:3000` and tests execute
- **THEN** tests successfully interact with the running application

#### Scenario: Tests fail gracefully when server unavailable
- **WHEN** tests execute but server is not running
- **THEN** tests fail with clear error message about connection failure

### Requirement: Tests run in CI pipeline

The CI pipeline SHALL execute Playwright tests and report results.

#### Scenario: CI runs browser tests
- **WHEN** a pull request is opened
- **THEN** Playwright tests execute in the CI environment

#### Scenario: CI installs browser dependencies
- **WHEN** Playwright tests run in CI
- **THEN** required browser binaries are installed automatically
