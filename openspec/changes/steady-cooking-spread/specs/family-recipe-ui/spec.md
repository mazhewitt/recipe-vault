## MODIFIED Requirements

### Requirement: Main layout displays the recipe book alone

The interface SHALL display the recipe book alone, filling the available width, on a dark wood-textured background, with the chat note input attached to the book.

#### Scenario: Default desktop layout

- **WHEN** the user loads the chat page on a viewport wider than 1024px
- **THEN** the recipe book is centred and fills the width (up to its maximum), with no notepad panel
- **AND** the note input sits at the foot of the left page

#### Scenario: Narrow viewport stacks components

- **WHEN** the user loads the chat page on a viewport 1024px wide or narrower but wider than 600px
- **THEN** the book keeps its two-page spread at full width
- **AND** the right page has no margin column and no notes beneath its content: the latest reply is the sticky above the note input (web-chat "The latest reply is a sticky note above the input")
- **AND** the note input remains at the foot of the left page

#### Scenario: Phone layout

- **WHEN** the user loads the chat page on a viewport 600px wide or narrower
- **THEN** a single cream page inside a thin leather frame fills the width, with the book label top-left and the timer pill top-right
- **AND** `.app-container` and `.recipe-book` are as wide as the viewport (tolerance 1px) whatever the page holds, including while a skeleton or an empty page is shown
- **AND** the note input is a cream bar beneath the book with a red send button
- **AND** there is no Book/Chat tab bar

### Requirement: Recipe book displays as open two-page spread with leather cover

The recipe book SHALL render as an open book with a red leather cover frame containing two cream-colored pages side by side; while a recipe is open the left page holds whichever of the ingredients, the conversation or the contents the spread mode selects, and the right page holds the recipe's title, meta line and method.

#### Scenario: Book structure renders correctly

- **WHEN** a recipe is loaded
- **THEN** the book displays with a red leather cover border, visible spine shadow down the center, and two pages (left and right)

#### Scenario: Left page shows ingredients

- **WHEN** a recipe is displayed on a viewport wider than 600px
- **THEN** the left page shows the ingredients in `cook` mode, the open recipe's thread in `notes` mode, and the contents (title, A–Z strip, letter groups, with the current recipe's entry marked `current`) in `contents` mode, as book-spread-modes defines
- **AND** the ingredients are never on the right page

#### Scenario: Right page shows preparation steps

- **WHEN** a recipe is displayed on a viewport wider than 600px, in any spread mode
- **THEN** the right page shows the recipe title with a 96×76 polaroid photo floated to its right (or none), the meta line, a "method:" header and numbered steps where each step number is rendered in Kalam in the leather red and the step text in the serif
- **AND** the right page has no ingredients section and no margin column

#### Scenario: The title takes the width of the page

- **WHEN** a recipe is displayed at any viewport
- **THEN** `.recipe-title-row` contains no `.share-btn` and no `.add-photo-btn`
- **AND** the title wraps by words around the polaroid rather than in a narrow column beside it
- **AND** the title "Granny's Beef Lasagne", with a photo, renders in at most two lines (element height ÷ computed line-height, rounded) at each e2e project's viewport (393px, 810px and 1280px wide)

#### Scenario: Phone shows one page

- **WHEN** a recipe is displayed on a viewport 600px wide or narrower
- **THEN** only the right page is visible, showing the title, polaroid, meta line and the active tab's content one item per line, with ingredient and step text at 17px
- **AND** the footer reads "‹ previous recipe", the page number and "next recipe ›"

### Requirement: Recipe metadata displays with icons

The recipe metadata SHALL display as a single handwritten meta line beneath the recipe title: total time, servings and difficulty (as dots), with prep and cook times shown muted in parentheses when present, and the share and add-photo buttons at the end of the line. The difficulty SHALL occupy a fixed-width slot that is present before its value is known.

#### Scenario: Difficulty renders as filled dots

- **WHEN** a recipe with difficulty level 2 is displayed
- **THEN** the meta line shows a "difficulty" label followed by 2 filled dots and 3 empty dots

#### Scenario: Total time displays when available

- **WHEN** a total time value is derived for a recipe
- **THEN** the meta line shows it formatted as `NN min` (under 60 minutes) or `Xh YY` (60 minutes or more)

#### Scenario: Time values display with clock icons

- **WHEN** a recipe with prep time and/or cook time is displayed
- **THEN** the meta line shows a muted `(prep N · cook M)` group listing whichever values are present, after the other meta items and before the share and add-photo buttons

#### Scenario: Servings display when available

- **WHEN** a recipe with a servings value is displayed
- **THEN** the meta line shows `serves N`

#### Scenario: Total time is omitted when unavailable

- **WHEN** total time or servings is not available for a recipe
- **THEN** that item is not rendered in the meta line
- **AND** the line itself is always rendered, because it carries the difficulty slot and the share and add-photo buttons

#### Scenario: The difficulty slot is reserved

- **WHEN** a recipe whose difficulty is not yet known is displayed
- **THEN** `.recipe-meta-line .meta-difficulty` is present, shows no dots, and is as wide as it is when it holds the label and five dots
- **AND** when the difficulty arrives later, only the slot's contents change: the meta line's height, the bounding box of every other meta item and of every `.prep-step` are unchanged (tolerance 1px)

#### Scenario: Share and photo end the meta line

- **WHEN** a recipe is displayed
- **THEN** `.share-btn` and `.add-photo-btn` are the last two items of `.recipe-meta-line`
- **AND** each has a bounding box of at least 44×44px

### Requirement: Timer widget displays as fixed speech bubble

The timer widget SHALL render as a cream pill clipped to the top edge of the recipe book cover and centred over the spine, positioned relative to the book rather than the viewport, with a clock icon, the timer label and the remaining time in tabular numerals, and a close control with a hit area of at least 44×44px. It SHALL never overlap the page arrows, the Recipe Book header or the user identity pill. On the phone it SHALL sit at the top right of the book frame's header bar.

#### Scenario: Timer renders correctly

- **WHEN** a timer is running on a viewport wider than 600px
- **THEN** the timer widget appears as a cream pill overlapping the top edge of the book cover: its top edge is above the top edge of `.recipe-book` and its bottom edge below it
- **AND** the pill's horizontal centre is within 1px of the spine (the horizontal centre of `.pages-container`)
- **AND** it shows a clock icon, the timer label and the remaining time
- **AND** the pill has no speech-bubble tail

#### Scenario: Timer does not overlap the user pill

- **WHEN** a timer is running at the desktop or tablet breakpoint
- **THEN** the bounding box of the timer pill does not intersect the bounding box of the user identity pill
- **AND** the pill is fully visible within the viewport

#### Scenario: Timer does not overlap the page arrows or the header

- **WHEN** a timer is running at the desktop or tablet breakpoint
- **THEN** the bounding box of `#timer-widget` intersects none of the bounding boxes of `#page-prev`, `#page-next` and `#recipe-book-header`
- **AND** `document.elementFromPoint` at the centre of `#page-next`, and at the centre of `#page-prev`, returns that arrow
- **AND** no point of the `.timer-cancel` hit area lies inside either arrow's bounding box

#### Scenario: Close control is large enough

- **WHEN** the timer pill is visible at any breakpoint
- **THEN** `.timer-cancel` passes the 44×44 hit-area test of "Every control the cook taps has a 44px hit area"

#### Scenario: Compact pill on phone

- **WHEN** a timer is running at the phone breakpoint (600px or narrower)
- **THEN** the pill sits at the top right of the book frame's header bar, opposite the book label, at a height of 30px or less with smaller text and icon
- **AND** its bounding box does not intersect `#recipe-book-header`
- **AND** `.timer-cancel` still passes the 44×44 hit-area test for every sampled point inside the viewport

#### Scenario: Pill width holds steady while counting

- **WHEN** a running timer counts down through ten consecutive ticks
- **THEN** the bounding box of `#timer-widget` is the same after every tick (tolerance 1px)
- **AND** the remaining time renders with `font-variant-numeric: tabular-nums`
- **AND** when the pill switches to its finished state its horizontal centre and its top edge stay where they were (tolerance 1px)

#### Scenario: Pill is hidden when no timer runs

- **WHEN** no timer is running and no finished timer is waiting to be acknowledged
- **THEN** the timer widget is not displayed

### Requirement: Note input lives in the book

The chat input SHALL be a single "note to the cook" control attached to the book, replacing the notepad input. Above 600px it SHALL sit at the foot of the left page in every state of the book. It SHALL NOT change height while a turn runs, and its textarea SHALL grow to at most three lines.

#### Scenario: Desktop note input

- **WHEN** the viewport is wider than 600px
- **THEN** a `.note-input` with a pencil icon, a textarea with placeholder "Write a note to the cook…", a paperclip attach button and the current page number sits at the foot of the left page, in every state book-spread-modes "The note input keeps one position" lists

#### Scenario: Phone note input

- **WHEN** the viewport is 600px wide or narrower
- **THEN** the `.note-input` is a cream bar beneath the book with a red send button, and every control has at least a 44px touch target

#### Scenario: Existing input ids are preserved

- **WHEN** the chat page loads
- **THEN** the elements `#message-input`, `#clipboard-button`, `#image-upload` and `#image-attachment` exist inside `.note-input`
- **AND** image paste and image upload work as before
- **AND** `.note-input` contains no row that is shown only while a turn runs (the former `#loading` row): the in-flight status is shown on the reply sticky instead (web-chat "A turn keeps the slip still and the input live")

#### Scenario: Page number follows the open page

- **WHEN** a recipe at position i in the alphabetical list is open
- **THEN** the note input shows "p. N" where N = 2 * i + 3
- **AND** on the contents page it shows "p. 1"

#### Scenario: Sending a note

- **WHEN** the user presses Enter (without Shift) or taps the send button
- **THEN** the note is sent and the textarea is cleared
- **AND** `#message-input` keeps focus
- **AND** error toasts for oversized images appear inside `.note-input`

#### Scenario: The textarea grows to three lines

- **WHEN** the user types seven lines into `#message-input` with Shift+Enter
- **THEN** the textarea grows for the first three lines and then stops: its height is at most three times its computed line-height plus its vertical padding and borders
- **AND** further lines scroll inside it (`scrollHeight` greater than `clientHeight`)
- **AND** `.note-input` is no more than two lines' height taller than it is with one line

### Requirement: Phone page tabs

On phones the recipe page SHALL offer three paper tabs on its top edge — Ingredients, Method, Notes — switched by tap only.

#### Scenario: Tabs render on a recipe

- **WHEN** a recipe is displayed on a viewport 600px wide or narrower
- **THEN** `.page-tabs` shows three tabs; the active tab is cream and joined to the page, inactive tabs are tan and brown
- **AND** the Ingredients tab is active when a recipe is opened

#### Scenario: Tapping a tab switches content

- **WHEN** the user taps Method
- **THEN** the page crossfades over 200ms to show the method steps and hides the ingredients
- **AND** no notes render beneath the visible content: the latest reply stays on the reply sticky directly above the input bar

#### Scenario: Notes tab shows the full thread

- **WHEN** the user taps Notes
- **THEN** the page shows `.notes-thread` with the displayed recipe's thread in order (user notes, replies and errors)
- **AND** the reply sticky is not shown while the Notes tab is active

#### Scenario: Tabs are tap only

- **WHEN** the user swipes horizontally on the recipe page
- **THEN** the swipe navigates between recipes as before
- **AND** the active tab does not change

#### Scenario: Tabs hidden off the recipe page

- **WHEN** the contents page or a meal plan is displayed
- **THEN** `.page-tabs` is not shown

## ADDED Requirements

### Requirement: Nothing on the page moves unless the cook acted on it

While the book is displayed, an element the cook did not act on SHALL keep its position and size through every interaction, at every breakpoint.

The anchors are each of these that is rendered at the viewport under test: `#note-input`; `#message-input`; `#page-right-content .recipe-title` (the top of the right page's content); the mid-method step `.prep-step[data-step="M"]` with M = ceil(number of steps ÷ 2) (on the phone, while the Method tab is active); `#page-next`; and `#timer-widget` while it is shown. An anchor does not move when its `getBoundingClientRect()` x, y, width and height each stay within 1px of their values at the start of the interaction, and it stays displayed (non-zero size, not `display: none`, not `visibility: hidden`), on every animation frame from the interaction until 500ms after the last DOM change it causes. `tests/e2e/tests/layout-stability.spec.ts` asserts each scenario below on the chromium, mobile-chrome and ipad projects.

#### Scenario: Opening a recipe

- **WHEN** the cook opens a recipe from the contents
- **THEN** `#note-input` and `#message-input` do not move

#### Scenario: Switching spread mode

- **WHEN** a recipe is open on a viewport wider than 600px and the cook switches Cook → Notes, Notes → Contents and Contents → Cook with the left-edge tabs
- **THEN** no anchor moves during any of the three switches

#### Scenario: Sending a note

- **WHEN** a recipe is open and the cook sends a one-line note
- **THEN** no anchor moves from the keypress until the first reply chunk arrives

#### Scenario: A reply arriving

- **WHEN** a reply streams in and completes, including a reply long enough to reach the sticky's height cap
- **THEN** no anchor moves from the first chunk until 500ms after the `done` event

#### Scenario: Refreshing the recipe

- **WHEN** the right page (on the phone, the Method tab) is scrolled so that the mid-method step is in view and the cook asks to "halve it", so an `update_recipe` re-renders the displayed recipe
- **THEN** no anchor moves

#### Scenario: A timer starting, ticking and finishing

- **WHEN** a timer for a method step starts, counts down and reaches zero
- **THEN** no anchor other than `#timer-widget` moves
- **AND** `#timer-widget` does not move between ticks, and at zero its horizontal centre and top edge stay put

#### Scenario: Ticking an ingredient and marking a step

- **WHEN** the cook taps an ingredient line and then a method step
- **THEN** no anchor moves
- **AND** the tapped `.ingredient-item` and the tapped `.prep-step` keep their own bounding boxes (tolerance 1px)

### Requirement: Refreshing the open recipe keeps the reader's place

Re-rendering the recipe that is already displayed — after an `update_recipe`, a photo upload or a late difficulty — SHALL happen in place: no loading skeleton, both pages' scroll positions and the phone's active tab restored, and the book's width unchanged.

#### Scenario: No skeleton on a refresh

- **WHEN** the displayed recipe is refreshed by an `update_recipe`, a photo upload or the arrival of its difficulty
- **THEN** no `.skeleton` element is present in `#page-left-content` or `#page-right-content` on any animation frame
- **AND** the previous content stays on the page until the new content replaces it

#### Scenario: Scroll positions are restored

- **WHEN** a refresh of the displayed recipe completes on a viewport wider than 600px
- **THEN** `#page-left.scrollTop` and `#page-right.scrollTop` equal their values before the refresh (tolerance 1px)

#### Scenario: The phone keeps its tab and its place

- **WHEN** a refresh of the displayed recipe completes on a viewport 600px wide or narrower while the Method tab is active and scrolled
- **THEN** the Method tab is still active
- **AND** `#page-right.scrollTop` equals its value before the refresh (tolerance 1px)

#### Scenario: The phone book keeps its width

- **WHEN** the displayed recipe is refreshed, or a different recipe is loaded, on a viewport 600px wide or narrower
- **THEN** `.app-container` and `.recipe-book` are as wide as the viewport (tolerance 1px) on every animation frame

#### Scenario: Opening a different recipe still shows the skeleton

- **WHEN** a recipe other than the displayed one is opened and it is not in the prefetch cache
- **THEN** the loading skeleton is shown until the recipe arrives

### Requirement: Every control the cook taps has a 44px hit area

Every control the cook taps while cooking SHALL have a hit area of at least 44×44px at every breakpoint where it is displayed. The visible control may stay smaller: the hit area can be extended with a transparent pseudo-element, so the leather tabs keep their look.

A control passes the hit-area test when, for a 5×5 grid of points spread evenly over the 44×44px square centred on the centre of the control's bounding box, `document.elementFromPoint` returns the control or one of its descendants at every grid point that lies inside the viewport. Two controls' squares therefore never overlap.

#### Scenario: Book controls

- **WHEN** the book is displayed on a viewport wider than 600px
- **THEN** every displayed `.contents-tab` (the filter tabs and the Contents / Cook / Notes spread tabs), `#page-prev` and `#page-next` passes the hit-area test
- **AND** the visible leather tabs keep their 26px width

#### Scenario: Recipe controls

- **WHEN** a recipe is displayed at any viewport
- **THEN** `.share-btn` and `.add-photo-btn` pass the hit-area test

#### Scenario: Note, reply and timer controls

- **WHEN** the note input, the reply sticky and the timer pill are displayed at any viewport
- **THEN** `#send-button`, `#clipboard-button`, `#page-margin .note-dismiss` and `.timer-cancel` pass the hit-area test

#### Scenario: Phone footer links

- **WHEN** a recipe is displayed on a viewport 600px wide or narrower
- **THEN** `.footer-prev` and `.footer-next` pass the hit-area test

#### Scenario: Ribbons are exempt while they take no input

- **WHEN** the right-edge strip is shown as ribbons ("Right page edge ribbons")
- **THEN** `.edge-tab` is exempt from the hit-area test, because it takes no taps at all
- **AND** if a future state makes `.edge-tabs` a working tab list again, each `.edge-tab` must pass the test in that state

### Requirement: Recipe text is sized for reading from the counter

While a recipe is displayed, ingredient lines and method step text SHALL render at 18px on viewports wider than 600px and at 17px on viewports 600px wide or narrower, and step durations at 15px. The contents page and the Notes thread keep their own sizes.

#### Scenario: Tablet and desktop

- **WHEN** a recipe is displayed on a viewport wider than 600px
- **THEN** `.ingredient-item` on the left page in `cook` mode, and `.prep-step .step-text` in every spread mode, have a computed font-size of 18px
- **AND** `.step-duration` has a computed font-size of 15px
- **AND** the computed line-height of the ingredient and method lists is at least 1.6 times their font-size

#### Scenario: Phone

- **WHEN** a recipe is displayed on a viewport 600px wide or narrower
- **THEN** `.ingredient-item` and `.prep-step .step-text` have a computed font-size of 17px
- **AND** `.step-duration` has a computed font-size of 15px

#### Scenario: Contents and Notes keep their sizes

- **WHEN** the contents page or a Notes thread is displayed
- **THEN** `.index-recipe-item` keeps its 15px font-size and `.notes-thread .thread-note` keeps the size it had before this change

### Requirement: Right page edge ribbons

On viewports wider than 600px the right page SHALL carry two edge ribbons, Ingredients and Method, on its outer edge while a recipe is open. They are the book's furniture, not controls: while a spread mode applies, which above 600px is always, they SHALL take no input and SHALL NOT be announced to assistive technology.

#### Scenario: Ribbons render on a recipe

- **WHEN** a recipe is displayed on a viewport wider than 600px
- **THEN** `.edge-tabs` shows two coloured ribbons, Ingredients and Method, on the right outer edge of the right page
- **AND** there is no `.edge-tab[data-tab="notes"]`: the left-edge Notes spread tab is the way to the thread

#### Scenario: Ribbons take no input

- **WHEN** a recipe is displayed on a viewport wider than 600px, in any spread mode
- **THEN** each `.edge-tab` has `aria-hidden="true"`, `tabindex="-1"` and a computed `pointer-events` of `none`
- **AND** `document.elementFromPoint` at a ribbon's centre does not return the ribbon
- **AND** both ribbons are drawn alike: neither is pulled out as active and neither changes on hover
- **AND** a click at a ribbon's position changes neither page's content nor either page's `scrollTop`

#### Scenario: Ribbons hidden off the recipe page

- **WHEN** the contents page or a meal plan is displayed
- **THEN** `.edge-tabs` is not shown

## REMOVED Requirements

### Requirement: Right page edge tabs

**Reason**: Superseded by design D11 (amending book-spread-modes R3). Above 600px a spread mode always applies and the right page is fixed while a recipe is open (D2), so the Ingredients / Method edge tabs can never scroll or change the right page, and the Notes edge tab already left the desktop strip in book-spread-modes (decision 5). Two of the old scenarios, "Ingredients and Method scroll the page" and "Notes shows the thread", now state the opposite of the rule, and a MODIFIED block cannot drop them.

**Migration**: "Right page edge ribbons" keeps the strip on the edge as inert ribbons and carries over "Edge tabs render on a recipe" and "Edge tabs hidden off the recipe page" (as "Ribbons render on a recipe" and "Ribbons hidden off the recipe page"). The phone's `.page-tabs` are untouched ("Phone page tabs"). `page-tabs.js` may keep its scroll-to-section code for a future state with no spread mode, but nothing reaches it. e2e: `page-tabs.spec.ts` "desktop: the edge tabs scroll the right page to the section" is rewritten to assert the ribbons are inert.
