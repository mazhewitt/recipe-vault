# meal-planning Specification

## Purpose
TBD - created by archiving change meal-planning-phase-1. Update Purpose after archive.
## Requirements
### Requirement: Meal Plan Document Type
The system SHALL support a meal plan as a first-class document type rendered in the recipe book panel. A meal plan consists of a title, an optional guest count, and an ordered list of recipes each with an assigned role.

#### Scenario: Meal plan data structure
- **WHEN** a meal plan is created
- **THEN** it SHALL contain a title (string), an optional guest_count (positive integer), and at least one recipe entry
- **AND** each recipe entry SHALL contain a recipe_id (valid vault UUID) and a role (one of: `centrepiece`, `side`, `vegetarian alternative`)

#### Scenario: Meal plan contains only vault recipes
- **WHEN** the AI assembles a meal plan
- **THEN** all recipe_id values in the plan SHALL reference recipes that exist in the user's family vault
- **AND** web-search suggestions or externally named dishes SHALL NOT appear as recipe entries in the panel

### Requirement: Meal Assembly via Chat
The system SHALL enable users to assemble a meal plan through natural language conversation with the AI. The AI SHALL propose the meal in chat text and only render the panel after explicit user confirmation.

#### Scenario: AI assembles meal from named centrepiece
- **WHEN** a user mentions a centrepiece recipe by name (e.g. "plan a meal around my Rogan Josh")
- **THEN** the AI SHALL call `list_recipes` and locate the named recipe
- **AND** propose 1–4 complementary recipes from the vault as sides or alternatives
- **AND** summarise the proposed meal in chat and ask for confirmation before calling `display_meal_plan`

#### Scenario: User confirms meal proposal
- **WHEN** the user explicitly confirms the proposed meal (e.g. "yes", "looks good", "go for it")
- **THEN** the AI SHALL call `display_meal_plan` with the agreed-upon recipe IDs and roles
- **AND** the meal plan panel SHALL render in the right-hand panel

#### Scenario: User rejects or modifies a suggestion
- **WHEN** the user rejects or requests a change to the proposed meal (e.g. "swap the naan for saag aloo")
- **THEN** the AI SHALL adjust the meal composition accordingly
- **AND** re-summarise the updated proposal and ask for confirmation again before calling `display_meal_plan`

#### Scenario: Centrepiece not found in vault
- **WHEN** the user names a centrepiece recipe that does not exist in the vault
- **THEN** the AI SHALL inform the user that the recipe was not found
- **AND** suggest similar recipes from the vault if any exist
- **AND** SHALL NOT proceed to assemble a meal plan without a valid centrepiece

#### Scenario: Guest count captured from chat
- **WHEN** the user states a guest count during meal assembly (e.g. "for 4 people")
- **THEN** the AI SHALL include the guest_count in the `display_meal_plan` call
- **AND** the guest count SHALL be displayed in the meal plan panel

### Requirement: Meal Plan Panel Rendering
The system SHALL render a meal plan panel in the right-hand recipe book area when a `meal_artifact` SSE event is received.

#### Scenario: Meal plan panel displays required fields
- **WHEN** the meal plan panel renders
- **THEN** it SHALL display the meal title
- **AND** the guest count if present (e.g. "For 4 people")
- **AND** a list of recipes, each showing the recipe title and its role (centrepiece / side / vegetarian alternative)

#### Scenario: Clicking a recipe navigates to recipe view
- **WHEN** the user clicks a recipe title in the meal plan panel
- **THEN** the full recipe view for that recipe SHALL replace the meal plan panel in the right-hand area
- **AND** clicking does not navigate away from the chat

#### Scenario: Panel action buttons present
- **WHEN** the meal plan panel is visible
- **THEN** the action area SHALL show buttons for "Shopping List", "Cooking Timeline", and "Save Meal"
- **AND** in Phase 1 these buttons MAY show a "coming soon" state or be disabled

#### Scenario: Meal plan replaces previous panel content
- **WHEN** a new meal_artifact event is received
- **THEN** the panel content SHALL be fully replaced with the new meal plan
- **AND** any previously displayed recipe or meal plan is no longer shown
