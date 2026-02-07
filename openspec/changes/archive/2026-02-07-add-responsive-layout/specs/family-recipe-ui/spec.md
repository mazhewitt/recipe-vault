## MODIFIED Requirements

### Requirement: Main layout displays notepad and recipe book side by side

The interface SHALL display a notepad component on the left and a recipe book component on the right, separated by a 40px gap, on a dark wood-textured background. On tablet viewports, the components SHALL stack vertically with the recipe book on top. On mobile viewports, only one component is visible at a time.

#### Scenario: Default desktop layout

- **WHEN** the user loads the chat page on a viewport wider than 1024px
- **THEN** the notepad appears on the left (380px fixed width) and the recipe book appears on the right (flexible width, min 700px)

#### Scenario: Tablet viewport stacks with recipe book on top

- **WHEN** the user loads the chat page on a viewport between 601px and 1024px
- **THEN** the recipe book appears on top and the notepad appears below, both at full width
- **AND** the recipe book occupies approximately 55% of viewport height and the notepad occupies approximately 40%

#### Scenario: Mobile viewport shows one view at a time

- **WHEN** the user loads the chat page on a viewport of 600px or less
- **THEN** only the active view (recipe book or notepad) is visible, controlled by the mobile tab bar

### Requirement: Recipe book displays as open two-page spread with leather cover

The recipe book SHALL render as an open book with a red leather cover frame containing two cream-colored pages side by side. On mobile, the book SHALL display a single page.

#### Scenario: Book structure renders correctly

- **WHEN** a recipe is loaded on a viewport wider than 600px
- **THEN** the book displays with a red leather cover border, visible spine shadow down the center, and two pages (left and right)

#### Scenario: Left page shows ingredients

- **WHEN** a recipe is displayed on a viewport wider than 600px
- **THEN** the left page shows the page number, recipe title, ingredients list, and metadata (difficulty, servings, prep time, cook time)

#### Scenario: Right page shows preparation steps

- **WHEN** a recipe is displayed on a viewport wider than 600px
- **THEN** the right page shows the page number, "preparation" header, and numbered preparation steps

#### Scenario: Single page book on mobile

- **WHEN** a recipe is loaded on a viewport of 600px or less
- **THEN** the book displays with a thin leather cover border, no spine shadow, and a single full-width page

### Requirement: Recipe book pages scroll independently

Each page of the recipe book SHALL scroll independently when content exceeds the visible area. On mobile, the single page SHALL scroll.

#### Scenario: Left page scrolls for long ingredient lists

- **WHEN** the ingredients list exceeds the left page's visible height on a viewport wider than 600px
- **THEN** the left page content becomes scrollable while the right page remains independently scrollable

#### Scenario: Right page scrolls for long preparation steps

- **WHEN** the preparation steps exceed the right page's visible height on a viewport wider than 600px
- **THEN** the right page content becomes scrollable while the left page remains independently scrollable

#### Scenario: Single page scrolls on mobile

- **WHEN** the recipe content exceeds the single page's visible height on a mobile viewport
- **THEN** the single page scrolls vertically to reveal all content

### Requirement: Navigation arrows use book-consistent styling

The navigation arrows SHALL match the handwritten aesthetic of the recipe book. On touch devices, the arrows SHALL be larger for comfortable tapping.

#### Scenario: Arrow styling matches book theme

- **WHEN** the arrows are rendered
- **THEN** they use the Kalam font or a hand-drawn arrow style consistent with the book's visual design

#### Scenario: Arrows are enlarged on touch devices

- **WHEN** the arrows are rendered on a viewport of 1024px or less
- **THEN** the arrow buttons are at least 44px x 44px for comfortable touch targets
