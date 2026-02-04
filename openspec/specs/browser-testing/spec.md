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

The system SHALL provide Playwright tests that verify chat input and response display.

#### Scenario: User can send chat message
- **WHEN** user types a message and submits (Enter or button)
- **THEN** the message appears in the chat history with "User:" prefix

#### Scenario: Assistant response displays
- **WHEN** a chat message receives a response from the backend
- **THEN** the response appears in the chat history with "AI:" prefix

#### Scenario: Chat triggers recipe display
- **WHEN** user sends a message that triggers `display_recipe` tool
- **THEN** the specified recipe is displayed in the recipe panel

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
