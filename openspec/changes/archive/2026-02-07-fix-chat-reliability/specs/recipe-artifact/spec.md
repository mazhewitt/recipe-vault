## ADDED Requirements

### Requirement: Post-Creation Display

The system SHALL instruct the LLM to display a newly created recipe in the artifact panel.

#### Scenario: Display after successful creation
- **WHEN** the LLM calls `create_recipe` and receives a successful result with a recipe_id
- **THEN** the LLM SHALL call `display_recipe` with that recipe_id
- **AND** the side panel shows the newly created recipe

#### Scenario: Create recipe tool description includes display instruction
- **WHEN** the `create_recipe` tool definition is sent to the LLM
- **THEN** its description includes an instruction to call `display_recipe` after successful creation

#### Scenario: Create and display in single turn
- **WHEN** a user asks to create a recipe (e.g., "save a recipe for banana bread")
- **AND** the LLM calls `create_recipe` and it succeeds
- **THEN** the LLM calls `display_recipe` with the new recipe_id in the same turn
- **AND** the user sees the recipe in the side panel without needing to ask again
