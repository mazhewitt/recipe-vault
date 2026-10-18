## ADDED Requirements

### Requirement: The open recipe's saved text is sent with each chat message

When a chat request names `current_recipe`, the chat handler SHALL read that recipe, scoped to the requesting user's family, and SHALL add its saved text to the `[Current recipe context]` block: title, description, servings, prep and cook minutes, difficulty, tags, every ingredient (quantity, unit, name and notes) and every step in order (instruction, `duration_minutes` and temperature when set). When the recipe cannot be read, the block SHALL hold only the request's `recipe_id`, `title` and `page_servings`, as before.

#### Scenario: A recipe the user's family can read
- **WHEN** a chat message is sent with `current_recipe.recipe_id` naming a recipe in the user's family
- **THEN** the block holds a line for each ingredient and each step's instruction, in order, with each step's duration and temperature when set
- **AND** the block keeps its `recipe_id:` line and, when the request carries servings, its `page_servings:` line
- **AND** the text uses the field names `update_recipe` takes (`servings`, `prep_time_minutes`, `cook_time_minutes`, `duration_minutes`)

#### Scenario: A recipe outside the user's family
- **WHEN** `current_recipe.recipe_id` names a recipe another family owns, or no recipe at all
- **THEN** the block holds none of that recipe's content: only the request's `recipe_id`, `title` and `page_servings`, and the instruction to call `get_recipe` for details

#### Scenario: The database read fails
- **WHEN** reading the recipe returns an error other than not-found
- **THEN** the error is logged at `warn`, the block falls back as above, and the turn goes ahead

#### Scenario: A question about the open recipe needs no lookup
- **WHEN** the cook asks about the open recipe ("how long does the sauce simmer?") on `gemini-3.8-flash`
- **THEN** the model answers without calling `get_recipe` (model eval, `tests/model-eval/`)

## MODIFIED Requirements

### Requirement: LLM guidance uses current recipe context
The system SHALL instruct the LLM to treat `current_recipe` as the active recipe, to answer questions about it, scale it and substitute in it from the saved text sent with the message, and to call `get_recipe` only for another recipe or when that text is missing.

#### Scenario: LLM needs details for the current recipe
- **WHEN** `current_recipe` is present in the chat request with the recipe's saved text
- **AND** the user asks a question that requires recipe details (e.g., scaling)
- **THEN** the LLM answers from the saved text, without calling `get_recipe`
- **AND** when the block carries no saved text (the fallback), the LLM calls `get_recipe` using `current_recipe.recipe_id` before responding

#### Scenario: LLM guidance is included in chat setup
- **WHEN** the chat request is prepared
- **THEN** the system prompt/reminders include guidance to use `current_recipe` and its saved text
- **AND** the `get_recipe` tool description says the open recipe is already in the chat context, and to call it for another recipe or when that text is missing
