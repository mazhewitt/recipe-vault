## ADDED Requirements

### Requirement: Display Recipe Tool

The system SHALL provide a `display_recipe` tool that Claude can call to signal a recipe should be shown in the artifact panel.

#### Scenario: Claude calls display_recipe with recipe ID
- **WHEN** Claude calls the `display_recipe` tool with a recipe ID
- **THEN** the backend emits a `recipe_artifact` SSE event containing the recipe ID
- **AND** returns a tool result confirming the display was triggered

#### Scenario: Tool definition in Claude API
- **WHEN** a chat request is made
- **THEN** the `display_recipe` tool is included in the tools array sent to Claude
- **AND** the tool schema specifies a required `recipe_id` parameter

### Requirement: Recipe Artifact SSE Event

The system SHALL emit a lightweight SSE event when a recipe should be displayed.

#### Scenario: Recipe artifact event structure
- **WHEN** a `recipe_artifact` event is emitted
- **THEN** it contains only the `recipe_id` field
- **AND** the frontend is responsible for fetching full recipe data

#### Scenario: Event timing
- **WHEN** Claude calls `display_recipe`
- **THEN** the `recipe_artifact` event is emitted before the tool result is returned to Claude
- **AND** the frontend can begin fetching while Claude continues responding

### Requirement: Artifact Panel UI

The system SHALL display a side panel for recipe artifacts.

#### Scenario: Panel appears with loading state
- **WHEN** the frontend receives a `recipe_artifact` event
- **THEN** the recipe panel becomes visible immediately
- **AND** shows a loading skeleton while fetching recipe data

#### Scenario: Panel populated after fetch
- **WHEN** the frontend successfully fetches recipe data from `/api/recipes/:id`
- **THEN** the loading skeleton is replaced with recipe content
- **AND** the recipe displays title, ingredients, and steps

#### Scenario: Panel handles fetch error
- **WHEN** the frontend receives a 404 from `/api/recipes/:id`
- **THEN** the panel shows a "Recipe not found" message
- **AND** does not crash or hide the panel

#### Scenario: Panel layout on desktop
- **WHEN** viewport width is >= 768px
- **THEN** chat occupies the left 60% of the screen
- **AND** recipe panel occupies the right 40%
- **AND** both are visible simultaneously

#### Scenario: Panel layout on mobile
- **WHEN** viewport width is < 768px
- **THEN** recipe panel slides over the chat
- **AND** a close button allows returning to chat view

#### Scenario: Panel hidden by default
- **WHEN** no recipe has been displayed in the session
- **THEN** the recipe panel is not visible
- **AND** chat uses full width

### Requirement: Recipe replaces previous

The system SHALL replace any previously displayed recipe when a new one is shown.

#### Scenario: New recipe replaces old
- **WHEN** a `recipe_artifact` event is received
- **AND** a recipe is already displayed in the panel
- **THEN** the panel shows loading state
- **AND** fetches and displays the new recipe
- **AND** only one recipe is visible at a time

## Data Types

### DisplayRecipeTool
```
Tool Definition {
    name: "display_recipe"
    description: "Display a recipe in the side panel for the user to reference while cooking"
    input_schema: {
        type: "object"
        properties: {
            recipe_id: { type: "integer", description: "The ID of the recipe to display" }
        }
        required: ["recipe_id"]
    }
}
```

### RecipeArtifactEvent
```
RecipeArtifactEvent {
    event: "recipe_artifact"
    data: {
        recipe_id: i64
    }
}
```
