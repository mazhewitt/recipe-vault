## MODIFIED Requirements

### Requirement: Timer widget displays as fixed speech bubble

The timer widget SHALL render as a cream pill clipped to the top edge of the recipe book cover and centred over the spine, positioned relative to the book rather than the viewport, with a clock icon, the timer label and the remaining time in tabular numerals, and a close control with a hit area of at least 44×44px. The remaining time SHALL be the largest text in the pill, readable from across the kitchen, and the pill SHALL keep one fixed width in every state. It SHALL never overlap the page arrows, the Recipe Book header or the user identity pill. On the phone it SHALL sit at the top right of the book frame's header bar.

#### Scenario: Timer renders correctly

- **WHEN** a timer is running on a viewport wider than 600px
- **THEN** the timer widget appears as a cream pill overlapping the top edge of the book cover: its top edge is above the top edge of `.recipe-book` and its bottom edge below it
- **AND** the pill's horizontal centre is within 1px of the spine (the horizontal centre of `.pages-container`)
- **AND** it shows a clock icon, the timer label and the remaining time
- **AND** the pill has no speech-bubble tail

#### Scenario: The time is readable across the kitchen

- **WHEN** a timer is running, or the pill is in its finished state, at any breakpoint
- **THEN** `#timer-widget` is at least 44px tall
- **AND** `.timer-time` has a computed font-size of 26px on viewports wider than 600px and 22px at 600px and narrower, never smaller than `.prep-step .step-text`, and `font-variant-numeric: tabular-nums`
- **AND** `.timer-label` has a computed font-size of 16px on viewports wider than 600px and 14px at 600px and narrower
- **AND** `.timer-label` and `.timer-time` are separate elements with at least 6px between the label's right edge and the time's left edge, so the pill never reads "Label:7:42"
- **AND** if the 26px time cannot fit at tablet landscape (1080×810) without breaking "Timer does not overlap the page arrows or the header", 24px is used there and design-system.md records it

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
- **THEN** the pill sits at the top right of the book frame's header bar, opposite the book label, at least 44px tall, with the 22px time and 14px label of "The time is readable across the kitchen"
- **AND** its bounding box does not intersect `#recipe-book-header`
- **AND** `.timer-cancel` still passes the 44×44 hit-area test for every sampled point inside the viewport

#### Scenario: Pill width holds steady while counting

- **WHEN** a running timer counts down through ten consecutive ticks
- **THEN** the bounding box of `#timer-widget` is the same after every tick (tolerance 1px)
- **AND** the remaining time renders with `font-variant-numeric: tabular-nums`
- **AND** when the pill switches to its finished state its horizontal centre and its top edge stay where they were (tolerance 1px)

#### Scenario: One width in every state

- **WHEN** a timer runs from 10:00 through its last minute to its finished state, and shows "Tap again to replace" (cooking-guidance "A step's duration starts its timer") on the way, at a given viewport
- **THEN** the bounding box of `#timer-widget` is the same in every one of those states (tolerance 1px)
- **AND** a label longer than the pill's label slot ends in an ellipsis (computed `text-overflow: ellipsis` on `.timer-label`) rather than widening the pill

#### Scenario: Pill is hidden when no timer runs

- **WHEN** no timer is running and no finished timer is waiting to be acknowledged
- **THEN** the timer widget is not displayed

### Requirement: Note input lives in the book

The chat input SHALL be a single "note to the cook" control attached to the book, replacing the notepad input. Above 600px it SHALL sit at the foot of the left page in every state of the book. It SHALL NOT change height while a turn runs, and its textarea SHALL grow to at most three lines.

#### Scenario: Desktop note input

- **WHEN** the viewport is wider than 600px
- **THEN** a `.note-input` with a pencil icon, a textarea with placeholder "Write a note to the cook…", a paperclip attach button and, on viewports wider than 1024px, the current page number sits at the foot of the left page, in every state book-spread-modes "The note input keeps one position" lists

#### Scenario: The tablet slip gives the page number's room to the textarea

- **WHEN** the viewport is wider than 600px and 1024px wide or narrower
- **THEN** `.note-page-number` is not displayed and its width goes to `#message-input`
- **AND** at 810×1080 the placeholder "Write a note to the cook…" is shown in full (`#message-input`'s `scrollWidth` does not exceed its `clientWidth` with the placeholder alone)
- **AND** typing a 24-character note ("how long should it rest?") leaves `#note-input`'s height unchanged (tolerance 1px); a longer note wraps, up to the three-line cap

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
- **THEN** the note input shows "p. N" where N = 2 * i + 3, wherever `.note-page-number` is displayed (wider than 1024px, and on the phone)
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

### Requirement: Nothing on the page moves unless the cook acted on it

While the book is displayed, an element the cook did not act on SHALL keep its position and size through every interaction, at every breakpoint.

The anchors are each of these that is rendered at the viewport under test: `#note-input`; `#message-input`; `#page-right-content .recipe-title` (the top of the right page's content); the mid-method step `.prep-step[data-step="M"]` with M = ceil(number of steps ÷ 2) (on the phone, while the Method tab is active); `#page-next`; `.book-container` at 600px and narrower; and `#timer-widget` while it is shown. An anchor does not move when its `getBoundingClientRect()` x, y, width and height each stay within 1px of their values at the start of the interaction, and it stays displayed (non-zero size, not `display: none`, not `visibility: hidden`), on every animation frame from the interaction until 500ms after the last DOM change it causes. `tests/e2e/tests/layout-stability.spec.ts` asserts each scenario below on the chromium, mobile-chrome and ipad projects.

#### Scenario: Opening a recipe

- **WHEN** the cook opens a recipe from the contents
- **THEN** `#note-input` and `#message-input` do not move
- **AND** at 600px and narrower `.book-container` does not move

#### Scenario: Returning to the contents on the phone

- **WHEN** a recipe is open on a viewport 600px wide or narrower and the cook taps the Recipe Book header
- **THEN** `.book-container`, `#note-input` and `#message-input` do not move

#### Scenario: A reply sticky over a page scrolled to its end

- **WHEN** the page under the sticky is scrolled to its end and a reply streams in, completes and is dismissed
- **THEN** no anchor moves, and the scroll container's `scrollTop` is unchanged (web-chat "The reply sticky never hides the end of the page")

#### Scenario: Starting a timer from a step's duration

- **WHEN** the cook taps a step's `.step-duration`, and later a second `.step-duration` once and then again to replace the timer
- **THEN** no anchor other than `#timer-widget` moves, and `#timer-widget` keeps one bounding box from the moment it is shown

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
- **AND** tapping "Clear ticks" and then "Undo" moves no anchor and neither the ingredients header nor any `.ingredient-item`

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
- **AND** every `.step-duration`, and `.clear-ticks` while it is displayed (as "Clear ticks" or "Undo"), pass the hit-area test

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

### Requirement: Right page edge ribbons

On viewports wider than 600px the right page SHALL carry two edge ribbons on its outer edge while a recipe is open, drawn alike and without text, so they read as the book's page edges and not as tabs. They are the book's furniture, not controls: while a spread mode applies, which above 600px is always, they SHALL take no input and SHALL NOT be announced to assistive technology.

#### Scenario: Ribbons render on a recipe

- **WHEN** a recipe is displayed on a viewport wider than 600px
- **THEN** `.edge-tabs` shows two ribbons, `.edge-tab[data-tab="ingredients"]` and `.edge-tab[data-tab="method"]`, on the right outer edge of the right page, at the positions they had before this change (tolerance 1px)
- **AND** neither ribbon renders text: each `.edge-tab`'s `innerText` is empty
- **AND** both have the same computed `background-color`, `width`, `transform` and `box-shadow`, and neither has the `active` class or `aria-selected="true"`
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
