# Family Recipe UI

## Purpose

This capability defines the family recipe book user interface design system - a warm, handwritten aesthetic that transforms the functional chat interface into an inviting kitchen companion. The interface presents a notepad for chat interaction alongside a leather-bound recipe book for displaying recipes, all on a wood-textured background.

## Requirements

### Requirement: Main layout displays notepad and recipe book side by side

The interface SHALL display a notepad component on the left and a recipe book component on the right, separated by a 40px gap, on a dark wood-textured background.

#### Scenario: Default desktop layout

- **WHEN** the user loads the chat page on a viewport wider than 1000px
- **THEN** the notepad appears on the left (380px fixed width) and the recipe book appears on the right (flexible width, min 700px)

#### Scenario: Narrow viewport stacks components

- **WHEN** the user loads the chat page on a viewport narrower than 1000px
- **THEN** the notepad appears above the recipe book, both at full width

### Requirement: Background displays wood table texture

The page background SHALL simulate a dark wooden table surface using gradients and noise texture overlay.

#### Scenario: Wood background renders

- **WHEN** the chat page loads
- **THEN** the background displays a dark brown wood grain pattern with subtle vertical grain lines

### Requirement: Notepad component displays chat messages on aged paper

The notepad SHALL render chat messages on an aged paper background with a header, scrollable content area, and text input.

#### Scenario: Notepad structure renders correctly

- **WHEN** the chat page loads
- **THEN** the notepad displays with a cream-to-tan gradient background, a header reading "Recipe Development & Search", and a text input area at the bottom

#### Scenario: Chat messages display with speaker labels

- **WHEN** a user sends a message or receives an AI response
- **THEN** the message appears in the notepad content area with bold "User:" or "AI:" prefix in the Kalam handwritten font

### Requirement: Notepad content scrolls independently

The notepad content area SHALL scroll independently when messages exceed the visible area, with styled scrollbars matching the paper aesthetic.

#### Scenario: Notepad scrolls when content overflows

- **WHEN** chat messages exceed the notepad's visible height
- **THEN** the content area becomes scrollable while the header and input remain fixed

### Requirement: Recipe book displays as open two-page spread with leather cover

The recipe book SHALL render as an open book with a red leather cover frame containing two cream-colored pages side by side.

#### Scenario: Book structure renders correctly

- **WHEN** a recipe is loaded
- **THEN** the book displays with a red leather cover border, visible spine shadow down the center, and two pages (left and right)

#### Scenario: Left page shows ingredients

- **WHEN** a recipe is displayed
- **THEN** the left page shows the page number, recipe title, the meta line, and the ingredients list with each quantity in its own span

#### Scenario: Right page shows preparation steps

- **WHEN** a recipe is displayed
- **THEN** the right page shows the page number, a "method:" header, and numbered steps where each step number is rendered in Kalam in the leather red and the step text in the serif

### Requirement: Recipe book pages scroll independently

Each page of the recipe book SHALL scroll independently when content exceeds the visible area.

#### Scenario: Left page scrolls for long ingredient lists

- **WHEN** the ingredients list exceeds the left page's visible height
- **THEN** the left page content becomes scrollable while the right page remains independently scrollable

#### Scenario: Right page scrolls for long preparation steps

- **WHEN** the preparation steps exceed the right page's visible height
- **THEN** the right page content becomes scrollable while the left page remains independently scrollable

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

Text in the notepad and recipe book SHALL use two font families with appropriate fallbacks: Kalam (handwritten) for titles, section headers, letter headers, labels, step numbers, metadata and chat messages; Libre Baskerville (serif) for ingredient lines, method step text and contents entries.

#### Scenario: Font loads and applies

- **WHEN** the chat page loads
- **THEN** the page requests Kalam (300/400/700) and Libre Baskerville (400/700, italic 400) from Google Fonts
- **AND** headings, labels and metadata render in Kalam (or cursive fallback)
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

- **WHEN** a new chat message appears in the notepad or a new note appears in the page margin
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

The recipe book index alphabet navigation SHALL be usable in both wide side-by-side and narrow stacked layouts.

#### Scenario: Wide layout alphabet navigation
- **WHEN** the viewport is wider than the responsive stack breakpoint
- **THEN** the alphabet navigation is visible at the top of the index
- **AND** selecting a letter jumps to the matching index section

#### Scenario: Narrow layout alphabet navigation
- **WHEN** the viewport is at or below the responsive stack breakpoint
- **THEN** the alphabet navigation remains visible and clickable without overlapping index content
- **AND** selecting a letter jumps to the matching index section

### Requirement: Alphabet controls retain readability and affordance

Alphabet controls SHALL preserve readable typography and clear interactive affordance while remaining compact.

#### Scenario: Active and inactive letters are distinguishable
- **WHEN** the alphabet navigation is displayed
- **THEN** active letters are visually distinguishable from inactive letters
- **AND** inactive letters are non-interactive

#### Scenario: Compact styling remains operable
- **WHEN** the alphabet controls use minimal extra padding
- **THEN** users can still reliably select letters in desktop and touch-oriented layouts
