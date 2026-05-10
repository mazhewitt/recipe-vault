## ADDED Requirements

### Requirement: Meal Artifact Panel
The system SHALL display a meal plan in the artifact panel when a `meal_artifact` SSE event is received, using the same `#page-right-content` container as the recipe artifact panel. Meal plan content SHALL fully replace any previously displayed content.

#### Scenario: Frontend handles meal_artifact SSE event
- **WHEN** the frontend receives a `meal_artifact` SSE event
- **THEN** it SHALL call the meal plan renderer with the event payload
- **AND** the panel SHALL become visible immediately with the meal plan content
- **AND** no additional API fetch is required (all data is in the SSE payload)

#### Scenario: Meal plan panel layout on desktop
- **WHEN** a meal plan is displayed and viewport width is >= 768px
- **THEN** the meal plan panel SHALL occupy the right 40% of the screen
- **AND** chat SHALL occupy the left 60%
- **AND** both SHALL be visible simultaneously

#### Scenario: Meal plan panel layout on mobile
- **WHEN** a meal plan is displayed and viewport width is < 768px
- **THEN** the meal plan panel SHALL slide over the chat
- **AND** a close button SHALL allow returning to chat view

## MODIFIED Requirements

### Requirement: Recipe replaces previous
The system SHALL replace any previously displayed content — whether a recipe or a meal plan — when a new artifact event is received (either `recipe_artifact` or `meal_artifact`).

#### Scenario: Recipe artifact replaces meal plan
- **WHEN** the frontend receives a `recipe_artifact` event while a meal plan is displayed
- **THEN** the meal plan content SHALL be replaced with the recipe view

#### Scenario: Meal plan artifact replaces recipe
- **WHEN** the frontend receives a `meal_artifact` event while a recipe is displayed
- **THEN** the recipe content SHALL be replaced with the meal plan view

#### Scenario: New meal plan replaces previous meal plan
- **WHEN** the frontend receives a `meal_artifact` event while a meal plan is already displayed
- **THEN** the previous meal plan content SHALL be fully replaced with the new meal plan
