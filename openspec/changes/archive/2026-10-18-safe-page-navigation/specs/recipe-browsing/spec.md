## REMOVED Requirements

### Requirement: Recipe list is fetched fresh on navigation

**Reason**: Every arrow tap, footer link and swipe force-refetched the whole list before the turn could start, and that refetch emptied the prefetch cache, so every turn waited a round trip and then rendered over a loading skeleton. The 2026-10-17 audit measured 632ms to the new recipe at 300ms API latency, with the cook tapping again because the first tap seemed to have missed.

**Migration**: Navigation uses the list the page already holds; see "Navigation uses the recipe list already held" below for when that list is refreshed. The "Empty recipe list handled" scenario moves there unchanged in substance. Recipes created or deleted through chat still reach the list: a `recipe_artifact` for an id not in the list, and a chat turn that ran `create_recipe`, `update_recipe` or `delete_recipe`, each refresh it.

## ADDED Requirements

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

## MODIFIED Requirements

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
