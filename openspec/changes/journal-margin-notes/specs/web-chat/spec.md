## MODIFIED Requirements

### Requirement: Web User Interface

The system SHALL provide a web-based chat interface in which AI replies render as margin notes on the open page of the recipe book, with the notepad retained as a transcript until the book-only layout ships.

#### Scenario: Send message via UI
- **WHEN** a user types a message and clicks send (or presses Enter)
- **THEN** the message is sent to the API
- **AND** it appears in the notepad transcript
- **AND** it is stored in the margin-notes thread as a user entry (not drawn in the margin)

#### Scenario: Display streaming response
- **WHEN** chunks arrive via SSE for an AI response
- **THEN** a single streaming margin note in `#page-margin` grows in place as text arrives
- **AND** the notepad transcript updates in parallel
- **AND** on the `done` event the note loses its streaming state and stays in the margin

#### Scenario: Display tool use
- **WHEN** a `tool_use` event is received
- **THEN** a muted status line naming the tool appears in `#page-margin`
- **AND** the notepad shows the same tool notice

#### Scenario: Handle errors gracefully
- **WHEN** an `error` event is received or the request fails
- **THEN** the error text appears as a margin note styled in the leather red
- **AND** the input is re-enabled so the user can try again

#### Scenario: Display recipe artifact
- **WHEN** a `recipe_artifact` event is received
- **THEN** the book shows the loading skeleton
- **AND** the frontend fetches recipe data from /api/recipes/:id
- **AND** renders the recipe when the fetch completes, leaving `#page-margin` and its notes in place

#### Scenario: Responsive layout with artifact
- **WHEN** the viewport is wider than 1024px and a recipe is displayed
- **THEN** the right page is a two-column grid with the recipe content beside a 150px margin column
- **WHEN** the viewport is 1024px or narrower and wider than 600px
- **THEN** the margin column collapses and notes render beneath the right page content
- **WHEN** the viewport is 600px or narrower
- **THEN** the notepad and book keep their existing Book/Chat tab layout and margin notes are not shown

#### Scenario: Reply renders as a margin note
- **WHEN** a recipe is displayed and an AI reply completes
- **THEN** the reply is rendered as markdown inside a `.margin-note[data-kind="reply"]` element in `#page-margin`
- **AND** the note uses the handwritten font in the biro colour

#### Scenario: Margin shows the last three notes
- **WHEN** more than three reply or status notes exist in the thread
- **THEN** only the three most recent are rendered in `#page-margin`
- **AND** all entries remain available from the thread store

#### Scenario: Reply on the contents page renders as a sticky note
- **WHEN** the contents page is displayed and an AI reply completes
- **THEN** the latest reply is rendered as a single `.sticky-note` pinned to the top of the right page
- **AND** earlier notes are not shown until a recipe is opened

#### Scenario: Timer confirmation renders as a status line
- **WHEN** a `timer_start` event is received
- **THEN** the timer starts as today
- **AND** a status line such as "Timer set: Marinate chicken, 30 min" appears in `#page-margin`

### Requirement: Recipe Artifact Event Handling

The system SHALL handle recipe_artifact SSE events from the chat API so that the page always shows the current version of the recipe.

#### Scenario: Parse recipe artifact event
- **WHEN** a recipe_artifact SSE event is received
- **THEN** the recipe_id is extracted from the event data
- **AND** the panel shows loading state immediately

#### Scenario: Fetch recipe data
- **WHEN** a recipe_artifact event triggers a fetch
- **THEN** the frontend clears the prefetch cache
- **AND** calls GET /api/recipes/:id with credentials: same-origin
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

#### Scenario: Duplicate ids within one turn fetch once
- **WHEN** two recipe_artifact events with the same recipe_id arrive during a single chat turn
- **THEN** the recipe is fetched and rendered once
- **AND** the second event does not trigger another page turn

## ADDED Requirements

### Requirement: Classic notepad fallback

The system SHALL let a user disable margin rendering with a browser-local flag while the notepad still exists.

#### Scenario: Flag disables margin rendering
- **WHEN** `localStorage` contains `rv-ui` = `classic` at page load
- **THEN** no notes are rendered into `#page-margin`
- **AND** the notepad transcript behaves exactly as before this change

#### Scenario: Flag absent or unreadable
- **WHEN** `localStorage` has no `rv-ui` entry or reading it throws
- **THEN** margin rendering is enabled
