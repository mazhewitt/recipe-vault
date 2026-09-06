## MODIFIED Requirements

### Requirement: Unified System Prompt

The system SHALL use a single authoritative system prompt for all chat interactions, including guidance on the recipe tag vocabulary.

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

#### Scenario: Prompt examples match tool schemas
- **WHEN** the system prompt includes tool call examples
- **THEN** the examples use only parameters that exist in the tool schemas
- **AND** no phantom parameters (e.g., `query` on `list_recipes`) are shown

#### Scenario: Prompt describes the tag vocabulary
- **WHEN** the system prompt is sent to the LLM
- **THEN** a "## Tags" section states that tags are lowercase, that exactly one course tag is expected from `main`, `side`, `dessert`, `breakfast`, `snack`, `drink`, `sauce`, `bread`, and that `main` and `dessert` drive the Mains and Sweets contents tabs
- **AND** it explains that `update_recipe` replaces the whole tag set, so the current tags should be read first and re-sent with the change
