## MODIFIED Requirements

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
- **THEN** the right page shows the compact header of "Recipe metadata displays with icons" (the title line, then the meta line), a "method:" header and numbered steps where each step number is rendered in Kalam in the leather red and the step text in the serif
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
- **AND** the footer reads "‹ previous recipe", the page number and "next recipe ›"

### Requirement: Recipe metadata displays with icons

The recipe header SHALL be compact and the same in every spread mode: a title line holding the title, a small tilted photo thumbnail and a "⋯" button, and beneath it one meta line holding the servings stepper and the total time. The difficulty dots, the tag chips, the prep/cook split, share and add-photo SHALL be in a popover the "⋯" button opens. The difficulty SHALL occupy a fixed-width slot inside that popover that is present before its value is known.

#### Scenario: The title line

- **WHEN** a recipe with a photo is displayed on a viewport wider than 600px
- **THEN** `.recipe-title-row` holds `.recipe-title` at its current font-size, `.recipe-polaroid` drawn as a thumbnail of 44×44px (tolerance 4px, before rotation) with its tilt, and `button.recipe-more` reading "⋯" with `aria-haspopup="dialog"` and `aria-expanded="false"`
- **AND** a recipe without a photo shows no thumbnail, and `button.recipe-more` keeps its place at the line's end
- **AND** tapping the thumbnail opens the full-window photo preview ("Recipe photo opens full-window preview on click")

#### Scenario: The meta line

- **WHEN** a recipe with servings 8 and a total time is displayed on a viewport wider than 600px
- **THEN** `.recipe-meta-line` is the line under `.recipe-title-row` and reads "serves − 8 + · 1h 05" (the stepper of "A servings stepper scales the page", then the total time)
- **AND** it renders in a single line: its height is no more than 48px
- **AND** it contains no `.meta-difficulty`, `.recipe-tags`, `.meta-breakdown`, `.share-btn` or `.add-photo-btn`
- **AND** `method:` follows it

#### Scenario: Servings display when available

- **WHEN** a recipe with a servings value is displayed
- **THEN** the meta line shows `serves`, the stepper and the servings the page shows ("A servings stepper scales the page"), in place of the former `serves N`

#### Scenario: Difficulty renders as filled dots

- **WHEN** a recipe with difficulty level 2 is displayed and the cook opens the "⋯" popover
- **THEN** `.recipe-more-panel .meta-difficulty` shows a "difficulty" label followed by 2 filled dots and 3 empty dots

#### Scenario: Time values display with clock icons

- **WHEN** a recipe with prep time and/or cook time is displayed and the cook opens the "⋯" popover
- **THEN** `.recipe-more-panel .meta-breakdown` shows a muted `(prep N · cook M)` group listing whichever values are present
- **AND** `.recipe-meta-line` contains no `.meta-breakdown`

#### Scenario: Total time displays when available

- **WHEN** a total time value is derived for a recipe
- **THEN** the meta line (above 600px) or the popover (at 600px and narrower) shows it formatted as `NN min` (under 60 minutes) or `Xh YY` (60 minutes or more)

#### Scenario: Total time is omitted when unavailable

- **WHEN** a recipe has no servings, or no total time
- **THEN** that item is not rendered: no stepper without servings, no total time without one
- **AND** the meta line itself is always rendered, one line tall, so a recipe without either keeps the method where it would be

#### Scenario: The popover's contents

- **WHEN** the cook taps `button.recipe-more`
- **THEN** `.recipe-more-panel[role="dialog"]` is shown, anchored under the button, and the button has `aria-expanded="true"`
- **AND** the panel holds `.meta-difficulty`, `.recipe-tags` with up to three tag chips, `.meta-breakdown`, `.share-btn` and `.add-photo-btn`, and on the phone also the total time
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
- **THEN** `.recipe-more-panel .meta-difficulty` is present, shows no dots, and is as wide as it is when it holds the label and five dots
- **AND** when the difficulty arrives later, with the popover open or closed, only the slot's contents change: the title line, the meta line and every `.prep-step` keep their bounding boxes (tolerance 1px)

#### Scenario: The same header in every mode

- **WHEN** a recipe is open on a viewport wider than 600px and the cook switches Cook → Notes → Contents → Cook
- **THEN** `.recipe-title-row`, `.recipe-meta-line` and `button.recipe-more` have the same contents and the same bounding boxes in every mode (tolerance 1px)

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

- **WHEN** the right-edge strip is shown as ribbons ("Right page edge ribbons")
- **THEN** `.edge-tab` is exempt from the hit-area test, because it takes no taps at all
- **AND** if a future state makes `.edge-tabs` a working tab list again, each `.edge-tab` must pass the test in that state

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

## ADDED Requirements

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

Each ingredient row SHALL be tall enough that a fingertip lands on the row it is aimed at, and a ticked row SHALL stay easy to read, so a wrong tick is easy to spot at arm's length.

#### Scenario: Row height

- **WHEN** a recipe is displayed in `cook` mode on a viewport wider than 600px
- **THEN** every `.ingredient-item` has a rendered height of at least 38px, made by vertical padding (computed `margin-top` and `margin-bottom` of 0), with its text vertically centred
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
- **THEN** the top of the first `.ingredient-item` is at most 200px from the top of the viewport

#### Scenario: Recorded before and after

- **WHEN** this change is verified
- **THEN** `tests/usability/runs/audit-post-steady/counter/remeasure.cjs header-block-before-method` is run on the code before and after it, and both outputs are recorded in `openspec/changes/cook-from-the-page/verification.md`
