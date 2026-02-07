# recipe-browsing Specification

## Purpose
TBD - created by archiving change add-recipe-browsing-without-page-effect. Update Purpose after archive.
## Requirements
### Requirement: Recipe list is fetched fresh on navigation

The frontend SHALL fetch the current list of recipes from the API each time navigation is triggered, ensuring the list reflects any recipes created or deleted via chat.

#### Scenario: Fresh list fetched on arrow click

- **WHEN** the user clicks a navigation arrow
- **THEN** the frontend fetches `/api/recipes` to get the current alphabetically-sorted list before determining which recipe to display

#### Scenario: Empty recipe list handled

- **WHEN** the recipe list fetch returns zero recipes
- **THEN** both navigation arrows are disabled and the recipe book shows placeholder content

### Requirement: User can navigate to next recipe

The user SHALL be able to navigate to the next recipe in alphabetical order by clicking the forward arrow.

#### Scenario: Navigate to next recipe

- **WHEN** a recipe is displayed and the user clicks the ">" arrow
- **THEN** the next recipe in alphabetical order is loaded and displayed

#### Scenario: Forward arrow disabled at end of list

- **WHEN** the last recipe in alphabetical order is displayed
- **THEN** the ">" arrow is visually disabled and clicking it has no effect

### Requirement: User can navigate to previous recipe

The user SHALL be able to navigate to the previous recipe in alphabetical order by clicking the back arrow. When on the first recipe, the back arrow SHALL return to the index.

#### Scenario: Navigate to previous recipe

- **WHEN** a recipe is displayed and the user clicks the "<" arrow
- **THEN** the previous recipe in alphabetical order is loaded and displayed

#### Scenario: Back arrow from first recipe returns to index

- **WHEN** the first recipe in alphabetical order is displayed
- **THEN** clicking the "<" arrow returns to the index view
- **AND** the index is re-fetched fresh

### Requirement: Navigation from placeholder state loads first recipe

When the index is displayed, clicking the forward arrow SHALL load the first recipe. Clicking the back arrow SHALL be disabled. This replaces the previous behavior where both arrows loaded the first recipe from the placeholder state.

#### Scenario: Forward arrow from index

- **WHEN** the index is displayed and the user clicks the ">" arrow
- **THEN** the first recipe in alphabetical order is loaded and displayed
- **AND** the view mode changes to recipe view

#### Scenario: Back arrow from index

- **WHEN** the index is displayed and the user clicks the "<" arrow
- **THEN** nothing happens (the arrow is disabled since the index is the first page)

### Requirement: Current recipe ID is tracked

The frontend SHALL track the ID of the currently displayed recipe to determine position in the list during navigation.

#### Scenario: Position determined from current recipe ID

- **WHEN** the user clicks a navigation arrow
- **THEN** the frontend finds the current recipe's position in the freshly-fetched list by matching the stored recipe ID

#### Scenario: Current recipe ID updates after display

- **WHEN** a recipe is displayed (via chat or navigation)
- **THEN** the stored current recipe ID updates to match the displayed recipe

### Requirement: Current recipe was deleted

When navigating and the current recipe is not found, the system SHALL return to the index.

#### Scenario: Current recipe was deleted

- **WHEN** the user navigates and the current recipe ID is not found in the fresh list
- **THEN** the index view is displayed instead of the first recipe

