## MODIFIED Requirements

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
