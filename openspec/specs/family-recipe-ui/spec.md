# Family Recipe UI

## Purpose

This capability defines the family recipe book user interface design system - a warm, handwritten aesthetic that transforms the functional chat interface into an inviting kitchen companion. The interface presents a leather-bound recipe book that fills the width, with a "note to the cook" input attached to it, all on a wood-textured background.

## Requirements

### Requirement: Main layout displays the recipe book alone

The interface SHALL display the recipe book alone, filling the available width, on a light linen background, with the chat note input attached to the book.

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

The recipe book SHALL render as an open book with a red leather cover frame containing two cream-colored pages side by side; while a recipe is open the left page holds whichever of the ingredients, the conversation or the contents the spread mode selects, and the right page holds the recipe's compact header (title line and meta line) and method.

#### Scenario: Book structure renders correctly

- **WHEN** a recipe is loaded
- **THEN** the book displays with a red leather cover border, visible spine shadow down the center, and two pages (left and right)

#### Scenario: Left page shows ingredients

- **WHEN** a recipe is displayed on a viewport wider than 600px
- **THEN** the left page shows the ingredients in `cook` mode, the open recipe's thread in `notes` mode, and the contents (title, A–Z strip, letter groups, with the current recipe's entry marked `current`) in `contents` mode, as book-spread-modes defines
- **AND** the ingredients are never on the right page

#### Scenario: Right page shows preparation steps

- **WHEN** a recipe is displayed on a viewport wider than 600px, in any spread mode
- **THEN** the right page shows the compact header of "Recipe metadata displays with icons" (the title line, then the meta line), a "Method" header and numbered steps where each step number is rendered in Kalam in the leather red and the step text in the serif
- **AND** the right page has no ingredients section and no margin column

#### Scenario: The title takes the width of the page

- **WHEN** a recipe is displayed at any viewport
- **THEN** `.recipe-title-row` contains no `.share-btn` and no `.add-photo-btn`
- **AND** above 600px the title wraps by words in the space left of the thumbnail and `button.recipe-more`
- **AND** the title "Granny's Beef Lasagne", with a photo, renders in at most two lines (element height ÷ computed line-height, rounded) at the 810px and 1280px e2e viewports, and in exactly one line, ellipsised, at 393px

#### Scenario: Phone shows one page

- **WHEN** a recipe is displayed on a viewport 600px wide or narrower
- **THEN** only the right page is visible, showing above the tabs one line holding the title (one line, ellipsised: computed `white-space: nowrap` and `text-overflow: ellipsis`), the thumbnail and `button.recipe-more`, then the active tab's content one item per line, with ingredient and step text at 17px
- **AND** the meta line with the servings stepper is the first row of the Ingredients tab, not above the tabs
- **AND** the Ingredients and Method panels carry no section header (the paper tab names them), and "Clear ticks" ends the meta line, 46px in from its end, clear of the stepper and of `button.recipe-more`; above 600px it is back in the Ingredients header
- **AND** the footer reads "‹ previous recipe", the page number and "next recipe ›"

### Requirement: Recipe book pages scroll independently

Each page of the recipe book SHALL scroll independently when content exceeds the visible area.

#### Scenario: Left page scrolls for long ingredient lists

- **WHEN** the contents on the left page exceed the page's visible height
- **THEN** the left page content becomes scrollable while the right page remains independently scrollable

#### Scenario: Right page scrolls for long preparation steps

- **WHEN** the recipe on the right page exceeds the page's visible height
- **THEN** the right page content becomes scrollable while the left page remains independently scrollable
- **AND** the note input stays at the foot of the page and does not scroll with the content

### Requirement: Recipe metadata displays with icons

The recipe header SHALL be compact and the same in every spread mode: a title line holding the title, a small tilted photo thumbnail and a "⋯" button, and beneath it one meta line, set in the serif, holding the servings stepper and the total time. The tag chips, the prep/cook split, share and add-photo SHALL be in a popover the "⋯" button opens. The difficulty dots SHALL end the Ingredients heading on viewports wider than 600px, on the heading's line, and be in the popover on the phone, which has no Ingredients heading. The difficulty SHALL occupy a fixed-width slot that is present before its value is known.

#### Scenario: The title line

- **WHEN** a recipe with a photo is displayed on a viewport wider than 600px
- **THEN** `.recipe-title-row` holds `.recipe-title` at its current font-size, `.recipe-polaroid` drawn as a thumbnail of 44×44px (tolerance 4px, before rotation) with its tilt, and `button.recipe-more` reading "⋯" with `aria-haspopup="dialog"` and `aria-expanded="false"`
- **AND** a recipe without a photo shows no thumbnail, and `button.recipe-more` keeps its place at the line's end
- **AND** tapping the thumbnail opens the full-window photo preview ("Recipe photo opens full-window preview on click")

#### Scenario: The meta line

- **WHEN** a recipe with servings 8 and a total time is displayed on a viewport wider than 600px
- **THEN** `.recipe-meta-line` is the line under `.recipe-title-row` and reads "serves − 8 + · 1h 5m" (the stepper of "A servings stepper scales the page", then the total time)
- **AND** it renders in a single line: its height is no more than 48px
- **AND** it contains no `.meta-difficulty`, `.recipe-tags`, `.meta-breakdown`, `.share-btn` or `.add-photo-btn`
- **AND** the "Method" header follows it

#### Scenario: Servings display when available

- **WHEN** a recipe with a servings value is displayed
- **THEN** the meta line shows `serves`, the stepper and the servings the page shows ("A servings stepper scales the page"), in place of the former `serves N`

#### Scenario: Difficulty renders as filled dots

- **WHEN** a recipe with difficulty level 2 is displayed in `cook` mode on a viewport wider than 600px
- **THEN** the Ingredients panel's `.section-header` ends with `.meta-difficulty`, showing a "difficulty" label followed by 2 filled dots and 3 empty dots
- **AND** the slot's right edge is the heading's right edge, and the label's baseline is the heading's baseline (tolerance 1px)
- **AND** when "clear ticks" shows, it stands left of the slot, on the same baseline (tolerance 1px), and the heading's height does not change
- **AND** on a viewport 600px wide or narrower, when the cook opens the "⋯" popover, `.recipe-more-panel .meta-difficulty` shows the same label and dots

#### Scenario: Time values display with clock icons

- **WHEN** a recipe with prep time and/or cook time is displayed and the cook opens the "⋯" popover
- **THEN** `.recipe-more-panel .meta-breakdown` shows a muted group listing whichever values are present, in the format of "Times on the meta line read one way" ("(40m prep · 2h 30m cook)", "(1h 15m cook)")
- **AND** `.recipe-meta-line` contains no `.meta-breakdown`

#### Scenario: Total time displays when available

- **WHEN** a total time value is derived for a recipe
- **THEN** the meta line (above 600px) or the popover (at 600px and narrower) shows it in the format of "Times on the meta line read one way": "45m" under an hour, "2h" for whole hours, otherwise "2h 30m"

#### Scenario: Total time is omitted when unavailable

- **WHEN** a recipe has no servings, or no total time
- **THEN** that item is not rendered: no stepper without servings, no total time without one
- **AND** the meta line itself is always rendered, one line tall, so a recipe without either keeps the method where it would be

#### Scenario: The popover's contents

- **WHEN** the cook taps `button.recipe-more`
- **THEN** `.recipe-more-panel[role="dialog"]` is shown, anchored under the button, and the button has `aria-expanded="true"`
- **AND** the panel holds `.recipe-tags` with up to three tag chips, `.meta-breakdown`, `.share-btn` and `.add-photo-btn`, and on the phone also the total time and `.meta-difficulty` (above 600px the panel holds no `.meta-difficulty`)
- **AND** `.share-btn`, `.add-photo-btn` and `button.recipe-more` each pass the hit-area test of "Every control the cook taps has a 44px hit area"

#### Scenario: Opening the popover moves nothing

- **WHEN** the cook opens and then closes the popover
- **THEN** the panel is overlaid on the page (computed `position` of `absolute` or `fixed`), and no anchor of "Nothing on the page moves unless the cook acted on it", no `.prep-step` and no `.ingredient-item` moves (tolerance 1px)

#### Scenario: The popover closes

- **WHEN** the popover is open and the cook taps outside it, presses Escape, turns the page, changes spread mode, or taps `.share-btn` or `.add-photo-btn` (once its flow has started)
- **THEN** `.recipe-more-panel` is hidden and `button.recipe-more` has `aria-expanded="false"`
- **AND** a tap outside that closes the popover does nothing else: it ticks no ingredient and marks no step

#### Scenario: The difficulty slot is reserved

- **WHEN** a recipe whose difficulty is not yet known is displayed
- **THEN** `.meta-difficulty` is present in its place (the Ingredients heading above 600px, the popover on the phone), shows no dots, and is as wide as it is when it holds the label and five dots
- **AND** when the difficulty arrives later, with the popover open or closed, only the slot's contents change: the title line, the meta line, the Ingredients heading, the slot and every `.prep-step` keep their bounding boxes (tolerance 1px)

#### Scenario: Share and photo end the meta line
- **WHEN** a recipe is displayed
- **THEN** `.share-btn` and `.add-photo-btn` are no longer on `.recipe-meta-line`: they end the "⋯" popover, in `.more-actions` (see "The popover's contents")
- **AND** each still has a bounding box of at least 44×44px

#### Scenario: The same header in every mode

- **WHEN** a recipe is open on a viewport wider than 600px and the cook switches Cook → Notes → Contents → Cook
- **THEN** `.recipe-title-row`, `.recipe-meta-line` and `button.recipe-more` have the same contents and the same bounding boxes in every mode (tolerance 1px)

### Requirement: Empty recipe book shows placeholder

The recipe book SHALL display the recipe index as its default state instead of placeholder content. The placeholder is replaced by the index view.

#### Scenario: No recipe selected

- **WHEN** the chat page loads without a recipe displayed
- **THEN** the recipe book shows the alphabetical recipe index (not placeholder text)

#### Scenario: No recipes exist

- **WHEN** the chat page loads and no recipes exist in the vault
- **THEN** the recipe book shows a friendly empty state message within the index view (e.g., "Your recipe book is empty. Ask me to create a recipe!")

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

### Requirement: Typography uses Kalam handwritten font

Text in the recipe book and note input SHALL use two font families with appropriate fallbacks: Kalam (handwritten) for titles, section headers, letter headers, labels, step numbers, tabs, notes and the note input; Libre Baskerville (serif) for ingredient lines, method step text, contents entries, the recipe's meta line and the times in the "⋯" popover (they are data: servings and times), with tabular figures. A section header SHALL be a capitalised word ("Ingredients", "Method") over one rule, not an underlined word over a rule.

#### Scenario: Font loads and applies

- **WHEN** the chat page loads
- **THEN** the page requests Kalam (300/400/700) and Libre Baskerville (400/700, italic 400) from Google Fonts
- **AND** headings, labels, tabs, notes and the note input render in Kalam (or cursive fallback)
- **AND** the ingredients list, method steps, contents entries, `.recipe-meta-line` and `.recipe-more-panel .meta-breakdown` render in Libre Baskerville (or Georgia / serif fallback), the meta line and the breakdown with `font-variant-numeric: tabular-nums`

#### Scenario: Section headers carry one rule

- **WHEN** a recipe is displayed
- **THEN** the section headers read "Ingredients" and "Method", each with a bottom border and a computed `text-decoration-line` of `none`
- **AND** on the phone, where the paper tabs name the panels, they are not displayed

#### Scenario: Body text stays readable on paper

- **WHEN** serif body text is rendered on the page background
- **THEN** it is at least 14px and no lighter than the `--color-ink-light` token, except the meta line, which is at least 12px and no lighter than `--color-ink-medium` (its breakdown `--color-ink-light`)

### Requirement: Design tokens define consistent theming

The CSS SHALL define design tokens as custom properties for colors, typography, spacing, and shadows.

#### Scenario: Custom properties are defined

- **WHEN** the chat page loads
- **THEN** CSS custom properties for desk colors, leather colors, paper colors, ink colors, and spacing are available on the root element

#### Scenario: Font tokens are defined

- **WHEN** the chat page loads
- **THEN** `--font-handwritten` resolves to the Kalam stack
- **AND** `--font-serif` resolves to the Libre Baskerville stack

#### Scenario: Annotation colour tokens are defined

- **WHEN** the chat page loads
- **THEN** `--color-biro` resolves to `#1f3d8a` and is used for margin note text
- **AND** `--color-sticky` resolves to `#fbe9a0` and is used for sticky note backgrounds

### Requirement: Transitions provide smooth interactions

UI state changes SHALL use CSS transitions for smooth, pleasant animations, and SHALL respect the user's reduced-motion preference.

#### Scenario: New messages animate in

- **WHEN** a new note appears in the page margin or the notes thread
- **THEN** it fades in with a subtle upward slide over 200-300ms

#### Scenario: Hover states transition smoothly

- **WHEN** the user hovers over interactive elements
- **THEN** hover effects (shadow, scale) transition smoothly over 150ms

#### Scenario: Reduced motion disables note animation

- **WHEN** `prefers-reduced-motion: reduce` is active and a new margin note appears
- **THEN** the note is shown immediately without a fade or slide

### Requirement: Left page displays back navigation arrow

The left page of the recipe book SHALL display a "<" navigation arrow in the top-left corner for navigating to the previous recipe.

#### Scenario: Back arrow renders on left page

- **WHEN** the recipe book is displayed
- **THEN** a "<" arrow appears in the top-left corner of the left page, below the page header area

#### Scenario: Back arrow has hover state

- **WHEN** the user hovers over the enabled "<" arrow
- **THEN** the arrow displays a hover effect (e.g., color change or subtle scale)

#### Scenario: Disabled back arrow appearance

- **WHEN** the "<" arrow is disabled (at start of list or no recipes)
- **THEN** the arrow appears greyed out and the cursor does not show pointer

### Requirement: Right page displays forward navigation arrow

The right page of the recipe book SHALL display a ">" navigation arrow in the top-right corner for navigating to the next recipe.

#### Scenario: Forward arrow renders on right page

- **WHEN** the recipe book is displayed
- **THEN** a ">" arrow appears in the top-right corner of the right page, below the page header area

#### Scenario: Forward arrow has hover state

- **WHEN** the user hovers over the enabled ">" arrow
- **THEN** the arrow displays a hover effect (e.g., color change or subtle scale)

#### Scenario: Disabled forward arrow appearance

- **WHEN** the ">" arrow is disabled (at end of list or no recipes)
- **THEN** the arrow appears greyed out and the cursor does not show pointer

### Requirement: Navigation arrows use book-consistent styling

The navigation arrows SHALL match the handwritten aesthetic of the recipe book.

#### Scenario: Arrow styling matches book theme

- **WHEN** the arrows are rendered
- **THEN** they use the Kalam font or a hand-drawn arrow style consistent with the book's visual design

### Requirement: Recipe photo opens full-window preview on click

The recipe photo in the recipe book SHALL open a full-window preview when clicked or tapped, with the preview image constrained to fit within the viewport. The preview SHALL open and close on `click` events only, never on `touchstart` or `touchend`. The click a browser synthesises after a tap is then the tap itself, and cannot close what the tap opened.

#### Scenario: Click recipe photo shows preview
- **WHEN** a recipe is displayed with a photo
- **AND** the user clicks the photo
- **THEN** a full-window overlay appears showing the photo
- **AND** the photo is scaled to fit within the viewport width or height (whichever is smaller)

#### Scenario: Preview can be dismissed
- **WHEN** the photo preview overlay is visible
- **THEN** the user can dismiss it by clicking or tapping the overlay, or by pressing Escape, and return to the recipe view

#### Scenario: Tapping the photo on a touch screen keeps the preview open
- **WHEN** a recipe with a photo is displayed on a touch device (the `mobile-chrome` and `ipad` projects)
- **AND** the user taps `#page-right-content .recipe-polaroid .recipe-photo`
- **THEN** `#photo-preview-overlay` has the class `visible`
- **AND** it still has the class `visible` 500ms after the tap

#### Scenario: Tapping the overlay closes it for good
- **WHEN** the photo preview is open on a touch device
- **AND** the user taps the overlay
- **THEN** `#photo-preview-overlay` loses the class `visible`
- **AND** it does not regain it within the next 500ms

#### Scenario: A drag that starts on the photo opens nothing
- **WHEN** a touch starts on `.recipe-photo` and moves 40px before lifting
- **THEN** `#photo-preview-overlay` does not gain the class `visible`

### Requirement: Recipe photo view is display-only

The recipe photo display SHALL not include a replace-image control in the recipe view.

#### Scenario: Replace control is absent
- **WHEN** a recipe is displayed
- **THEN** no replace-image control is rendered alongside the recipe photo

### Requirement: Alphabet index navigation works across responsive layouts

The recipe book contents alphabet navigation SHALL be usable on the contents page and in the contents column beside an open recipe.

#### Scenario: Wide layout alphabet navigation

- **WHEN** the viewport is wider than 600px
- **THEN** the alphabet navigation is visible beneath the contents title, on the contents page and on the left page while a recipe is open
- **AND** selecting a letter jumps to the matching section within that page

#### Scenario: Narrow layout alphabet navigation

- **WHEN** the viewport is 600px wide or narrower and the contents page is shown
- **THEN** the alphabet navigation remains visible and clickable without overlapping contents entries
- **AND** selecting a letter jumps to the matching section

### Requirement: Alphabet controls retain readability and affordance

Alphabet controls SHALL preserve readable typography and clear interactive affordance while remaining compact.

#### Scenario: Active and inactive letters are distinguishable
- **WHEN** the alphabet navigation is displayed
- **THEN** active letters are visually distinguishable from inactive letters
- **AND** inactive letters are non-interactive

#### Scenario: Compact styling remains operable
- **WHEN** the alphabet controls use minimal extra padding
- **THEN** users can still reliably select letters in desktop and touch-oriented layouts

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

- **WHEN** the right page (on the phone, the Method tab) is scrolled so that the mid-method step is in view and the cook asks to "update it", so an `update_recipe` re-renders the displayed recipe
- **THEN** no anchor moves

#### Scenario: Changing the servings

- **WHEN** the cook taps `.servings-step[data-step="-1"]` and `[data-step="+1"]`, and a `servings_set` event sets the stepper, on a recipe whose scaled quantities fit their lines
- **THEN** no anchor moves, and no `.ingredient-item`, `.recipe-meta-line` or `.servings-note` slot changes its bounding box (tolerance 1px)
- **AND** where a longer quantity wraps its line, only the items after it on the ingredient list move

#### Scenario: Opening the "⋯" popover

- **WHEN** the cook opens the popover, and closes it with a tap outside
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
- **THEN** `button.recipe-more`, and both `.servings-step` buttons while the stepper is displayed, pass the hit-area test
- **AND** with the popover open, `.share-btn` and `.add-photo-btn` pass the hit-area test
- **AND** every `.step-duration`, and `.clear-ticks` while it is displayed (as "Clear ticks" or "Undo"), pass the hit-area test

#### Scenario: Note, reply and timer controls

- **WHEN** the note input, the reply sticky and the timer pill are displayed at any viewport
- **THEN** `#send-button`, `#clipboard-button`, `#page-margin .note-dismiss` and `.timer-cancel` pass the hit-area test

#### Scenario: Phone footer links

- **WHEN** a recipe is displayed on a viewport 600px wide or narrower
- **THEN** `.footer-prev` and `.footer-next` pass the hit-area test

#### Scenario: Ribbons are exempt while they take no input

- **WHEN** the book is displayed on a viewport wider than 600px
- **THEN** the right page's edge holds no strip, so there is no `.edge-tabs` or `.edge-tab` to exempt (the ribbons were removed with "Right page edge ribbons")
- **AND** if a future state puts tabs on the right edge again, each must pass the hit-area test

### Requirement: Recipe text is sized for reading from the counter

While a recipe is displayed, ingredient lines and method step text SHALL render at 18px on viewports wider than 600px and at 17px on viewports 600px wide or narrower, and step durations at 15px. The exception is the desk: on a viewport wider than 600px whose primary pointer is fine and can hover (`(hover: hover) and (pointer: fine)`, a mouse or trackpad), the book is read from a chair. There, method step text SHALL render at 16px, ingredient lines a size under it at 15px and step durations at 14px, the rest of the book's type at about 90% of its counter size, and every box and hit area at its counter size, except the ingredient rows ("Ingredient rows are tall enough to tick"). Ingredient lines SHALL be one per row at an even pitch. The contents page and the Notes thread keep their own sizes.

#### Scenario: Tablet and desktop

- **WHEN** a recipe is displayed on a viewport wider than 600px with a coarse primary pointer (a tablet, or a touch-screen desktop; a mouse or trackpad is "At the desk")
- **THEN** `.ingredient-item` on the left page in `cook` mode, and `.prep-step .step-text` in every spread mode, have a computed font-size of 18px
- **AND** `.step-duration` has a computed font-size of 15px
- **AND** the computed line-height of the method list is at least 1.6 times its font-size

#### Scenario: At the desk

- **WHEN** a recipe is displayed on a viewport wider than 600px whose primary pointer is fine and can hover
- **THEN** `.prep-step .step-text` in every spread mode has a computed font-size of 16px, and `.ingredient-item` on the left page in `cook` mode 15px
- **AND** `.step-duration` has a computed font-size of 14px and `.recipe-title` 24px
- **AND** the computed line-height of the method list is at least 1.6 times its font-size
- **AND** every control still passes the hit-area test of "Every control the cook taps has a 44px hit area", and `.timer-time` keeps its 26px

#### Scenario: Phone

- **WHEN** a recipe is displayed on a viewport 600px wide or narrower
- **THEN** `.ingredient-item` and `.prep-step .step-text` have a computed font-size of 17px
- **AND** `.step-duration` has a computed font-size of 15px

#### Scenario: Ingredient rows are evenly spaced

- **WHEN** a recipe whose ingredients fit on one line each is displayed, in `cook` mode above 600px or on the phone's Ingredients tab
- **THEN** every `.ingredient-item` has the same height (tolerance 1px), and each item's top equals the previous item's bottom (tolerance 1px)
- **AND** an item whose text wraps keeps its lines at a line-height of at most 1.5 times its font-size, so its lines sit closer together than its neighbouring rows
- **AND** no item has a list marker

#### Scenario: Contents and Notes keep their sizes

- **WHEN** the contents page or a Notes thread is displayed with a coarse primary pointer
- **THEN** `.index-recipe-item` keeps its 15px font-size and `.notes-thread .thread-note` keeps the size it had before `steady-cooking-spread`
- **AND** at the desk `.index-recipe-item` is 14px

### Requirement: Phone gutter chevrons turn the page

On viewports 600px wide or narrower, while a recipe is displayed, the book SHALL show two visible chevron buttons at the right-hand end of the phone page-tab row (`.page-tabs`): `button#gutter-prev.gutter-chevron` (aria-label "Previous recipe") followed by `button#gutter-next.gutter-chevron` (aria-label "Next recipe"). Each SHALL have a hit area of at least 44×44px that covers none of the page content and none of the Ingredients / Method / Notes tabs. They SHALL behave exactly like the footer links: previous opens the previous recipe, or the contents from the first recipe; next opens the next recipe. (Lead decision 2026-10-17, open question 3: the phone's leather frame is 4px, and widening it to hold a 44px target beside the paper would cost about 14% of the paper's width, so the chevrons share the tab row instead.)

#### Scenario: Chevrons render beside a recipe

- **WHEN** a recipe is displayed on a viewport 600px wide or narrower
- **THEN** `#gutter-prev` and `#gutter-next` are visible `<button>` elements
- **AND** each passes the hit-area test of "Every control the cook taps has a 44px hit area" (added by `steady-cooking-spread`): `document.elementFromPoint` returns the chevron at every point of a 5×5 grid spread over the 44×44px square centred on it
- **AND** the vertical centre of each is within 22px of the vertical centre of the `.page-tabs` row
- **AND** `#gutter-prev` lies left of `#gutter-next`, and both lie right of the last `.page-tab`

#### Scenario: Chevrons cover no page content

- **WHEN** a recipe is displayed on a viewport 600px wide or narrower
- **AND** `#page-right` is scrolled to its top, its middle and its bottom in turn
- **THEN** at each scroll position neither chevron's 44×44px hit area overlaps the bounding box of any element inside `#page-right-content`, nor any `.page-tab`

#### Scenario: Chevrons turn the page

- **WHEN** a recipe that is neither first nor last is displayed on a viewport 600px wide or narrower
- **AND** the user taps `#gutter-next`
- **THEN** the next recipe opens with the forward slide (`html[data-nav-direction="forward"]` during the turn)
- **AND** tapping `#gutter-prev` opens the previous recipe with the backward slide

#### Scenario: Chevrons follow the book's boundaries

- **WHEN** the first recipe of the alphabetical list is displayed on a viewport 600px wide or narrower
- **THEN** `#gutter-prev` is enabled and tapping it returns to the contents
- **AND** when the last recipe is displayed, `#gutter-next` is visible, carries the `disabled` attribute, and tapping it changes nothing

#### Scenario: Chevrons are hidden off the recipe page

- **WHEN** the contents page or a meal plan is displayed on a viewport 600px wide or narrower
- **THEN** neither chevron is visible and neither can receive focus

#### Scenario: Chevrons are absent above the phone breakpoint

- **WHEN** the viewport is wider than 600px
- **THEN** neither chevron is visible, and the page arrows `#page-prev` and `#page-next` are the turn controls

### Requirement: Phone tabs keep their own scroll position

On viewports 600px wide or narrower, each of the Ingredients, Method and Notes tabs of the open recipe SHALL remember its own scroll position of `#page-right`, the element that scrolls the phone page. Leaving a tab SHALL record its position, and returning to it SHALL restore that position. A newly opened recipe SHALL start every tab at the top.

#### Scenario: A round trip keeps the place in the method

- **WHEN** the Method tab is active and `#page-right` is scrolled so that step 7 (`.prep-step[data-step="7"]`) is at viewport y = Y
- **AND** the user taps Ingredients and then Method
- **THEN** step 7's `getBoundingClientRect().top` is within 1px of Y
- **AND** `#page-right.scrollTop` is within 1px of its value before Ingredients was tapped

#### Scenario: Each tab has its own position

- **WHEN** the Ingredients tab has been scrolled to 120px and the Method tab to 400px
- **THEN** switching to Ingredients shows `#page-right.scrollTop` of 120 (±1px) and switching back to Method shows 400 (±1px)
- **AND** a position larger than the tab's content allows is clamped by the browser, not treated as an error

#### Scenario: A newly opened recipe starts at the top

- **WHEN** the method of one recipe was scrolled and the user opens a different recipe (by the footer links, the gutter chevrons, a swipe or the contents)
- **THEN** the new recipe shows its Ingredients tab with `#page-right.scrollTop` of 0
- **AND** tapping its Method tab shows the method with `#page-right.scrollTop` of 0

### Requirement: Crossing the phone breakpoint keeps the view

When the viewport crosses 600px wide in either direction (a rotation or a window resize), detected as a change of `matchMedia('(max-width: 600px)')`, the book SHALL keep showing what it showed. An open recipe SHALL stay open with its scroll positions restored. Above 600px its spread mode SHALL be the mode the reader last chose for the spread in this page session, or `cook` if they never chose one (lead decision 2026-10-17, open question 11: keep today's behaviour of remembering the reader's mode across a phone round trip). The note input SHALL be visible after the crossing. The contents SHALL be re-rendered on a breakpoint change only, never on a `resize` event that stays on one side of 600px.

#### Scenario: Rotating a phone to landscape keeps the recipe

- **WHEN** a recipe is open on its Method tab at 390×844
- **AND** the viewport changes to 844×390
- **THEN** `#page-right-content .recipe-title` shows the same recipe and `body[data-view-mode]` is `recipe`
- **AND** `body[data-spread-mode]` is `cook`, with the recipe's ingredients in `#page-left-content .tab-panel[data-tab="ingredients"]`
- **AND** `.note-input` is visible

#### Scenario: Narrowing to a phone keeps the recipe

- **WHEN** a recipe is open at 1280×800 in any spread mode
- **AND** the viewport narrows to 500×800
- **THEN** the same recipe is shown on the single page with `.page-tabs` visible
- **AND** the document holds exactly one `.tab-panel[data-tab="ingredients"]`, inside `#page-right-content`
- **AND** `.note-input` is visible

#### Scenario: Crossing back restores the scroll position

- **WHEN** a recipe is open at 1280×800 with `#page-right.scrollTop` at 200
- **AND** the viewport changes to 500×800 and back to 1280×800
- **THEN** `#page-right.scrollTop` is 200 (±1px) and `body[data-spread-mode]` is the mode it had before the round trip
- **AND** likewise a phone's Method tab scrolled to S at 390×844 shows the Method tab at S (±1px) after a round trip through 844×390

#### Scenario: Resizing within a band does not re-render the contents

- **WHEN** the contents page is displayed at 1280×800
- **AND** the viewport is resized 20 times to widths between 900 and 1090px
- **THEN** no request to `GET /api/recipes` is made
- **AND** the `.index-recipe-item` elements are the same DOM nodes as before the resizes

#### Scenario: The phone keyboard does not reset the contents

- **WHEN** the contents page is displayed at 390×844 with `#page-left.scrollTop` at 300
- **AND** the viewport height changes to 500 (the on-screen keyboard opening)
- **THEN** `#page-left.scrollTop` is still 300 (±1px)
- **AND** no request to `GET /api/recipes` is made

#### Scenario: Crossing with the contents shown redraws them for the new layout

- **WHEN** the contents page is displayed with at least two recipes and the viewport crosses 600px
- **THEN** the contents are re-rendered once for the new layout: split across both pages above 600px, and on the single left page with `#page-right-content` empty at 600px or narrower

### Requirement: A servings stepper scales the page

A recipe with servings SHALL show a servings stepper, "serves − N +", that rescales the displayed ingredient quantities for this browser session without saving anything. The stepper SHALL never call the server.

#### Scenario: The stepper renders

- **WHEN** a recipe with servings 8 is displayed
- **THEN** `.recipe-meta-line` (on the phone, the first row of the Ingredients tab) starts with "serves", `button.servings-step[data-step="-1"]` (aria-label "Fewer servings"), `output.servings-count[aria-live="polite"]` reading "8", and `button.servings-step[data-step="+1"]` (aria-label "More servings")
- **AND** a recipe without servings shows no `.servings-step` and no `.servings-count`

#### Scenario: The range

- **WHEN** a recipe with servings S is displayed
- **THEN** the count ranges from 1 to max(S, min(4 × S, 24)): 1 to 24 for S = 8, 1 to 8 for S = 2, 1 to 30 for S = 30
- **AND** `[data-step="-1"]` has the `disabled` attribute at 1 and `[data-step="+1"]` at the top of the range, and a tap on a disabled button changes nothing

#### Scenario: Quantities are scaled

- **WHEN** the count is N on a recipe with servings S
- **THEN** each `.ingredient-qty` with a numeric quantity shows quantity × N ÷ S, rounded by "Scaled quantities are rounded for reading", followed by its unit unchanged; the ingredient's name and notes are unchanged
- **AND** an ingredient with no quantity ("salt and pepper", "a pinch") is unchanged
- **AND** when N returns to S every quantity reads exactly as the recipe stores it

#### Scenario: Scaled quantities are marked

- **WHEN** the count differs from the recipe's servings
- **THEN** each scaled `.ingredient-qty` has `data-scaled` and a computed `color` equal to `--color-biro`
- **AND** `.servings-note`, under the ingredients heading, reads "Scaled for N · amounts in the method are for S"
- **AND** when the count equals the recipe's servings no `.ingredient-qty` has `data-scaled` and `.servings-note` is empty, with the same bounding box as when it shows (tolerance 1px)

#### Scenario: Only the quantity text changes

- **WHEN** the cook taps `+` or `−`
- **THEN** the count changes by one and only the text of `.servings-count`, the `.ingredient-qty` elements and `.servings-note` changes: no element is added to or removed from `#page-left-content` or `#page-right-content`, and the method's text is unchanged

#### Scenario: Remembered for the session

- **WHEN** the cook sets the count to 3 on recipe A
- **THEN** `sessionStorage['rv-place:<A's id>']` records servings 3 alongside the ticks and step mark
- **AND** after a spread mode switch, a turn to another recipe and back, a refresh in place and a page reload, A shows 3 and its quantities scaled for 3
- **AND** a recipe whose record has no servings, or a value outside its range, shows the recipe's own servings (a stored value above the range is clamped to the top of the range)

#### Scenario: Nothing is saved

- **WHEN** the cook changes the count any number of times
- **THEN** no request is made to `/api/recipes` or `/api/chat`
- **AND** an `update_recipe` that re-renders the recipe keeps the count the cook set, clamped to the new range

### Requirement: Scaled quantities are rounded for reading

A scaled quantity q = quantity × N ÷ S SHALL be rounded for reading, not for chemistry, by its unit (matched case-insensitively, singular or plural). Halves round up. Fractions SHALL be shown with the characters ¼, ½ and ¾, after a whole number if there is one ("1¼").

#### Scenario: Grams and millilitres

- **WHEN** the unit is g, gram, ml or millilitre
- **THEN** q below 50 is rounded to a whole number, q from 50 to 500 to the nearest 5, and q above 500 to the nearest 10
- **AND** for S = 8: 100 g at N = 2 reads "25 g"; 150 g at N = 2 reads "38 g"; 500 g at N = 2 reads "125 g"; 450 g at N = 3 reads "170 g"; 900 ml at N = 7 reads "790 ml"

#### Scenario: Kilograms and litres

- **WHEN** the unit is kg, kilogram, l, litre or liter
- **THEN** q is rounded to one decimal place, with a trailing ".0" dropped
- **AND** for S = 8: 1.5 kg at N = 3 reads "0.6 kg"; 2 l at N = 4 reads "1 l"

#### Scenario: Cups and spoons

- **WHEN** the unit is cup, tbsp, tablespoon, tsp or teaspoon
- **THEN** q is rounded to the nearest ¼ and shown as a fraction
- **AND** for S = 8: 2 tbsp at N = 3 reads "¾ tbsp"; 1 tsp at N = 12 reads "1½ tsp"; 2 cups at N = 5 reads "1¼ cups"

#### Scenario: Counts without a unit

- **WHEN** the ingredient has a quantity and no unit (eggs, onions)
- **THEN** q is rounded to the nearest ½ and shown as a fraction
- **AND** for S = 8: 3 eggs at N = 3 reads "1 eggs" (the name is never changed); 3 eggs at N = 12 reads "4½ eggs"; 4 onions at N = 2 reads "1 onions"

#### Scenario: A count that rounds to nothing

- **WHEN** a rounded quantity would be 0
- **THEN** the quantity reads "a little of" followed by the unscaled quantity and unit, and still carries `data-scaled`
- **AND** for S = 8: 1 lemon (no unit) at N = 1 is q = 0.125, which rounds to 0, and reads "a little of 1 lemon"

#### Scenario: Any other unit

- **WHEN** the unit is anything else (cloves, sprigs, tins, pinch)
- **THEN** q is rounded to at most two decimal places, trailing zeros dropped
- **AND** for S = 8: 3 cloves at N = 3 reads "1.13 cloves"; 2 tins at N = 4 reads "1 tins"

### Requirement: Ingredient rows are tall enough to tick

Each ingredient row SHALL be tall enough that a fingertip lands on the row it is aimed at, and a ticked row SHALL stay easy to read, so a wrong tick is easy to spot at arm's length. At the desk (a fine pointer that can hover) a pointer lands where it is aimed, so the rows SHALL close up there.

#### Scenario: Row height

- **WHEN** a recipe is displayed in `cook` mode on a viewport wider than 600px
- **THEN** every `.ingredient-item` has a rendered height of at least 38px, made by vertical padding (computed `margin-top` and `margin-bottom` of 0), with its text vertically centred
- **AND** at the desk every `.ingredient-item` is at least 34px tall, and a one-line item at most 35px, likewise from padding
- **AND** on a viewport 600px wide or narrower every `.ingredient-item` on the Ingredients tab is at least 36px tall, likewise from padding

#### Scenario: The whole row is the tap target

- **WHEN** the cook taps a point inside an `.ingredient-item`'s bounding box, 2px inside its top or bottom edge
- **THEN** `document.elementFromPoint` there returns that item or a descendant, and the tap ticks that item
- **AND** consecutive rows leave no vertical gap: the next item's top equals this item's bottom (tolerance 1px)

#### Scenario: A fingertip lands on its row

- **WHEN** `tests/usability/runs/audit-post-steady/cook/remeasure.cjs ingredient-rows-tight-for-ticking` runs
- **THEN** of a 44px vertical sweep's five samples (the centre, ±11px, ±22px), the centre and both ±11px samples land on the row aimed at, at tablet and on the phone
- **AND** only the ±22px samples, which reach past a 38px row by design, may land on a neighbour: at most 2 times in 5

#### Scenario: A long list still fits

- **WHEN** Granny's Beef Lasagne (19 ingredients) is open in `cook` mode at 810×1080
- **THEN** `#page-left`'s `scrollHeight` does not exceed its `clientHeight`

### Requirement: The header leaves room for the method

The compact header SHALL put step 1 high enough on the page that most of a method is readable without scrolling.

#### Scenario: Wide viewports

- **WHEN** Lemon Drizzle Cake or Granny's Beef Lasagne is displayed at 810×1080, 1080×810 or 1280×800, in any spread mode, with `#page-right` scrolled to the top
- **THEN** the top of `.prep-step[data-step="1"]` is at most 180px below the top of `#page-right`

#### Scenario: Phone

- **WHEN** either recipe is displayed at 390×844 with the Ingredients tab active and scrolled to the top
- **THEN** the top of the first `.ingredient-item` is at most 260px from the top of the viewport (the book's chrome alone puts the first content row at 162px)

#### Scenario: Recorded before and after

- **WHEN** this change is verified
- **THEN** `tests/usability/runs/audit-post-steady/counter/remeasure.cjs header-block-before-method` is run on the code before and after it, and both outputs are recorded in `openspec/changes/cook-from-the-page/verification.md`

### Requirement: The book lies on a light linen desk

The page background SHALL be a light beige linen, a little lighter where the book lies, with a weave too fine to read as a pattern. Anything drawn on the desk SHALL be in ink, not cream, and the book SHALL cast a soft, warm shadow.

#### Scenario: The desk renders

- **WHEN** the chat page loads on a viewport wider than 600px
- **THEN** `body` has a computed background-color of `--color-desk` (`#ece4d4`) and a radial background image
- **AND** no `--color-wood-*` custom property is defined on the root element

#### Scenario: The label and user chip are ink on the desk

- **WHEN** the chat page loads on a viewport wider than 600px
- **THEN** `#recipe-book-header` has the computed colour of `--color-accent-brown`, and `.user-email` that of `--color-ink-dark`

#### Scenario: The phone label stays cream on the leather

- **WHEN** the chat page loads on a viewport 600px wide or narrower
- **THEN** `#recipe-book-header` has the computed colour of `--color-label-cream`

### Requirement: A page scrolls like paper

Above 600px a page whose content is longer than the page SHALL scroll with no scrollbar drawn, and where its text runs on below what is shown it SHALL fade out above the page's foot: above the slip and the reply sticky on the left page, above a 20px margin on the right. No line is shown cut in half by the slip or the page's edge. The fade SHALL move nothing, and the binding shadow along the spine SHALL stay on the page's edge while its content scrolls.

#### Scenario: No scrollbar

- **WHEN** a recipe longer than the page is displayed on a viewport wider than 600px
- **THEN** `#page-left` and `#page-right` have a computed `scrollbar-width` of `none`, and their `offsetWidth` equals their `clientWidth` plus their borders

#### Scenario: Text fades where it runs on

- **WHEN** Granny's Beef Lasagne is open in `cook` mode at 1512×860 with both pages scrolled to the top
- **THEN** each page's `.page-content::after` is a sticky strip whose top 28px fade from transparent to the paper colour, sitting just above the slip on the left page and at the foot on the right
- **AND** scrolled to the end, each page's last line lies wholly above the strip
- **AND** opening the recipe, switching mode, ticking and sending a note move nothing ("Nothing on the page moves unless the cook acted on it")

#### Scenario: The spine shadow stays put

- **WHEN** either page is scrolled to its end
- **THEN** the binding shadow is drawn along the whole height of the page's spine edge, as at the top

### Requirement: Times on the meta line read one way

A recipe's times, the total on the meta line (in the "⋯" popover on the phone) and the prep and cook breakdown in the "⋯" popover, SHALL use one format: minutes under an hour as "45m", whole hours as "2h", otherwise "2h 30m", the breakdown as "(40m prep · 2h 30m cook)". No time is shown as a raw count of minutes over 59.

#### Scenario: Hours and minutes

- **WHEN** a recipe with 40 minutes' prep and 150 minutes' cook is displayed
- **THEN** `.meta-total` reads "3h 10m" and `.recipe-more-panel .meta-breakdown` reads "(40m prep · 2h 30m cook)"

#### Scenario: Under an hour

- **WHEN** a recipe with 10 minutes' prep and 20 minutes' cook is displayed
- **THEN** `.meta-total` reads "30m" and `.recipe-more-panel .meta-breakdown` reads "(10m prep · 20m cook)"

### Requirement: The photo is taped to the page

A recipe's photo thumbnail on the title line SHALL be held on by a strip of tape across its top edge, drawn without changing the thumbnail's box, and SHALL be clear of the page's next arrow.

#### Scenario: Tape

- **WHEN** a recipe with a photo is displayed
- **THEN** `.recipe-polaroid::before` draws a translucent strip about half the photo's width across its top edge, taking no pointer input
- **AND** the photo's bounding box does not overlap `#page-next`'s bounding box

### Requirement: The left page has a margin rule

Above 600px the left page SHALL carry a notebook's margin rule: a very light 1px vertical line just inside the left-edge tab strip, the page's full height, which stays put while the page scrolls. The page's text SHALL start 12px past it, and the tab strip SHALL stay 10px in from the page's edge with its 44px hit area clear of the rule. An ingredient's tick SHALL be written in the margin, left of the rule.

#### Scenario: The rule and the text

- **WHEN** a recipe is open in `cook` mode on a viewport wider than 600px
- **THEN** `#page-left`'s first background layer draws a 1px line in `rgba(139, 45, 26, 0.16)` 50px from its left edge
- **AND** the first `.ingredient-item` starts 62px from `#page-left`'s left edge, and each visible `.contents-tab` spans 10px to 36px from it

#### Scenario: A tick is written in the margin

- **WHEN** the cook ticks an ingredient on the left page
- **THEN** its ✓ (`.ingredient-item[data-ticked="true"]::before`) lies between 10px and 49px from `#page-left`'s left edge, clear of the rule
