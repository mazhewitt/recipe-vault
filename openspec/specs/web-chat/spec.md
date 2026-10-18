# Web Chat Specification

## Purpose

The Web Chat feature provides a browser-based interface for conversing with Claude, with Claude having access to Recipe Vault tools via MCP. This replicates the Claude Desktop + MCP experience in a web browser.

## Requirements

### Requirement: Chat Message Handling

The system SHALL accept chat messages via API and return AI responses using the configured LLM provider. Messages MAY include optional image attachments alongside text.

#### Scenario: Send message and receive response
- **WHEN** a user sends a message via POST /api/chat
- **THEN** the message is sent to the configured LLM provider
- **AND** the provider's response is streamed back
- **AND** the response includes any tool use results

#### Scenario: Send message with image attachment
- **WHEN** a user sends a message via POST /api/chat with an image field
- **THEN** the message text and image are both sent to the configured LLM provider
- **AND** the provider can see and analyze the image content
- **AND** the response may reference or extract data from the image
- **AND** the response is streamed back

#### Scenario: Message with tool use
- **WHEN** a user asks "What recipes do I have?"
- **AND** the configured LLM provider determines it needs to call list_recipes
- **THEN** the MCP tool is invoked
- **AND** the tool result is incorporated into the provider's response
- **AND** the user sees the recipe list in the response

#### Scenario: LLM returns text alongside tool calls
- **WHEN** the configured LLM provider returns both text and tool calls in a single response
- **THEN** the agent loop SHALL execute the tool calls
- **AND** send the tool results back to the provider
- **AND** continue the loop so the provider can produce a final response incorporating tool output
- **AND** the final response text shown to the user is from the provider's response after seeing tool results

### Requirement: MCP Tool Access

The system SHALL provide Claude with access to Recipe Vault tools via MCP.

#### Scenario: List recipes via MCP
- GIVEN Claude needs to list recipes
- WHEN Claude calls the list_recipes tool
- THEN the MCP server executes the tool
- AND returns the recipe list to Claude

#### Scenario: Get recipe details via MCP
- GIVEN Claude needs to get a specific recipe
- WHEN Claude calls the get_recipe tool with a recipe ID
- THEN the MCP server returns the full recipe
- AND Claude can describe the recipe to the user

#### Scenario: Create recipe via MCP
- GIVEN a user asks Claude to create a recipe
- WHEN Claude calls the create_recipe tool
- THEN the MCP server creates the recipe
- AND returns the created recipe details
- AND Claude confirms creation to the user

#### Scenario: MCP server unavailable
- GIVEN the MCP server process has crashed
- WHEN a user sends a message requiring tool use
- THEN an error is returned to the user
- AND the system attempts to restart the MCP server

### Requirement: Streaming Responses

The system SHALL stream AI responses to the browser in real-time.

#### Scenario: Stream text chunks
- GIVEN Claude is generating a response
- WHEN response tokens are produced
- THEN they are sent as SSE events immediately
- AND the browser displays text as it arrives

#### Scenario: Stream tool use notifications
- GIVEN Claude is calling a tool
- WHEN the tool call begins
- THEN a tool_use event is sent
- AND the browser can show "Searching recipes..." or similar

#### Scenario: Stream completion
- GIVEN Claude has finished responding
- WHEN the response is complete
- THEN a done event is sent
- AND the browser knows the response is finished

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

### Requirement: Authentication

The system SHALL require authentication for chat access.

#### Scenario: Valid session cookie
- **WHEN** a request includes a valid `rv_session` cookie
- **THEN** the chat endpoint processes the request normally

#### Scenario: Valid API key
- **WHEN** a request includes a valid `X-API-Key` header
- **THEN** the chat endpoint processes the request normally

#### Scenario: No valid authentication
- **WHEN** a request has neither valid session cookie nor valid API key
- **THEN** a 401 Unauthorized response is returned

#### Scenario: Web UI authentication
- **WHEN** a user accesses the chat web UI without a valid session
- **THEN** they are shown a login form requesting the family password
- **AND** upon successful login, they are redirected to the chat interface

### Requirement: display_meal_plan Tool
The system SHALL provide a `display_meal_plan` tool that the AI can call to signal a meal plan should be rendered in the artifact panel. The tool SHALL only be called after the user has explicitly confirmed the proposed meal in chat.

#### Scenario: Tool definition included in chat requests
- **WHEN** a chat request is made
- **THEN** the `display_meal_plan` tool SHALL be included in the tools array sent to Claude
- **AND** the schema SHALL specify: `title` (string, required), `guest_count` (integer, optional), `recipes` (array of `{recipe_id: string, role: string}`, required, min 1 item)

#### Scenario: Valid call triggers meal_artifact event
- **WHEN** Claude calls `display_meal_plan` with valid recipe_ids
- **THEN** the backend SHALL validate all recipe_ids exist in the user's family vault
- **AND** emit a `meal_artifact` SSE event with the full meal plan payload
- **AND** return a tool result confirming the display was triggered

#### Scenario: Unknown recipe_id in payload
- **WHEN** Claude calls `display_meal_plan` and one or more recipe_ids do not exist in the vault
- **THEN** if the unknown ID is the centrepiece, the backend SHALL return an error to Claude and NOT emit a `meal_artifact` event
- **AND** if the unknown IDs are non-centrepiece recipes, they SHALL be dropped from the payload and the remaining plan emitted

#### Scenario: meal_artifact SSE event structure
- **WHEN** a `meal_artifact` event is emitted
- **THEN** it SHALL contain: `title` (string), `guest_count` (integer or null), `recipes` (array of `{recipe_id, title, role}`)
- **AND** recipe titles SHALL be resolved server-side so the frontend does not need to fetch each recipe individually for panel rendering

### Requirement: Unified System Prompt

The system SHALL use a single authoritative system prompt for all chat interactions, including guidance on the recipe tag vocabulary and on when a change is shown on the page rather than saved.

#### Scenario: Single prompt source
- **WHEN** the chat agent is initialized
- **THEN** exactly one system prompt is sent to the LLM
- **AND** no default prompt from the agent config competes with the handler prompt

#### Scenario: Prompt includes tool-use triggers
- **WHEN** the system prompt is sent to the LLM
- **THEN** it includes explicit mappings from user intent to required tool calls:
  - Listing/browsing requests → `list_recipes`
  - Viewing/cooking/reading a specific recipe → `display_recipe`
  - After successful recipe creation → `display_recipe` with the new recipe_id
  - Changing a recipe's course, cuisine or diet tags → `update_recipe` with the full `tags` array
  - Scaling for tonight ("make it for 6", "halve it", "just two of us") → `set_servings`
  - Changing or saving the recipe on explicit request ("change the recipe to…", "save it with cream", "update the servings in the book") → `update_recipe`

#### Scenario: Prompt keeps one-off changes off the saved recipe
- **WHEN** the system prompt is sent to the LLM
- **THEN** it tells the model to present a substitution or other one-off change for tonight in the reply, flag notable effects, and end with "Want me to save this as a change to the recipe?", calling `update_recipe` only after a yes or an explicit request
- **AND** it tells the model that after `set_servings` the reply says the page now shows N servings and the saved recipe is unchanged

#### Scenario: Prompt examples match tool schemas
- **WHEN** the system prompt includes tool call examples
- **THEN** the examples use only parameters that exist in the tool schemas
- **AND** no phantom parameters (e.g., `query` on `list_recipes`) are shown

#### Scenario: Prompt describes the tag vocabulary
- **WHEN** the system prompt is sent to the LLM
- **THEN** a "## Tags" section states that tags are lowercase, that exactly one course tag is expected from `main`, `side`, `dessert`, `breakfast`, `snack`, `drink`, `sauce`, `bread`, and that `main` and `dessert` drive the Mains and Sweets contents tabs
- **AND** it explains that `update_recipe` replaces the whole tag set, so the current tags should be read first and re-sent with the change

### Requirement: Long-Conversation Reminder

The system SHALL inject a reminder into messages when conversations reach 5 or more messages.

#### Scenario: Reminder covers all tool-use patterns
- **WHEN** a conversation has 5 or more messages
- **AND** a new user message is sent
- **THEN** a reminder is appended to the user message covering:
  - Use `list_recipes` when the user asks to see their recipes
  - Use `display_recipe` to show recipe details in the side panel
  - After creating a recipe, call `display_recipe` with the new recipe_id
  - Use `set_servings` to scale for tonight, and `update_recipe` only when the user asks to change or save the recipe
  - When guiding cooking, give the first step first
  - Do not output full ingredient lists or steps in chat
- **AND** the reminder does not tell the model to ask for servings first

### Requirement: Logout UI

The system SHALL provide a logout button in the chat interface. On the phone it SHALL appear only on the contents page, so that while a recipe is being cooked it takes no room and sits next to no cooking control. Showing or hiding it SHALL move nothing else on the page.

#### Scenario: Logout button displayed
- **WHEN** a user is viewing the chat interface on a viewport wider than 600px
- **THEN** the `.user-info` chip with its logout link is visible above the book in every view

#### Scenario: Logout stays off the phone's cooking screens
- **WHEN** the viewport is 600px or narrower and a recipe or meal plan is displayed
- **THEN** `.user-info` is not displayed
- **AND** when the contents page is displayed it is visible again

#### Scenario: Hiding the chip on the phone moves nothing
- **WHEN** the viewport is 600px or narrower and the cook opens a recipe from the contents, and then returns to the contents with the Recipe Book header
- **THEN** `.book-container`'s `getBoundingClientRect()` x, y, width and height each stay within 1px of their value on the contents page, on every animation frame of both page turns
- **AND** no `layout-shift` entry whose sources include `.app-container` or `.book-container` is recorded during either turn
- **AND** `.user-info` takes no space in the flow at 600px and narrower: its computed `position` is `absolute` or `fixed`, or it keeps its slot with `visibility: hidden` when not displayed

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

While a chat turn runs, the note input SHALL keep its size and position, its textarea SHALL stay enabled and keep focus, and a second send SHALL be refused until the turn ends. The send button SHALL look unavailable while a send would be refused. Progress SHALL be shown as one line in the reply sticky's slot and SHALL NOT be stored in the thread.

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

#### Scenario: The send button looks unavailable during a turn
- **WHEN** a turn is running, at any viewport
- **THEN** `#send-button[aria-disabled="true"]` has a computed `opacity` of at most 0.5 and a computed `cursor` of `not-allowed`
- **AND** its bounding box is the same as when idle (tolerance 1px), so dimming it moves nothing
- **AND** when the turn ends (`done` or `error`) its computed `opacity` is 1 again and its cursor is `pointer`

#### Scenario: A follow-up typed during a turn is kept, not sent
- **WHEN** the cook types a follow-up and presses Enter while a turn is running, and the turn then ends
- **THEN** the follow-up is still in `#message-input`, unchanged
- **AND** no `POST /api/chat` is made for it until the cook presses Enter or taps send again

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

### Requirement: The reply sticky never hides the end of the page

While a reply sticky is shown, the scroll container whose foot it lies over SHALL gain bottom padding equal to the sticky's height plus its gap above the slip, so the last line of that page can always be scrolled clear of the sticky. The padding SHALL be added at the foot only, so nothing above it moves.

The container is `#page-left` on viewports wider than 600px (the contents, the ingredients or a meal plan's left page) and `#page-right` at 600px and narrower. The clearance is published as the custom property `--sticky-clearance` on `.book-container` (`0px` while no sticky has been shown in the current view).

#### Scenario: The last ingredient clears the sticky
- **WHEN** a recipe with at least 15 ingredients is open in `cook` mode on a viewport wider than 600px, a reply of at least three lines is on the sticky, and `#page-left` is scrolled to its end
- **THEN** the bottom edge of the last `.ingredient-item` is at or above the top edge of `#page-margin`

#### Scenario: The last contents row clears the sticky
- **WHEN** the contents page is displayed with a reply on the sticky and the page under the sticky is scrolled to its end
- **THEN** the bottom edge of the last `.index-recipe-item` on that page is at or above the top edge of `#page-margin`

#### Scenario: The phone footer links clear the sticky
- **WHEN** a recipe is displayed on a viewport 600px wide or narrower with a reply on the sticky and `#page-right` scrolled to its end
- **THEN** the bottom edges of the last `.ingredient-item` (Ingredients tab), of `.footer-prev` and of `.footer-next` are at or above the top edge of `#page-margin`
- **AND** `.footer-prev` and `.footer-next` pass family-recipe-ui's 44×44 hit-area test with the sticky shown

#### Scenario: The clearance moves nothing
- **WHEN** the sticky appears, grows while a reply streams, reaches its height cap, is replaced by the next turn or is dismissed, with the page under it scrolled anywhere, including to its end
- **THEN** every anchor of family-recipe-ui "Nothing on the page moves unless the cook acted on it" keeps its bounding box (tolerance 1px)
- **AND** the scroll container's `scrollTop` is unchanged (tolerance 1px), so the clearance never shrinks below what the current scroll position needs while the view lasts; it returns to `0px` only when a different recipe or the contents is drawn, or the spread mode changes

#### Scenario: No clearance without a sticky
- **WHEN** no reply has been shown on the sticky in the current view, or the spread mode is `notes`, or the phone's Notes tab is active
- **THEN** `--sticky-clearance` is `0px`, and the page's bottom padding is what it was before this requirement (the slip clearance only)

### Requirement: The Notes thread follows the conversation

When the thread is on screen — `notes` mode above 600px, or the phone's Notes tab — its scroll container SHALL keep the newest entry in view as the conversation grows, unless the cook has scrolled up to read earlier entries.

The thread's scroll container is `#page-left` in `notes` mode and `#page-right` on the phone's Notes tab. "Pinned" means the container's `scrollHeight - scrollTop - clientHeight` was at most 48px just before an update.

#### Scenario: The cook's own note scrolls into view
- **WHEN** the thread is on screen, longer than its container and scrolled anywhere, and the cook sends a note
- **THEN** after the note and the in-flight line are rendered, the bottom edge of the last `.notes-thread` entry is within the container's visible box and at or above the top edge of `#note-input`

#### Scenario: A reply arriving is followed while pinned
- **WHEN** the thread is on screen and pinned, and the in-flight line appears, a `chunk` arrives or the turn ends
- **THEN** after each update the container is pinned again: the bottom edge of the last entry is within 48px of the container's visible bottom
- **AND** the four-send sequence that left the latest reply hidden in the 2026-10-18 re-check (`notes-thread-no-autoscroll`) shows the latest reply wholly visible after every send

#### Scenario: Reading earlier notes is not interrupted
- **WHEN** the thread is on screen and the cook has scrolled it so it is not pinned, and a reply chunk arrives or the turn ends
- **THEN** the container's `scrollTop` is unchanged (tolerance 1px)

#### Scenario: Opening the thread shows the newest entry
- **WHEN** the cook switches to `notes` mode above 600px
- **THEN** the container is scrolled so the last entry is wholly visible above the slip
- **AND** on the phone, opening the Notes tab shows the newest entry when an entry was added since the Notes tab was last left or it is opened for the first time on this recipe; otherwise the Notes tab's own saved position is restored, as family-recipe-ui "Phone tabs keep their own scroll position" requires

#### Scenario: Following the thread moves nothing else
- **WHEN** the thread scrolls to follow the conversation
- **THEN** only the thread's container scrolls: `#note-input`, `#message-input` and every right-page anchor keep their bounding boxes (tolerance 1px)

### Requirement: Lost-history notice only for lost conversations

The chat handler SHALL tell the AI that history was lost only when the browser resumes a conversation the server no longer holds. A brand-new conversation SHALL carry no such notice.

#### Scenario: First message of a new chat
- **WHEN** a chat request arrives without a `conversation_id`
- **THEN** the conversation sent to the LLM SHALL NOT contain a notice that the conversation was reset
- **AND** the AI's reply does not open by apologising for a reset that never happened

#### Scenario: Server lost the conversation
- **WHEN** a chat request carries a `conversation_id` the server does not hold (expired, pruned, or the server restarted)
- **THEN** the conversation sent to the LLM SHALL begin with a notice that the prior history is unavailable
- **AND** the AI can briefly say it is continuing from here

#### Scenario: Known conversation
- **WHEN** a chat request carries a `conversation_id` the server holds
- **THEN** no notice SHALL be added

### Requirement: The servings_set event sets the page's stepper

When the model calls `set_servings` successfully, the chat handler SHALL emit a `servings_set` SSE event carrying the servings and the id of the recipe the request was sent from, and the frontend SHALL set that recipe's servings stepper, without re-rendering the recipe and without any database write.

#### Scenario: Event emitted with the current recipe's id
- **WHEN** a chat request with `current_recipe.recipe_id` R leads to a successful `set_servings` call with servings 4
- **THEN** the stream contains `event: servings_set` with data `{"servings":4,"recipe_id":"R"}`, before the reply's `chunk`
- **AND** no `recipe_artifact` event is emitted for it

#### Scenario: No recipe, no event
- **WHEN** a chat request without `current_recipe` leads to a `set_servings` call
- **THEN** no `servings_set` event is emitted

#### Scenario: The open recipe's stepper is set
- **WHEN** the frontend receives `servings_set` with recipe_id R and servings N while R is displayed
- **THEN** `.servings-count` reads N, clamped to the stepper's range, and the quantities are scaled as if the cook had used the stepper, including the `rv-place:<R>` record
- **AND** no request is made to `/api/recipes`

#### Scenario: Another recipe is open
- **WHEN** the frontend receives `servings_set` with recipe_id R while recipe S, the contents or a meal plan is displayed
- **THEN** nothing on the page changes and no `rv-place` record changes

#### Scenario: A recipe without servings
- **WHEN** the frontend receives `servings_set` for the displayed recipe and that recipe has no servings
- **THEN** nothing on the page changes

#### Scenario: Status line
- **WHEN** the model calls `set_servings`
- **THEN** the in-flight status on the reply sticky reads "Adjusting the servings…", never the tool name

### Requirement: The page's servings reach the model

The current-recipe context a chat request carries SHALL include the servings the page shows, so the model can name them and scale from them.

#### Scenario: Servings in the request
- **WHEN** the cook sends a note while recipe R is displayed with its stepper at N
- **THEN** the request body's `current_recipe` carries `"servings": N` alongside `recipe_id` and `title`
- **AND** a recipe without servings sends no `servings` field

#### Scenario: Servings in the model's context
- **WHEN** the chat handler builds the `[Current recipe context]` block from a `current_recipe` with servings N
- **THEN** the block contains the line `page_servings: N`, stating it is what the page shows and may differ from the saved recipe's servings
- **AND** a `current_recipe` without servings produces no such line, and a request without the field still deserialises

## Data Types

### ChatRequest
```
ChatRequest {
    message: String
    conversation_id: Option<String>
    image: Option<ImageAttachment>    // optional image attachment
}
```

### ImageAttachment
```
ImageAttachment {
    data: String           // base64-encoded image data (without data URL prefix)
    media_type: String     // MIME type (e.g., "image/jpeg", "image/png")
}
```

### Message
```
Message (enum) {
    User {
        content: Vec<ContentBlock>    // text and/or images
    }
    Assistant {
        content: Option<String>
        tool_calls: Option<Vec<ToolCall>>
    }
    Tool {
        tool_results: Vec<ToolResult>
    }
}
```

### ContentBlock
```
ContentBlock (enum) {
    Text { text: String }
    Image { source: ImageSource }
}
```

### ImageSource
```
ImageSource {
    source_type: String    // "base64"
    media_type: String     // "image/jpeg", "image/png", etc.
    data: String          // base64-encoded image data
}
```

### SSE Events
```
ChunkEvent {
    event: "chunk"
    data: { text: String }
}

ToolUseEvent {
    event: "tool_use"
    data: { tool: String, status: String }
}

RecipeArtifactEvent {
    event: "recipe_artifact"
    data: { recipe_id: String }
}

DoneEvent {
    event: "done"
    data: { tokens_used: Option<u32> }
}

ErrorEvent {
    event: "error"
    data: { message: String, recoverable: bool }
}
```

### ConversationSession (In-Memory)
```
ConversationSession {
    id: String
    messages: Vec<Message>
    created_at: Instant
    last_activity: Instant
}
```

## Non-Functional Requirements

### Performance
- First token should stream within 2 seconds of request
- UI should remain responsive during streaming

### Reliability
- MCP server crashes should be recoverable
- Network interruptions should be handled gracefully

### Security
- API key must not be exposed to browser (server-side only)
- User input should be sanitized before sending to Claude
