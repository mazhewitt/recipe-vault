## ADDED Requirements

### Requirement: display_meal_plan Tool
The system SHALL provide a `display_meal_plan` tool that the AI can call to signal a meal plan should be rendered in the artifact panel. The tool SHALL only be called after the user has explicitly confirmed the proposed meal in chat.

#### Scenario: Tool definition included in chat requests
- **WHEN** a chat request is made
- **THEN** the `display_meal_plan` tool SHALL be included in the tools array sent to Claude
- **AND** the schema SHALL specify: `title` (string, required), `guest_count` (integer, optional), `recipes` (array of `{recipe_id: string, role: string}`, required, min 1 item)

#### Scenario: Valid call triggers meal_artifact event
- **WHEN** Claude calls `display_meal_plan` with valid recipe_ids
- **THEN** the backend SHALL validate all recipe_ids exist in the user's family vault
- **AND** emit a `meal_artifact` SSE event with the full meal plan payload
- **AND** return a tool result confirming the display was triggered

#### Scenario: Unknown recipe_id in payload
- **WHEN** Claude calls `display_meal_plan` and one or more recipe_ids do not exist in the vault
- **THEN** if the unknown ID is the centrepiece, the backend SHALL return an error to Claude and NOT emit a `meal_artifact` event
- **AND** if the unknown IDs are non-centrepiece recipes, they SHALL be dropped from the payload and the remaining plan emitted

#### Scenario: meal_artifact SSE event structure
- **WHEN** a `meal_artifact` event is emitted
- **THEN** it SHALL contain: `title` (string), `guest_count` (integer or null), `recipes` (array of `{recipe_id, title, role}`)
- **AND** recipe titles SHALL be resolved server-side so the frontend does not need to fetch each recipe individually for panel rendering
