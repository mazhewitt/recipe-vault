## ADDED Requirements

### Requirement: Recipe refresh after AI edit

The system SHALL refresh the displayed recipe and explain the change when the AI modifies a recipe through `update_recipe`.

#### Scenario: update_recipe emits a recipe artifact
- **WHEN** the agent loop executes an `update_recipe` tool call whose result contains the recipe `id`
- **THEN** a `recipe_artifact` SSE event carrying that id is emitted in the same turn
- **AND** the frontend re-fetches and re-renders the recipe, bypassing the prefetch cache

#### Scenario: Tool result instructs a margin note
- **WHEN** `update_recipe` succeeds
- **THEN** the tool result returned to the model is suffixed with an instruction that the page has been refreshed and that it should reply with one short sentence describing the change without calling `display_recipe`

#### Scenario: One event per recipe per turn
- **WHEN** a turn calls `update_recipe` and `display_recipe` for the same recipe
- **THEN** exactly one `recipe_artifact` event is emitted for that recipe id

#### Scenario: update_recipe result without an id
- **WHEN** `update_recipe` fails or its result carries no `id`
- **THEN** no `recipe_artifact` event is emitted
- **AND** the error text is returned to the model unchanged
