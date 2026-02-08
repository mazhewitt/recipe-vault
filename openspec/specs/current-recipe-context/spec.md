# current-recipe-context Specification

## Purpose
TBD - created by archiving change give-ai-current-recipe-context. Update Purpose after archive.
## Requirements
### Requirement: Current recipe context is included with chat requests
The system SHALL include explicit current recipe context in chat requests when a recipe is currently displayed, using `recipe_id` and `title` when available.

#### Scenario: Recipe is visible when message is sent
- **WHEN** a recipe is displayed in the recipe book
- **AND** the user sends a chat message
- **THEN** the chat request includes `current_recipe.recipe_id`
- **AND** the chat request includes `current_recipe.title` when available

#### Scenario: Index view clears current recipe context
- **WHEN** the recipe index is displayed
- **AND** the user sends a chat message
- **THEN** the chat request omits `current_recipe` or sets it to null

### Requirement: LLM guidance uses current recipe context
The system SHALL instruct the LLM to treat `current_recipe` as the active recipe and to call `get_recipe` when it needs details not present in the chat history.

#### Scenario: LLM needs details for the current recipe
- **WHEN** `current_recipe` is present in the chat request
- **AND** the user asks a question that requires recipe details (e.g., scaling)
- **THEN** the LLM calls `get_recipe` using `current_recipe.recipe_id` before responding

#### Scenario: LLM guidance is included in chat setup
- **WHEN** the chat request is prepared
- **THEN** the system prompt/reminders include guidance to use `current_recipe`
- **AND** the `get_recipe` tool description reinforces using current context when present

