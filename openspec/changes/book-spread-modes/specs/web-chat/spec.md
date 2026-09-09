## MODIFIED Requirements

### Requirement: Web User Interface

The system SHALL provide a web-based chat interface in which the user writes notes into the recipe book and AI replies render as margin notes on the open page; the full thread **for the open recipe** is available from the Notes view.

#### Scenario: Send message via UI
- **WHEN** a user types a note and presses Enter or taps send
- **THEN** the note is sent to the API
- **AND** it is stored in the thread as a user entry and appears in the Notes view without a speaker prefix

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
- **WHEN** the viewport is wider than 1024px and a recipe is displayed in `cook` mode
- **THEN** the left page shows the ingredients and the right page shows the method, with no margin column
- **AND** a reply is pinned to the top corner of the method page as a single slip, so a note written while cooking still gets a visible answer
- **WHEN** the viewport is wider than 1024px and a recipe is displayed in `contents` or `notes` mode
- **THEN** the right page is a two-column grid with the recipe content beside a 150px margin column
- **WHEN** the viewport is 1024px or narrower and wider than 600px
- **THEN** the margin column collapses and notes render beneath the right page content
- **WHEN** the viewport is 600px or narrower
- **THEN** a single page with Ingredients / Method / Notes tabs is shown and the last three notes for the open recipe render beneath the active tab's content

#### Scenario: Reply renders as a margin note
- **WHEN** a recipe is displayed and an AI reply completes
- **THEN** the reply is rendered as markdown inside a `.margin-note[data-kind="reply"]` element in `#page-margin`
- **AND** the note uses the handwritten font in the biro colour

#### Scenario: Margin shows the last three notes
- **WHEN** more than three reply or status notes exist for the open recipe
- **THEN** only the three most recent of that recipe's notes are rendered in `#page-margin`
- **AND** all entries remain available from the thread store and the Notes view

#### Scenario: Reply on the contents page renders as a sticky note
- **WHEN** the contents page is displayed and an AI reply completes
- **THEN** the latest reply is rendered as a single `.sticky-note` pinned to the top of the right page (or beneath the contents on phones)
- **AND** earlier notes are not shown until a recipe is opened

#### Scenario: Timer confirmation renders as a status line
- **WHEN** a `timer_start` event is received
- **THEN** the timer starts as today
- **AND** a status line such as "Timer set: Marinate chicken, 30 min" appears in `#page-margin`

#### Scenario: Notes tab shows the full thread
- **WHEN** the user opens the Notes view (the left-edge Notes tab on desktop, the paper tab on phone)
- **THEN** it lists every user note, reply and status line written while that recipe was open, in order
- **AND** notes belonging to other recipes are not shown

#### Scenario: Notes view with no recipe open
- **WHEN** the user opens the Notes view while no recipe is displayed
- **THEN** it lists the book-level thread: every entry written while the contents or a meal plan was displayed

## ADDED Requirements

### Requirement: Notes are scoped to the recipe they were written under

Every thread entry SHALL record the recipe that was open when its turn began, and the margin and Notes view SHALL show only the entries belonging to the recipe currently displayed.

#### Scenario: Note is stamped at turn start
- **WHEN** the user sends a note
- **THEN** the user entry and every reply, status line and error produced by that turn are stamped with the recipe id that was displayed at the moment the note was sent

#### Scenario: Reply arriving after navigation stays with its recipe
- **WHEN** the user sends a note about recipe A, navigates to recipe B, and A's reply then completes
- **THEN** the reply is filed under recipe A
- **AND** it does not appear in recipe B's margin or Notes view

#### Scenario: Notes written while browsing form the book thread
- **WHEN** the user sends a note while the contents page or a meal plan is displayed
- **THEN** the entries for that turn are filed under the book-level thread rather than any recipe

#### Scenario: A recipe created mid-turn does not claim the turn's notes
- **WHEN** a turn creates a recipe and then displays it
- **THEN** that turn's entries remain on the book-level thread, because they were written before the recipe existed

#### Scenario: Server-side conversation history is unaffected
- **WHEN** notes are filtered for display
- **THEN** the conversation sent to the LLM still contains the whole session history
- **AND** the AI can refer to anything said earlier in the session regardless of which recipe is open

#### Scenario: Empty thread for a recipe
- **WHEN** the Notes view is opened for a recipe with no notes
- **THEN** it shows the empty-thread message rather than another recipe's notes
