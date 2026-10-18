## MODIFIED Requirements

### Requirement: Unified System Prompt

The system SHALL use a single authoritative system prompt for all chat interactions, including guidance on the recipe tag vocabulary and on when a change is shown on the page rather than saved.

#### Scenario: Single prompt source
- **WHEN** the chat agent is initialized
- **THEN** exactly one system prompt is sent to the LLM
- **AND** no default prompt from the agent config competes with the handler prompt

#### Scenario: Prompt includes tool-use triggers
- **WHEN** the system prompt is sent to the LLM
- **THEN** it includes explicit mappings from user intent to required tool calls:
  - Listing/browsing requests → `list_recipes`
  - Viewing/cooking/reading a specific recipe → `display_recipe`
  - After successful recipe creation → `display_recipe` with the new recipe_id
  - Changing a recipe's course, cuisine or diet tags → `update_recipe` with the full `tags` array
  - Scaling for tonight ("make it for 6", "halve it", "just two of us") → `set_servings`
  - Changing or saving the recipe on explicit request ("change the recipe to…", "save it with cream", "update the servings in the book") → `update_recipe`

#### Scenario: Prompt keeps one-off changes off the saved recipe
- **WHEN** the system prompt is sent to the LLM
- **THEN** it tells the model to present a substitution or other one-off change for tonight in the reply, flag notable effects, and end with "Want me to save this as a change to the recipe?", calling `update_recipe` only after a yes or an explicit request
- **AND** it tells the model that after `set_servings` the reply says the page now shows N servings and the saved recipe is unchanged

#### Scenario: Prompt examples match tool schemas
- **WHEN** the system prompt includes tool call examples
- **THEN** the examples use only parameters that exist in the tool schemas
- **AND** no phantom parameters (e.g., `query` on `list_recipes`) are shown

#### Scenario: Prompt describes the tag vocabulary
- **WHEN** the system prompt is sent to the LLM
- **THEN** a "## Tags" section states that tags are lowercase, that exactly one course tag is expected from `main`, `side`, `dessert`, `breakfast`, `snack`, `drink`, `sauce`, `bread`, and that `main` and `dessert` drive the Mains and Sweets contents tabs
- **AND** it explains that `update_recipe` replaces the whole tag set, so the current tags should be read first and re-sent with the change

### Requirement: Long-Conversation Reminder

The system SHALL inject a reminder into messages when conversations reach 5 or more messages.

#### Scenario: Reminder covers all tool-use patterns
- **WHEN** a conversation has 5 or more messages
- **AND** a new user message is sent
- **THEN** a reminder is appended to the user message covering:
  - Use `list_recipes` when the user asks to see their recipes
  - Use `display_recipe` to show recipe details in the side panel
  - After creating a recipe, call `display_recipe` with the new recipe_id
  - Use `set_servings` to scale for tonight, and `update_recipe` only when the user asks to change or save the recipe
  - When guiding cooking, give the first step first
  - Do not output full ingredient lists or steps in chat
- **AND** the reminder does not tell the model to ask for servings first

## ADDED Requirements

### Requirement: The servings_set event sets the page's stepper

When the model calls `set_servings` successfully, the chat handler SHALL emit a `servings_set` SSE event carrying the servings and the id of the recipe the request was sent from, and the frontend SHALL set that recipe's servings stepper, without re-rendering the recipe and without any database write.

#### Scenario: Event emitted with the current recipe's id
- **WHEN** a chat request with `current_recipe.recipe_id` R leads to a successful `set_servings` call with servings 4
- **THEN** the stream contains `event: servings_set` with data `{"servings":4,"recipe_id":"R"}`, before the reply's `chunk`
- **AND** no `recipe_artifact` event is emitted for it

#### Scenario: No recipe, no event
- **WHEN** a chat request without `current_recipe` leads to a `set_servings` call
- **THEN** no `servings_set` event is emitted

#### Scenario: The open recipe's stepper is set
- **WHEN** the frontend receives `servings_set` with recipe_id R and servings N while R is displayed
- **THEN** `.servings-count` reads N, clamped to the stepper's range, and the quantities are scaled as if the cook had used the stepper, including the `rv-place:<R>` record
- **AND** no request is made to `/api/recipes`

#### Scenario: Another recipe is open
- **WHEN** the frontend receives `servings_set` with recipe_id R while recipe S, the contents or a meal plan is displayed
- **THEN** nothing on the page changes and no `rv-place` record changes

#### Scenario: A recipe without servings
- **WHEN** the frontend receives `servings_set` for the displayed recipe and that recipe has no servings
- **THEN** nothing on the page changes

#### Scenario: Status line
- **WHEN** the model calls `set_servings`
- **THEN** the in-flight status on the reply sticky reads "Adjusting the servings…", never the tool name

### Requirement: The page's servings reach the model

The current-recipe context a chat request carries SHALL include the servings the page shows, so the model can name them and scale from them.

#### Scenario: Servings in the request
- **WHEN** the cook sends a note while recipe R is displayed with its stepper at N
- **THEN** the request body's `current_recipe` carries `"servings": N` alongside `recipe_id` and `title`
- **AND** a recipe without servings sends no `servings` field

#### Scenario: Servings in the model's context
- **WHEN** the chat handler builds the `[Current recipe context]` block from a `current_recipe` with servings N
- **THEN** the block contains the line `page_servings: N`, stating it is what the page shows and may differ from the saved recipe's servings
- **AND** a `current_recipe` without servings produces no such line, and a request without the field still deserialises
