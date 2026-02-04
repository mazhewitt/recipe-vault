## ADDED Requirements

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
