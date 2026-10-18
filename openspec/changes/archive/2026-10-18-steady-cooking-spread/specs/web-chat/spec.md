## MODIFIED Requirements

### Requirement: Recipe Artifact Event Handling

The system SHALL handle recipe_artifact SSE events from the chat API so that the right page always shows the current version of the recipe.

#### Scenario: Parse recipe artifact event
- **WHEN** a recipe_artifact SSE event is received
- **THEN** the recipe_id is extracted from the event data
- **AND** if that recipe is not the one displayed, the right page shows the loading state immediately
- **AND** if it is the recipe already displayed, the page keeps showing it until the refreshed data replaces it in place, with both pages' scroll positions restored

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

### Requirement: Logout UI

The system SHALL provide a logout button in the chat interface. On the phone it SHALL appear only on the contents page, so that while a recipe is being cooked it takes no room and sits next to no cooking control.

#### Scenario: Logout button displayed
- **WHEN** a user is viewing the chat interface on a viewport wider than 600px
- **THEN** the `.user-info` chip with its logout link is visible above the book in every view

#### Scenario: Logout stays off the phone's cooking screens
- **WHEN** the viewport is 600px or narrower and a recipe or meal plan is displayed
- **THEN** `.user-info` is not displayed
- **AND** when the contents page is displayed it is visible again

#### Scenario: Logout button clicked
- **WHEN** a user clicks the logout button
- **THEN** a POST request is made to `/logout`
- **AND** the user is redirected to the login form

### Requirement: Notes are scoped to the recipe they were written under

Every thread entry SHALL record the recipe that was open when its turn began, and the reply sticky and Notes view SHALL show only the entries belonging to the recipe currently displayed.

#### Scenario: Note is stamped at turn start
- **WHEN** the user sends a note
- **THEN** the user entry and every reply and error produced by that turn are stamped with the recipe id that was displayed at the moment the note was sent
- **AND** no status line is stored, so none is stamped

#### Scenario: Reply arriving after navigation stays with its recipe
- **WHEN** the user sends a note about recipe A, navigates to recipe B, and A's reply then completes
- **THEN** the reply is filed under recipe A
- **AND** it does not appear on recipe B's reply sticky or in its Notes view

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

## ADDED Requirements

### Requirement: Notes and replies in the book

The system SHALL provide a web-based chat interface in which the user writes notes into the recipe book and the latest AI reply for the open page renders as a single sticky note directly above the note input; the full thread **for the open recipe** is available from the Notes view.

#### Scenario: Send message via UI
- **WHEN** a user types a note and presses Enter or taps send
- **THEN** the note is sent to the API
- **AND** it is stored in the thread as a user entry and appears in the Notes view without a speaker prefix

#### Scenario: Display streaming response
- **WHEN** chunks arrive via SSE for an AI response
- **THEN** a single streaming note, `#page-margin .margin-note[data-kind="reply"].streaming`, replaces the in-flight line on the reply sticky and grows in place as text arrives
- **AND** on the `done` event the note loses its streaming state and stays on the sticky

#### Scenario: Display tool use
- **WHEN** a `tool_use` event is received
- **THEN** the in-flight line on the reply sticky changes to the cook-language label for that tool ("Status lines speak the cook's language")
- **AND** the tool's name is shown nowhere on the page
- **AND** nothing is added to the thread

#### Scenario: Handle errors gracefully
- **WHEN** an `error` event is received or the request fails
- **THEN** the error text appears on the reply sticky as `.margin-note[data-kind="error"]` styled in the leather red, and is stored in the thread
- **AND** the turn ends: the note input, which was never disabled, accepts the next note and `#send-button` is no longer `aria-disabled`

#### Scenario: Display recipe artifact
- **WHEN** a `recipe_artifact` event is received
- **THEN** the frontend fetches recipe data from /api/recipes/:id
- **AND** if a different recipe was displayed, the right page shows the loading skeleton until the fetch completes and the recipe is rendered
- **AND** if the same recipe was displayed, it is refreshed in place with no skeleton (family-recipe-ui "Refreshing the open recipe keeps the reader's place")
- **AND** in both cases the reply sticky and its note stay in place

#### Scenario: Responsive layout with artifact
- **WHEN** the viewport is wider than 600px and a recipe is displayed in any spread mode
- **THEN** the right page shows the recipe's title, meta line and method with no margin column, and `#page-margin` is not a descendant of `#page-right`
- **AND** a reply is shown on the reply sticky directly above the note input at the foot of the left page, except in `notes` mode where the thread on the left page shows it
- **WHEN** the viewport is 600px or narrower
- **THEN** a single page with Ingredients / Method / Notes tabs is shown, no notes render beneath the active tab's content, and the reply sticky sits directly above the input bar

#### Scenario: Reply renders on the sticky
- **WHEN** a recipe is displayed and an AI reply completes
- **THEN** the reply is rendered as markdown inside a `.margin-note[data-kind="reply"]` element in `#page-margin`
- **AND** the note uses the handwritten font in the biro colour on the sticky-note yellow (`--color-sticky`)

#### Scenario: The sticky shows only the latest reply
- **WHEN** more than one reply or error exists for the open recipe
- **THEN** `#page-margin` holds at most one `.margin-note`: the most recent reply or error of that recipe's thread, or the in-flight line while a turn runs
- **AND** all entries remain available from the thread store and the Notes view

#### Scenario: Reply on the contents page renders as a sticky note
- **WHEN** the contents page is displayed and an AI reply completes
- **THEN** the latest book-level reply is rendered on the same reply sticky directly above the note input, at the foot of the left page (directly above the input bar on phones)
- **AND** it does not intersect `#page-right`, so it covers no entry of the contents' second half, and it can be dismissed like any other reply

#### Scenario: Timer start is confirmed by the pill
- **WHEN** a `timer_start` event is received
- **THEN** the timer starts as today and the timer pill shows it
- **AND** no "Timer set" line is added to the thread or shown on the reply sticky

#### Scenario: Notes tab shows the full thread
- **WHEN** the user opens the Notes view (the left-edge Notes tab on desktop, the paper tab on phone)
- **THEN** it lists every user note, reply and error written while that recipe was open, in order
- **AND** notes belonging to other recipes are not shown

#### Scenario: Notes view with no recipe open
- **WHEN** the user opens the Notes view while no recipe is displayed
- **THEN** it lists the book-level thread: every entry written while the contents or a meal plan was displayed

### Requirement: The latest reply is a sticky note above the input

The latest assistant reply of the thread on display — the displayed recipe's thread, or the book-level thread on the contents page and with a meal plan open — SHALL appear as one sticky note directly above the note input. `#page-margin` is that sticky. It SHALL be note-paper styled, dismissible and height-capped, and it SHALL overlay the foot of the input's own page without moving or resizing any other element.

#### Scenario: Above the input on the wide book
- **WHEN** a reply is shown on a viewport wider than 600px, in any state other than `notes` mode
- **THEN** `#page-margin` is not a descendant of `#page-right` and its computed `position` is `absolute` or `fixed`
- **AND** its bottom edge is between 0 and 8px above the top edge of `#note-input`
- **AND** its left and right edges are inside the bounding box of `#page-left`, so it does not intersect `#page-right`

#### Scenario: Above the input bar on the phone
- **WHEN** a reply is shown on a viewport 600px wide or narrower
- **THEN** `#page-margin`'s bottom edge is between 0 and 8px above the top edge of `#note-input`
- **AND** it lies wholly inside the viewport and overlays the page (computed `position` `absolute` or `fixed`), so the page above it keeps its height

#### Scenario: It looks like a sticky note
- **WHEN** the sticky is shown
- **THEN** it has the `--color-sticky` background, and its reply text is Kalam in the `--color-biro` ink

#### Scenario: Its height is capped
- **WHEN** a reply is taller than 40% of the page the sticky sits on
- **THEN** the sticky's height is at most 40% of `#page-left`'s client height (on the phone, of `#page-right`'s)
- **AND** the rest of the reply scrolls inside the sticky

#### Scenario: It can be dismissed
- **WHEN** the cook taps `#page-margin .note-dismiss` (labelled "Dismiss note"), which passes family-recipe-ui's 44×44 hit-area test
- **THEN** the sticky is no longer displayed
- **AND** the reply is still in the thread and in the Notes view

#### Scenario: A dismissed reply stays dismissed
- **WHEN** the cook dismisses the sticky on recipe A, then opens recipe B and returns to A, or switches spread mode
- **THEN** no sticky is shown on A
- **AND** when a new reply for A arrives, the sticky shows it

#### Scenario: The next turn replaces it
- **WHEN** a sticky is shown and the cook sends another note
- **THEN** the sticky's note is replaced by the new turn's in-flight line

#### Scenario: Not shown beside the full thread
- **WHEN** the spread mode is `notes`, or the phone's Notes tab is active
- **THEN** `#page-margin` is not displayed, because the thread on the same page already shows the reply
- **AND** leaving `notes` mode or the Notes tab shows the latest reply again, unless it was dismissed

#### Scenario: Showing it moves nothing
- **WHEN** the sticky appears, grows while a reply streams, reaches its height cap or is dismissed
- **THEN** no other element's bounding box changes (tolerance 1px), as family-recipe-ui "Nothing on the page moves unless the cook acted on it" requires

### Requirement: A turn keeps the slip still and the input live

While a chat turn runs, the note input SHALL keep its size and position, its textarea SHALL stay enabled and keep focus, and a second send SHALL be refused until the turn ends. Progress SHALL be shown as one line in the reply sticky's slot and SHALL NOT be stored in the thread.

#### Scenario: One in-flight line
- **WHEN** the cook sends a note
- **THEN** `#page-margin` shows one `.margin-note[data-kind="status"]` reading "Thinking…"
- **AND** each `tool_use` event replaces its text with that tool's label
- **AND** the first `chunk` replaces it with the streaming reply
- **AND** the in-flight line is never added to the thread, so the Notes view never lists it

#### Scenario: In-flight line while the thread is open
- **WHEN** a turn runs while the spread mode is `notes` or the phone's Notes tab is active
- **THEN** the in-flight line is shown as the last entry of the visible `.notes-thread`, and is not stored

#### Scenario: The slip does not change height
- **WHEN** the cook sends a one-line note and the turn runs to `done`
- **THEN** `#note-input`'s bounding box is unchanged on every animation frame (tolerance 1px)

#### Scenario: The textarea stays live
- **WHEN** a turn is running
- **THEN** `#message-input` never has the `disabled` attribute
- **AND** if it had focus when the note was sent, `document.activeElement` is `#message-input` throughout the turn and after `done`
- **AND** the cook can type the next note while the reply streams

#### Scenario: A second send waits for the turn
- **WHEN** the cook presses Enter or taps send while a turn is running
- **THEN** no second `POST /api/chat` is made and the typed text stays in the textarea
- **AND** `#send-button` has `aria-disabled="true"` until the turn ends, after which Enter and send work as normal

### Requirement: Status lines speak the cook's language

Progress shown to the cook SHALL say what is happening in the cook's words. Tool names, raw tool arguments and decimal minutes SHALL NOT be shown.

#### Scenario: A label for each tool
- **WHEN** a `tool_use` event arrives during a turn
- **THEN** the in-flight line reads, for the event's tool:

  | tool | line |
  |---|---|
  | `start_timer` | Setting a timer… |
  | `display_recipe` | Opening the recipe… |
  | `update_recipe` | Updating the recipe… |
  | `create_recipe` | Writing it into the book… |
  | `list_recipes`, `get_recipe` | Looking through the book… |
  | `display_meal_plan` | Laying out the meal… |
  | `fetch`, or any other tool whose name contains `fetch` or `search` | Looking it up… |
  | anything else | Working on it… |

#### Scenario: No plumbing reaches the page
- **WHEN** any turn runs, including one that starts a timer, updates a recipe or lists recipes
- **THEN** the text of `#page-margin`, every `.notes-thread` and `.note-input` never contains "Using tool", "Timer set", or a tool identifier such as `start_timer`, `update_recipe` or `list_recipes`

## REMOVED Requirements

### Requirement: Web User Interface

**Reason**: Its central statement, "AI replies render as margin notes on the open page", is superseded by design D3 and D4: the latest reply is one sticky note above the note input, the margin column on the right page is gone, and tool and timer status lines are no longer stored as notes. Its scenarios "Margin shows the last three notes" and "Timer confirmation renders as a status line" now state the opposite of the rule, and a MODIFIED block cannot drop them.

**Migration**: Every scenario moves to "Notes and replies in the book", rewritten where the behaviour changed: "Display tool use" shows a cook-language label instead of the tool name; "Display streaming response", "Handle errors gracefully", "Reply renders on the sticky" (was "Reply renders as a margin note") and "Reply on the contents page renders as a sticky note" use the sticky above the input; "Responsive layout with artifact" drops the margin column and the cook-mode corner slip (book-spread-modes R4); "Margin shows the last three notes" becomes "The sticky shows only the latest reply"; "Timer confirmation renders as a status line" becomes "Timer start is confirmed by the pill". "Send message via UI", "Notes tab shows the full thread" (now without status lines) and "Notes view with no recipe open" carry over. The sticky, the in-flight line and the tool labels are specified in the three requirements added alongside. e2e: `margin-notes.spec.ts` and `chat.spec.ts` assertions on `#page-margin` note counts, `Using tool:` and `Timer set` text are rewritten to these scenarios.
