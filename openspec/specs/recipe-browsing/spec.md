# recipe-browsing Specification

## Purpose
Lets the cook page through the book recipe by recipe, keeping track of the open recipe, including when it is deleted.

## Requirements

### Requirement: User can navigate to next recipe

The user SHALL be able to navigate to the next recipe in alphabetical order by clicking the forward arrow. Navigation SHALL trigger a page-turn animation and attempt to use prefetched data for instant rendering.

#### Scenario: Navigate to next recipe

- **WHEN** a recipe is displayed and the user clicks the ">" arrow
- **THEN** the system checks the prefetch cache for the next recipe's data
- **AND** a forward page-turn animation plays while the next recipe content is rendered behind the overlay

#### Scenario: Forward arrow disabled at end of list

- **WHEN** the last recipe in alphabetical order is displayed
- **THEN** the ">" arrow is visually disabled and clicking it has no effect

### Requirement: User can navigate to previous recipe

The user SHALL be able to navigate to the previous recipe in alphabetical order by clicking the back arrow. When on the first recipe, the back arrow SHALL return to the index. Navigation SHALL trigger a page-turn animation.

#### Scenario: Navigate to previous recipe

- **WHEN** a recipe is displayed and the user clicks the "<" arrow
- **THEN** a backward page-turn animation plays while the previous recipe content is rendered behind the overlay

#### Scenario: Back arrow from first recipe returns to index

- **WHEN** the first recipe in alphabetical order is displayed
- **THEN** clicking the "<" arrow triggers a backward page-turn animation and returns to the index view
- **AND** the index is re-fetched fresh

### Requirement: Navigation from placeholder state loads first recipe

When the index is displayed, clicking the forward arrow SHALL load the first recipe with a page-turn animation. Clicking the back arrow SHALL be disabled.

#### Scenario: Forward arrow from index

- **WHEN** the index is displayed and the user clicks the ">" arrow
- **THEN** a forward page-turn animation plays and the first recipe in alphabetical order is displayed
- **AND** the view mode changes to recipe view

#### Scenario: Back arrow from index

- **WHEN** the index is displayed and the user clicks the "<" arrow
- **THEN** nothing happens (the arrow is disabled since the index is the first page)

### Requirement: Current recipe ID is tracked

The frontend SHALL track the ID of the currently displayed recipe to determine position in the list during navigation and to populate the current recipe context used by chat requests.

#### Scenario: Position determined from current recipe ID

- **WHEN** the user clicks a navigation arrow
- **THEN** the frontend finds the current recipe's position in the recipe list it already holds by matching the stored recipe ID

#### Scenario: Current recipe ID updates after display

- **WHEN** a recipe is displayed (via chat or navigation)
- **THEN** the stored current recipe ID updates to match the displayed recipe
- **AND** the current recipe context for chat requests updates to match

#### Scenario: Current recipe context cleared on index view

- **WHEN** the recipe index is displayed
- **THEN** the stored current recipe ID is cleared
- **AND** the current recipe context for chat requests is cleared

### Requirement: Current recipe was deleted

When navigating and the current recipe is not found, the system SHALL return to the index.

#### Scenario: Current recipe was deleted

- **WHEN** the user navigates and the current recipe ID is not found in the fresh list
- **THEN** the index view is displayed instead of the first recipe

### Requirement: Navigation uses the recipe list already held

The frontend SHALL determine the previous and next recipe from the recipe list it already holds, and SHALL NOT request the list during a page turn. The list SHALL be refreshed with `GET /api/recipes` only:
- when the contents are shown: on page load, on a return to the contents, or by the Contents spread tab;
- when a recipe is displayed whose id is not in the held list;
- when a chat turn whose stream included a `tool_use` event for `create_recipe`, `update_recipe` or `delete_recipe` ends.

#### Scenario: A page turn requests no list

- **WHEN** a recipe is displayed and the list is held
- **AND** the user turns to the next or previous recipe by the arrow, the footer link, the gutter chevron or a swipe
- **THEN** no request to `GET /api/recipes` is made between the tap and 500ms after the turn has finished (`isAnimating()` false)

#### Scenario: The list is refreshed when the contents are shown

- **WHEN** the contents are shown, by a page load, by a return to the contents, or by the Contents spread tab
- **THEN** exactly one request to `GET /api/recipes` is made for that showing

#### Scenario: A recipe new to the list refreshes it

- **WHEN** a recipe is displayed whose id is not in the held list (for example one just created through chat and shown by `display_recipe`)
- **THEN** the list is refreshed once
- **AND** the note input's page number (`#note-page-number`) and the enabled state of the previous and next controls reflect the recipe's position in the refreshed list

#### Scenario: A chat turn that created or deleted a recipe refreshes it

- **WHEN** a chat turn's stream included a `tool_use` event whose tool is `create_recipe`, `update_recipe` or `delete_recipe`
- **AND** the turn's `done` event arrives
- **THEN** the list is refreshed once and the navigation state is updated from it

#### Scenario: Empty recipe list handled

- **WHEN** the held recipe list contains zero recipes
- **THEN** both navigation arrows are disabled and the recipe book shows placeholder content
