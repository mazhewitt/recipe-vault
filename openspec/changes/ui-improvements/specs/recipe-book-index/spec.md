## ADDED Requirements

### Requirement: Recipe Book header navigates to index

The "Recipe Book" header SHALL navigate to the recipe index when clicked.

#### Scenario: Header click from recipe view
- **WHEN** a recipe is displayed
- **AND** the user clicks the "Recipe Book" header
- **THEN** the recipe index view is rendered
- **AND** the current recipe context is cleared
- **AND** the index data is fetched fresh

#### Scenario: Header click from index view
- **WHEN** the index view is already displayed
- **AND** the user clicks the "Recipe Book" header
- **THEN** the index view remains displayed
