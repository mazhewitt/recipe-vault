# Family Recipe UI

## Purpose

This capability defines the family recipe book user interface design system - a warm, handwritten aesthetic that transforms the functional chat interface into an inviting kitchen companion. The interface presents a leather-bound recipe book that fills the width, with a "note to the cook" input attached to it, all on a wood-textured background.

## Requirements

### Requirement: Main layout displays the recipe book alone

The interface SHALL display the recipe book alone, filling the available width, on a dark wood-textured background, with the chat note input attached to the book.

#### Scenario: Default desktop layout

- **WHEN** the user loads the chat page on a viewport wider than 1024px
- **THEN** the recipe book is centred and fills the width (up to its maximum), with no notepad panel
- **AND** the note input sits at the foot of the right page

#### Scenario: Narrow viewport stacks components

- **WHEN** the user loads the chat page on a viewport 1024px wide or narrower but wider than 600px
- **THEN** the book keeps its two-page spread at full width
- **AND** the margin column collapses so notes render beneath the right page content
- **AND** the note input remains at the foot of the right page

#### Scenario: Phone layout

- **WHEN** the user loads the chat page on a viewport 600px wide or narrower
- **THEN** a single cream page inside a thin leather frame fills the width, with the book label top-left and the timer pill top-right
- **AND** the note input is a cream bar beneath the book with a red send button
- **AND** there is no Book/Chat tab bar

### Requirement: Background displays wood table texture

The page background SHALL simulate a dark wooden table surface using gradients and noise texture overlay.

#### Scenario: Wood background renders

- **WHEN** the chat page loads
- **THEN** the background displays a dark brown wood grain pattern with subtle vertical grain lines

### Requirement: Recipe book displays as open two-page spread with leather cover

The recipe book SHALL render as an open book with a red leather cover frame containing two cream-colored pages side by side; while a recipe is open the left page shows the contents and the right page shows the recipe.

#### Scenario: Book structure renders correctly

- **WHEN** a recipe is loaded
- **THEN** the book displays with a red leather cover border, visible spine shadow down the center, and two pages (left and right)

#### Scenario: Left page shows ingredients

- **WHEN** a recipe is displayed on a viewport wider than 600px
- **THEN** the left page shows the contents in a single column (title, A–Z strip, letter groups) with the current recipe's entry marked `current`
- **AND** ingredients are not on the left page

#### Scenario: Right page shows preparation steps

- **WHEN** a recipe is displayed on a viewport wider than 600px
- **THEN** the right page shows the recipe title with a 96×76 polaroid photo (or none), the meta line, an "ingredients:" header and list, a "method:" header and numbered steps where each step number is rendered in Kalam in the leather red and the step text in the serif
- **AND** the margin column sits to the right of the recipe body
- **AND** each ingredient line may pack up to three short items separated by " · " while every item keeps its own `.ingredient-item` span

#### Scenario: Phone shows one page

- **WHEN** a recipe is displayed on a viewport 600px wide or narrower
- **THEN** only the right page is visible, showing the title, polaroid, meta line and the active tab's content one item per line at 16px
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

The recipe metadata SHALL display as a single handwritten meta line beneath the recipe title: total time, servings and difficulty (as dots), with prep and cook times shown muted in parentheses when present.

#### Scenario: Difficulty renders as filled dots

- **WHEN** a recipe with difficulty level 2 is displayed
- **THEN** the meta line shows a "difficulty" label followed by 2 filled dots and 3 empty dots

#### Scenario: Total time displays when available

- **WHEN** a total time value is derived for a recipe
- **THEN** the meta line shows it formatted as `NN min` (under 60 minutes) or `Xh YY` (60 minutes or more)

#### Scenario: Time values display with clock icons

- **WHEN** a recipe with prep time and/or cook time is displayed
- **THEN** the meta line ends with a muted `(prep N · cook M)` group listing whichever values are present

#### Scenario: Servings display when available

- **WHEN** a recipe with a servings value is displayed
- **THEN** the meta line shows `serves N`

#### Scenario: Total time is omitted when unavailable

- **WHEN** total time, servings or difficulty is not available for a recipe
- **THEN** that item is not rendered in the meta line, and the line is omitted entirely when none are available

### Requirement: Empty recipe book shows placeholder

The recipe book SHALL display the recipe index as its default state instead of placeholder content. The placeholder is replaced by the index view.

#### Scenario: No recipe selected

- **WHEN** the chat page loads without a recipe displayed
- **THEN** the recipe book shows the alphabetical recipe index (not placeholder text)

#### Scenario: No recipes exist

- **WHEN** the chat page loads and no recipes exist in the vault
- **THEN** the recipe book shows a friendly empty state message within the index view (e.g., "Your recipe book is empty. Ask me to create a recipe!")

### Requirement: Timer widget displays as fixed speech bubble

The timer widget SHALL render as a cream pill clipped to the top-right edge of the recipe book cover, positioned relative to the book rather than the viewport, with a clock icon, the timer label and remaining time, and a close control with a target of at least 28×28px. It SHALL never overlap the user identity pill.

#### Scenario: Timer renders correctly

- **WHEN** a timer is running
- **THEN** the timer widget appears as a cream pill overlapping the top-right edge of the book cover with a clock icon, the timer label and the remaining time
- **AND** the pill has no speech-bubble tail

#### Scenario: Timer does not overlap the user pill

- **WHEN** a timer is running at the desktop or tablet breakpoint
- **THEN** the bounding box of the timer pill does not intersect the bounding box of the user identity pill
- **AND** the pill is fully visible within the viewport

#### Scenario: Close control is large enough

- **WHEN** the timer pill is visible at any breakpoint
- **THEN** the cancel button has a clickable area of at least 28×28 pixels

#### Scenario: Compact pill on phone

- **WHEN** a timer is running at the phone breakpoint (600px or narrower)
- **THEN** the pill sits at the top-right of the book frame at a height of 30px or less with smaller text and icon
- **AND** the cancel button still has a clickable area of at least 28×28 pixels

#### Scenario: Pill is hidden when no timer runs

- **WHEN** no timer is running
- **THEN** the timer widget is not displayed

### Requirement: Typography uses Kalam handwritten font

Text in the recipe book and note input SHALL use two font families with appropriate fallbacks: Kalam (handwritten) for titles, section headers, letter headers, labels, step numbers, metadata, tabs, notes and the note input; Libre Baskerville (serif) for ingredient lines, method step text and contents entries.

#### Scenario: Font loads and applies

- **WHEN** the chat page loads
- **THEN** the page requests Kalam (300/400/700) and Libre Baskerville (400/700, italic 400) from Google Fonts
- **AND** headings, labels, metadata, tabs, notes and the note input render in Kalam (or cursive fallback)
- **AND** the ingredients list, method steps and contents entries render in Libre Baskerville (or Georgia / serif fallback)

#### Scenario: Body text stays readable on paper

- **WHEN** serif body text is rendered on the page background
- **THEN** it is at least 14px and no lighter than the `--color-ink-light` token

### Requirement: Design tokens define consistent theming

The CSS SHALL define design tokens as custom properties for colors, typography, spacing, and shadows.

#### Scenario: Custom properties are defined

- **WHEN** the chat page loads
- **THEN** CSS custom properties for wood colors, leather colors, paper colors, ink colors, and spacing are available on the root element

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

The recipe photo in the recipe book SHALL open a full-window preview when clicked, with the preview image constrained to fit within the viewport.

#### Scenario: Click recipe photo shows preview
- **WHEN** a recipe is displayed with a photo
- **AND** the user clicks the photo
- **THEN** a full-window overlay appears showing the photo
- **AND** the photo is scaled to fit within the viewport width or height (whichever is smaller)

#### Scenario: Preview can be dismissed
- **WHEN** the photo preview overlay is visible
- **THEN** the user can dismiss it and return to the recipe view

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

The chat input SHALL be a single "note to the cook" control attached to the book, replacing the notepad input.

#### Scenario: Desktop note input

- **WHEN** the viewport is wider than 600px
- **THEN** a `.note-input` with a pencil icon, a textarea with placeholder "Write a note to the cook…", a paperclip attach button and the current page number sits at the foot of the right page

#### Scenario: Phone note input

- **WHEN** the viewport is 600px wide or narrower
- **THEN** the `.note-input` is a cream bar beneath the book with a red send button, and every control has at least a 44px touch target

#### Scenario: Existing input ids are preserved

- **WHEN** the chat page loads
- **THEN** the elements `#message-input`, `#clipboard-button`, `#image-upload`, `#image-attachment` and `#loading` exist inside `.note-input`
- **AND** image paste, image upload and the loading indicator work as before

#### Scenario: Page number follows the open page

- **WHEN** a recipe at position i in the alphabetical list is open
- **THEN** the note input shows "p. N" where N = 2 * i + 3
- **AND** on the contents page it shows "p. 1"

#### Scenario: Sending a note

- **WHEN** the user presses Enter (without Shift) or taps the send button
- **THEN** the note is sent and the textarea is cleared
- **AND** error toasts for oversized images appear inside `.note-input`

### Requirement: Phone page tabs

On phones the recipe page SHALL offer three paper tabs on its top edge — Ingredients, Method, Notes — switched by tap only.

#### Scenario: Tabs render on a recipe

- **WHEN** a recipe is displayed on a viewport 600px wide or narrower
- **THEN** `.page-tabs` shows three tabs; the active tab is cream and joined to the page, inactive tabs are tan and brown
- **AND** the Ingredients tab is active when a recipe is opened

#### Scenario: Tapping a tab switches content

- **WHEN** the user taps Method
- **THEN** the page crossfades over 200ms to show the method steps and hides the ingredients
- **AND** the last three margin notes render beneath the visible content

#### Scenario: Notes tab shows the full thread

- **WHEN** the user taps Notes
- **THEN** the page shows `.notes-thread` with every entry of the session's chat thread in order (user notes and replies)

#### Scenario: Tabs are tap only

- **WHEN** the user swipes horizontally on the recipe page
- **THEN** the swipe navigates between recipes as before
- **AND** the active tab does not change

#### Scenario: Tabs hidden off the recipe page

- **WHEN** the contents page or a meal plan is displayed
- **THEN** `.page-tabs` is not shown

### Requirement: Right page edge tabs

On viewports wider than 600px the right page SHALL carry edge tabs Ingredients, Method and Notes on its outer edge.

#### Scenario: Edge tabs render on a recipe

- **WHEN** a recipe is displayed on a viewport wider than 600px
- **THEN** `.edge-tabs` shows three coloured tabs on the right outer edge of the right page

#### Scenario: Ingredients and Method scroll the page

- **WHEN** the user clicks Ingredients or Method
- **THEN** the right page scrolls so that section's header is at the top of the visible area
- **AND** the clicked tab is marked active

#### Scenario: Notes shows the thread

- **WHEN** the user clicks Notes
- **THEN** the right page shows `.notes-thread` in place of the recipe body until Ingredients or Method is clicked
- **AND** the margin column and note input remain in place

#### Scenario: Edge tabs hidden off the recipe page

- **WHEN** the contents page or a meal plan is displayed
- **THEN** `.edge-tabs` is not shown
