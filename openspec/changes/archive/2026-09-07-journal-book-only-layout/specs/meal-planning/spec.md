## MODIFIED Requirements

### Requirement: Meal Plan Panel Rendering
The system SHALL render a meal plan on the right page of the recipe book when a `meal_artifact` SSE event is received, styled in the book's palette.

#### Scenario: Meal plan panel displays required fields
- **WHEN** the meal plan panel renders
- **THEN** it SHALL display the meal title in the handwritten font
- **AND** the guest count if present (e.g. "For 4 people")
- **AND** a list of recipes, each showing the recipe title and its role (centrepiece / side / vegetarian alternative) as a coloured role badge

#### Scenario: Clicking a recipe navigates to recipe view
- **WHEN** the user clicks a recipe title in the meal plan panel
- **THEN** the full recipe view for that recipe SHALL replace the meal plan on the right page
- **AND** the note input and margin remain in place

#### Scenario: Panel action buttons present
- **WHEN** the meal plan panel is visible
- **THEN** the action area SHALL show buttons for "Shopping List", "Cooking Timeline", and "Save Meal"
- **AND** in Phase 1 these buttons MAY show a "coming soon" state or be disabled

#### Scenario: Meal plan replaces previous panel content
- **WHEN** a new meal_artifact event is received
- **THEN** the right page content SHALL be fully replaced with the new meal plan
- **AND** any previously displayed recipe or meal plan is no longer shown

#### Scenario: Meal plan renders in one container on every viewport
- **WHEN** a meal plan is rendered on any viewport width
- **THEN** it is written into `#page-right-content`
- **AND** the view mode is set to `meal` so the right page is visible and the recipe tabs are hidden

#### Scenario: Meal plan panel is styled
- **WHEN** the meal plan panel is visible
- **THEN** `.meal-plan-panel`, `.meal-plan-title`, `.meal-plan-guest-badge`, `.meal-plan-recipe-row`, `.meal-plan-role-badge` and `.meal-plan-recipe-link` have stylesheet rules using the book's tokens (leather red for centrepiece, border tan with dark text for side, accent brown for vegetarian alternative)
