## MODIFIED Requirements

### Requirement: Navigation from placeholder state loads first recipe

When the index is displayed, clicking the forward arrow SHALL load the first recipe. Clicking the back arrow SHALL be disabled. This replaces the previous behavior where both arrows loaded the first recipe from the placeholder state.

#### Scenario: Forward arrow from index

- **WHEN** the index is displayed and the user clicks the ">" arrow
- **THEN** the first recipe in alphabetical order is loaded and displayed
- **AND** the view mode changes to recipe view

#### Scenario: Back arrow from index

- **WHEN** the index is displayed and the user clicks the "<" arrow
- **THEN** nothing happens (the arrow is disabled since the index is the first page)

### Requirement: User can navigate to previous recipe

The user SHALL be able to navigate to the previous recipe in alphabetical order by clicking the back arrow. When on the first recipe, the back arrow SHALL return to the index.

#### Scenario: Navigate to previous recipe

- **WHEN** a recipe is displayed and the user clicks the "<" arrow
- **THEN** the previous recipe in alphabetical order is loaded and displayed

#### Scenario: Back arrow from first recipe returns to index

- **WHEN** the first recipe in alphabetical order is displayed
- **THEN** clicking the "<" arrow returns to the index view
- **AND** the index is re-fetched fresh

### Requirement: Current recipe was deleted

When navigating and the current recipe is not found, the system SHALL return to the index.

#### Scenario: Current recipe was deleted

- **WHEN** the user navigates and the current recipe ID is not found in the fresh list
- **THEN** the index view is displayed instead of the first recipe
