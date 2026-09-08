## MODIFIED Requirements

### Requirement: Index splits across two pages

The index SHALL distribute recipes across the left and right book pages for balanced readability **while the spread mode is `contents` and no recipe is open**. When a recipe is open the contents occupy a single page.

#### Scenario: Even distribution

- **WHEN** there are 10 recipes in the vault and no recipe is open
- **THEN** the left page displays the first 5 recipes (alphabetically) and the right page displays the last 5

#### Scenario: Odd number distribution

- **WHEN** there are 11 recipes in the vault and no recipe is open
- **THEN** the left page displays the first 6 recipes and the right page displays the last 5

#### Scenario: Single recipe

- **WHEN** there is 1 recipe in the vault and no recipe is open
- **THEN** the left page displays that recipe and the right page is empty or shows minimal content

#### Scenario: Contents alongside an open recipe

- **WHEN** a recipe is open and the spread mode is `contents`
- **THEN** the whole contents render as one scrolling column on the left page
- **AND** the right page shows the open recipe rather than a second half of the contents

### Requirement: Clicking a recipe name displays that recipe

Each recipe name in the index SHALL be clickable and navigate directly to that recipe's full display, opening it in cook mode.

#### Scenario: Click recipe in index

- **WHEN** the user clicks a recipe name in the index
- **THEN** the recipe book fetches and displays that recipe's full details (ingredients, steps)
- **AND** the view mode changes from index to recipe
- **AND** the spread mode becomes `cook`, so the ingredients take the left page and the method the right

#### Scenario: Clicked recipe loads with loading state

- **WHEN** the user clicks a recipe name in the index
- **THEN** the recipe book shows the loading skeleton while fetching the recipe data

### Requirement: Recipe Book header navigates to index

The "Recipe Book" header SHALL navigate to the recipe index when clicked, returning the spread to contents mode.

#### Scenario: Header click from recipe view
- **WHEN** a recipe is displayed
- **AND** the user clicks the "Recipe Book" header
- **THEN** the recipe index view is rendered across both pages
- **AND** the current recipe context is cleared
- **AND** the index data is fetched fresh
- **AND** the spread mode becomes `contents` and the left-edge tab strip reverts to the contents filters

#### Scenario: Header click from index view
- **WHEN** the index view is already displayed
- **AND** the user clicks the "Recipe Book" header
- **THEN** the index view remains displayed
