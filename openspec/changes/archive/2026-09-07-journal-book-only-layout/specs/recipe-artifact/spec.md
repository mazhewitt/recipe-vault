## MODIFIED Requirements

### Requirement: Artifact Panel UI

The system SHALL display recipe artifacts on the right page of the recipe book.

#### Scenario: Panel appears with loading state
- **WHEN** the frontend receives a `recipe_artifact` event
- **THEN** the right page shows a loading skeleton immediately while fetching recipe data

#### Scenario: Panel populated after fetch
- **WHEN** the frontend successfully fetches recipe data from `/api/recipes/:id`
- **THEN** the loading skeleton is replaced with recipe content on the right page
- **AND** the recipe displays title, meta line, ingredients, and steps
- **AND** on viewports wider than 600px the left page shows the contents with that recipe's entry highlighted

#### Scenario: Panel handles fetch error
- **WHEN** the frontend receives a 404 from `/api/recipes/:id`
- **THEN** the right page shows a "Recipe not found" message
- **AND** does not crash or hide the book

#### Scenario: Panel layout on desktop
- **WHEN** viewport width is greater than 600px
- **THEN** the recipe occupies the right page beside a margin column, the contents occupy the left page, and the note input sits at the foot of the right page
- **AND** all are visible simultaneously

#### Scenario: Panel layout on mobile
- **WHEN** viewport width is 600px or less
- **THEN** the recipe is the single visible page with Ingredients / Method / Notes tabs
- **AND** there is no close button; the note input sits beneath the book

#### Scenario: Panel hidden by default
- **WHEN** no recipe has been displayed in the session
- **THEN** the book shows the contents page
- **AND** the note input is still available

### Requirement: Meal Artifact Panel
The system SHALL display a meal plan on the right page of the recipe book when a `meal_artifact` SSE event is received, using the `#page-right-content` container on every viewport. Meal plan content SHALL fully replace any previously displayed content of that page.

#### Scenario: Frontend handles meal_artifact SSE event
- **WHEN** the frontend receives a `meal_artifact` SSE event
- **THEN** it SHALL call the meal plan renderer with the event payload
- **AND** the right page SHALL show the meal plan immediately
- **AND** no additional API fetch is required (all data is in the SSE payload)

#### Scenario: Meal plan panel layout on desktop
- **WHEN** a meal plan is displayed and viewport width is greater than 600px
- **THEN** the meal plan SHALL occupy the right page beside the margin column
- **AND** the left page SHALL keep whatever it showed (contents)
- **AND** the edge tabs SHALL be hidden

#### Scenario: Meal plan panel layout on mobile
- **WHEN** a meal plan is displayed and viewport width is 600px or less
- **THEN** the meal plan SHALL be the single visible page
- **AND** the paper tabs SHALL be hidden and no close button is shown; tapping the book header returns to the contents
