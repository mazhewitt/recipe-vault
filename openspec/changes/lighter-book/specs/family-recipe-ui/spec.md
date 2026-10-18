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

Text in the recipe book and note input SHALL use two font families with appropriate fallbacks: Kalam (handwritten) for titles, section headers, letter headers, labels, step numbers, tabs, notes and the note input; Libre Baskerville (serif) for ingredient lines, method step text, contents entries and the recipe's meta line (it is data: times, servings, difficulty), the meta line with tabular figures. A section header SHALL be a capitalised word ("Ingredients", "Method") over one rule, not an underlined word over a rule.

#### Scenario: Font loads and applies

- **WHEN** the chat page loads
- **THEN** the page requests Kalam (300/400/700) and Libre Baskerville (400/700, italic 400) from Google Fonts
- **AND** headings, labels, tabs, notes and the note input render in Kalam (or cursive fallback)
- **AND** the ingredients list, method steps, contents entries and `.recipe-meta-line` render in Libre Baskerville (or Georgia / serif fallback), the meta line with `font-variant-numeric: tabular-nums`

#### Scenario: Section headers carry one rule

- **WHEN** a recipe is displayed
- **THEN** the section headers read "Ingredients" and "Method", each with a bottom border and a computed `text-decoration-line` of `none`

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

The meta line's total time and its prep and cook breakdown SHALL use one format: minutes under an hour as "45m", whole hours as "2h", otherwise "2h 30m", the breakdown as "(40m prep · 2h 30m cook)". No time is shown as a raw count of minutes over 59.

#### Scenario: Hours and minutes

- **WHEN** a recipe with 40 minutes' prep and 150 minutes' cook is displayed
- **THEN** `.meta-total` reads "3h 10m" and `.meta-breakdown` reads "(40m prep · 2h 30m cook)"

#### Scenario: Under an hour

- **WHEN** a recipe with 10 minutes' prep and 20 minutes' cook is displayed
- **THEN** `.meta-total` reads "30m" and `.meta-breakdown` reads "(10m prep · 20m cook)"

### Requirement: The photo is taped to the page

A recipe's photo on the page SHALL be held on by a strip of tape across its top edge, drawn without changing the photo's box, and SHALL be clear of the page's next arrow.

#### Scenario: Tape

- **WHEN** a recipe with a photo is displayed
- **THEN** `.recipe-polaroid::before` draws a translucent strip about half the photo's width across its top edge, taking no pointer input
- **AND** the photo's bounding box does not overlap `#page-next`'s bounding box

## REMOVED Requirements

### Requirement: Background displays wood table texture

**Reason**: The owner found the dark wood muddy around the cream pages (2026-10-18) and asked for a light beige.
**Migration**: Replaced by "The book lies on a light linen desk". The `--color-wood-*` tokens are gone; use `--color-desk`, `--color-desk-light` and `--color-desk-shade`.

### Requirement: Right page edge ribbons

**Reason**: The inert ribbons read as tabs that do nothing: blank beige tabs on the page's edge, flagged by the 2026-10-18 usability audit (`ribbons-look-like-tabs`) and by a design review of the owner's trial. Above 600px both sections are on the spread at once, so there is nothing for a tab to switch.
**Migration**: None. `.edge-tabs` and `.edge-tab` are gone from `chat.html` and `styles.css`; the phone keeps its `.page-tabs`. The scenario "Ribbons are exempt while they take no input" of "Every control the cook taps has a 44px hit area" no longer applies to anything.
