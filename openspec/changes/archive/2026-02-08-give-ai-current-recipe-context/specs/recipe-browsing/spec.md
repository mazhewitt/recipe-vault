## MODIFIED Requirements

### Requirement: Current recipe ID is tracked

The frontend SHALL track the ID of the currently displayed recipe to determine position in the list during navigation and to populate the current recipe context used by chat requests.

#### Scenario: Position determined from current recipe ID

- **WHEN** the user clicks a navigation arrow
- **THEN** the frontend finds the current recipe's position in the freshly-fetched list by matching the stored recipe ID

#### Scenario: Current recipe ID updates after display

- **WHEN** a recipe is displayed (via chat or navigation)
- **THEN** the stored current recipe ID updates to match the displayed recipe
- **AND** the current recipe context for chat requests updates to match

#### Scenario: Current recipe context cleared on index view

- **WHEN** the recipe index is displayed
- **THEN** the stored current recipe ID is cleared
- **AND** the current recipe context for chat requests is cleared
