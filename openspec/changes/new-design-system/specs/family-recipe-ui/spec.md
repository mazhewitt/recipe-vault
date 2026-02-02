## ADDED Requirements

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
- **THEN** the left page shows the page number, recipe title, ingredients list, and metadata (difficulty, servings, prep time, cook time)

#### Scenario: Right page shows preparation steps

- **WHEN** a recipe is displayed
- **THEN** the right page shows the page number, "preparation" header, and numbered preparation steps

### Requirement: Recipe book pages scroll independently

Each page of the recipe book SHALL scroll independently when content exceeds the visible area.

#### Scenario: Left page scrolls for long ingredient lists

- **WHEN** the ingredients list exceeds the left page's visible height
- **THEN** the left page content becomes scrollable while the right page remains independently scrollable

#### Scenario: Right page scrolls for long preparation steps

- **WHEN** the preparation steps exceed the right page's visible height
- **THEN** the right page content becomes scrollable while the left page remains independently scrollable

### Requirement: Recipe metadata displays with icons

The recipe metadata section SHALL display difficulty (as dots), servings, prep time, and cooking time with hand-drawn style icons.

#### Scenario: Difficulty renders as filled dots

- **WHEN** a recipe with difficulty level 2 is displayed
- **THEN** the difficulty indicator shows 2 filled dots and 3 empty dots

#### Scenario: Time values display with clock icons

- **WHEN** a recipe with prep time and cook time is displayed
- **THEN** prep time and cook time appear with clock/pot icons and formatted duration

### Requirement: Empty recipe book shows placeholder

The recipe book SHALL display placeholder content when no recipe is selected.

#### Scenario: No recipe selected

- **WHEN** the chat page loads without a recipe displayed
- **THEN** the recipe book shows placeholder text indicating the user should select or create a recipe

### Requirement: Timer widget displays as fixed speech bubble

The timer widget SHALL appear as a fixed-position speech bubble in the top-right corner of the viewport.

#### Scenario: Timer renders correctly

- **WHEN** the chat page loads
- **THEN** a timer widget appears fixed at top-right with a clock icon, "Timer:" label, and time display in a speech bubble shape

### Requirement: Typography uses Kalam handwritten font

All text in the notepad and recipe book SHALL use the Kalam font family with appropriate fallbacks.

#### Scenario: Font loads and applies

- **WHEN** the chat page loads
- **THEN** all text renders in Kalam font (or cursive fallback if font fails to load)

### Requirement: Design tokens define consistent theming

The CSS SHALL define design tokens as custom properties for colors, typography, spacing, and shadows.

#### Scenario: Custom properties are defined

- **WHEN** the chat page loads
- **THEN** CSS custom properties for wood colors, leather colors, paper colors, ink colors, and spacing are available on the root element

### Requirement: Transitions provide smooth interactions

UI state changes SHALL use CSS transitions for smooth, pleasant animations.

#### Scenario: New messages animate in

- **WHEN** a new chat message appears
- **THEN** the message fades in with a subtle upward slide over 200-300ms

#### Scenario: Hover states transition smoothly

- **WHEN** the user hovers over interactive elements
- **THEN** hover effects (shadow, scale) transition smoothly over 150ms
