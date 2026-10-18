## MODIFIED Requirements

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

### Requirement: Recipe text is sized for reading from the counter

While a recipe is displayed, ingredient lines and method step text SHALL render at 18px on viewports wider than 600px and at 17px on viewports 600px wide or narrower, and step durations at 15px. The exception is the desk: on a viewport wider than 600px whose primary pointer is fine and can hover (`(hover: hover) and (pointer: fine)`, a mouse or trackpad), the book is read from a chair. There, ingredient lines and method step text SHALL render at 16px and step durations at 14px, the rest of the book's type at about 90% of its counter size, and every box and hit area at its counter size. Ingredient lines SHALL be one per row at an even pitch. The contents page and the Notes thread keep their own sizes.

#### Scenario: Tablet

- **WHEN** a recipe is displayed on a viewport wider than 600px with a coarse primary pointer
- **THEN** `.ingredient-item` on the left page in `cook` mode, and `.prep-step .step-text` in every spread mode, have a computed font-size of 18px
- **AND** `.step-duration` has a computed font-size of 15px
- **AND** the computed line-height of the method list is at least 1.6 times its font-size

#### Scenario: At the desk

- **WHEN** a recipe is displayed on a viewport wider than 600px whose primary pointer is fine and can hover
- **THEN** `.ingredient-item` on the left page in `cook` mode, and `.prep-step .step-text` in every spread mode, have a computed font-size of 16px
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

### Requirement: Recipe metadata displays with icons

The recipe header SHALL be compact and the same in every spread mode: a title line holding the title, a small tilted photo thumbnail and a "⋯" button, and beneath it one meta line, set in the serif, holding the servings stepper and the total time. The difficulty dots, the tag chips, the prep/cook split, share and add-photo SHALL be in a popover the "⋯" button opens. The difficulty SHALL occupy a fixed-width slot inside that popover that is present before its value is known.

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

- **WHEN** a recipe with difficulty level 2 is displayed and the cook opens the "⋯" popover
- **THEN** `.recipe-more-panel .meta-difficulty` shows a "difficulty" label followed by 2 filled dots and 3 empty dots

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

- **WHEN** the book is displayed on a viewport wider than 600px
- **THEN** the right page's edge holds no strip, so there is no `.edge-tabs` or `.edge-tab` to exempt (the ribbons were removed with "Right page edge ribbons")
- **AND** if a future state puts tabs on the right edge again, each must pass the hit-area test

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Background displays wood table texture

**Reason**: The owner found the dark wood muddy around the cream pages (2026-10-18) and asked for a light beige.
**Migration**: Replaced by "The book lies on a light linen desk". The `--color-wood-*` tokens are gone; use `--color-desk`, `--color-desk-light` and `--color-desk-shade`.

### Requirement: Right page edge ribbons

**Reason**: The inert ribbons read as tabs that do nothing: blank beige tabs on the page's edge, flagged by the 2026-10-18 usability audit (`ribbons-look-like-tabs`) and by a design review of the owner's trial. Above 600px both sections are on the spread at once, so there is nothing for a tab to switch.
**Migration**: None. `.edge-tabs` and `.edge-tab` are gone from `chat.html` and `styles.css`; the phone keeps its `.page-tabs`. The scenario "Ribbons are exempt while they take no input" of "Every control the cook taps has a 44px hit area" is rewritten by this change to say the edge holds no strip.
