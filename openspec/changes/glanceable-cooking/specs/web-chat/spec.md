## MODIFIED Requirements

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

## ADDED Requirements

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
