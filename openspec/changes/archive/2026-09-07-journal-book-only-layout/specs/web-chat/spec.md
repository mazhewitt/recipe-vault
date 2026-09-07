## MODIFIED Requirements

### Requirement: Web User Interface

The system SHALL provide a web-based chat interface in which the user writes notes into the recipe book and AI replies render as margin notes on the open page; the full thread is available from the Notes tab.

#### Scenario: Send message via UI
- **WHEN** a user types a note and presses Enter or taps send
- **THEN** the note is sent to the API
- **AND** it is stored in the thread as a user entry and appears in the Notes tab without a speaker prefix

#### Scenario: Display streaming response
- **WHEN** chunks arrive via SSE for an AI response
- **THEN** a single streaming margin note in `#page-margin` grows in place as text arrives
- **AND** on the `done` event the note loses its streaming state and stays in the margin

#### Scenario: Display tool use
- **WHEN** a `tool_use` event is received
- **THEN** a muted status line naming the tool appears in `#page-margin`

#### Scenario: Handle errors gracefully
- **WHEN** an `error` event is received or the request fails
- **THEN** the error text appears as a margin note styled in the leather red
- **AND** the note input is re-enabled so the user can try again

#### Scenario: Display recipe artifact
- **WHEN** a `recipe_artifact` event is received
- **THEN** the right page shows the loading skeleton
- **AND** the frontend fetches recipe data from /api/recipes/:id
- **AND** renders the recipe on the right page when the fetch completes, leaving `#page-margin` and its notes in place

#### Scenario: Responsive layout with artifact
- **WHEN** the viewport is wider than 1024px and a recipe is displayed
- **THEN** the right page is a two-column grid with the recipe content beside a 150px margin column and the contents on the left page
- **WHEN** the viewport is 1024px or narrower and wider than 600px
- **THEN** the margin column collapses and notes render beneath the right page content
- **WHEN** the viewport is 600px or narrower
- **THEN** a single page with Ingredients / Method / Notes tabs is shown and the last three notes render beneath the active tab's content

#### Scenario: Reply renders as a margin note
- **WHEN** a recipe is displayed and an AI reply completes
- **THEN** the reply is rendered as markdown inside a `.margin-note[data-kind="reply"]` element in `#page-margin`
- **AND** the note uses the handwritten font in the biro colour

#### Scenario: Margin shows the last three notes
- **WHEN** more than three reply or status notes exist in the thread
- **THEN** only the three most recent are rendered in `#page-margin`
- **AND** all entries remain available from the thread store and the Notes tab

#### Scenario: Reply on the contents page renders as a sticky note
- **WHEN** the contents page is displayed and an AI reply completes
- **THEN** the latest reply is rendered as a single `.sticky-note` pinned to the top of the right page (or beneath the contents on phones)
- **AND** earlier notes are not shown until a recipe is opened

#### Scenario: Timer confirmation renders as a status line
- **WHEN** a `timer_start` event is received
- **THEN** the timer starts as today
- **AND** a status line such as "Timer set: Marinate chicken, 30 min" appears in `#page-margin`

#### Scenario: Notes tab shows the full thread
- **WHEN** the user opens the Notes tab (edge tab on desktop, paper tab on phone)
- **THEN** `.notes-thread` lists every user note, reply and status line of the session in order

### Requirement: Recipe Artifact Event Handling

The system SHALL handle recipe_artifact SSE events from the chat API so that the right page always shows the current version of the recipe.

#### Scenario: Parse recipe artifact event
- **WHEN** a recipe_artifact SSE event is received
- **THEN** the recipe_id is extracted from the event data
- **AND** the right page shows the loading state immediately

#### Scenario: Fetch recipe data
- **WHEN** a recipe_artifact event triggers a fetch
- **THEN** the frontend clears the prefetch cache
- **AND** calls GET /api/recipes/:id with credentials: same-origin
- **AND** renders the recipe on the right page on success

#### Scenario: Recipe fetch error handling
- **WHEN** the recipe fetch returns 404
- **THEN** the right page shows "Recipe not found" message
- **AND** the book remains visible (does not hide)

#### Scenario: Recipe panel close button on mobile
- **WHEN** a recipe is displayed on a phone
- **THEN** there is no close button: the recipe is the page, and the note input remains reachable beneath the book
- **AND** the user returns to the contents by tapping the book header or swiping back past the first recipe

#### Scenario: Duplicate ids within one turn fetch once
- **WHEN** two recipe_artifact events with the same recipe_id arrive during a single chat turn
- **THEN** the recipe is fetched and rendered once
- **AND** the second event does not trigger another page turn

## REMOVED Requirements

### Requirement: Classic notepad fallback

**Reason**: The notepad no longer exists, so there is nothing for the `rv-ui=classic` flag to fall back to; margin notes are the only rendering path.

**Migration**: The `localStorage` key `rv-ui` is no longer read. Users who set it need do nothing; it is inert and may be deleted.
