# Recipe Domain Specification Delta

## ADDED Requirements

### Requirement: Recipe Structure

The system SHALL store recipes with a title, optional description, timing information, and serving size.

#### Scenario: Complete recipe creation
- GIVEN a user wants to add a new recipe
- WHEN they provide title, description, prep time, cook time, and servings
- THEN the recipe is stored with all provided information
- AND a unique identifier is assigned

#### Scenario: Minimal recipe creation
- GIVEN a user wants to quickly capture a recipe
- WHEN they provide only a title
- THEN the recipe is stored with the title
- AND other fields default to null/empty

### Requirement: Ingredient Management

The system SHALL associate ingredients with recipes, preserving order and including quantity, unit, and preparation notes.

#### Scenario: Adding ingredients to a recipe
- GIVEN an existing recipe
- WHEN ingredients are added with quantities and units
- THEN ingredients are stored in the specified order
- AND each ingredient includes name, quantity, unit, and optional notes

#### Scenario: Ingredient without measurement
- GIVEN an ingredient that doesn't require precise measurement (e.g., "salt to taste")
- WHEN the ingredient is added without quantity/unit
- THEN the ingredient is stored with null quantity and unit
- AND the notes field captures preparation guidance

### Requirement: Step Management

The system SHALL store recipe steps in order, with optional timing and temperature information.

#### Scenario: Adding steps to a recipe
- GIVEN an existing recipe
- WHEN steps are added
- THEN steps are stored in the specified order
- AND each step includes instruction text

#### Scenario: Step with timing
- GIVEN a step that requires specific timing (e.g., "simmer for 20 minutes")
- WHEN the step is added with duration
- THEN the duration is stored separately from instruction text
- AND the duration can be used for timer functionality

#### Scenario: Step with temperature
- GIVEN a step that requires specific temperature (e.g., "preheat oven to 180°C")
- WHEN the step is added with temperature
- THEN the temperature and unit (C/F) are stored separately
- AND the temperature can be displayed prominently during cooking

### Requirement: Recipe Retrieval

The system SHALL provide methods to list all recipes and retrieve a single recipe with all its ingredients and steps.

#### Scenario: List all recipes
- GIVEN recipes exist in the database
- WHEN the recipe list is requested
- THEN all recipes are returned with basic information (id, title, total time)
- AND results are ordered by title alphabetically

#### Scenario: Get recipe details
- GIVEN a recipe exists with ingredients and steps
- WHEN the full recipe is requested by ID
- THEN the recipe is returned with all ingredients in order
- AND all steps are included in order
- AND timing and temperature data is included where present

#### Scenario: Recipe not found
- GIVEN a recipe ID that does not exist
- WHEN that recipe is requested
- THEN an appropriate not-found response is returned

### Requirement: Recipe Modification

The system SHALL allow recipes to be updated and deleted.

#### Scenario: Update recipe metadata
- GIVEN an existing recipe
- WHEN the title, description, or timing is modified
- THEN the changes are persisted
- AND other recipe data (ingredients, steps) remains unchanged

#### Scenario: Replace ingredients
- GIVEN an existing recipe with ingredients
- WHEN the ingredient list is replaced
- THEN old ingredients are removed
- AND new ingredients are stored in order

#### Scenario: Replace steps
- GIVEN an existing recipe with steps
- WHEN the step list is replaced
- THEN old steps are removed
- AND new steps are stored in order

#### Scenario: Delete recipe
- GIVEN an existing recipe
- WHEN the recipe is deleted
- THEN the recipe is removed from the database
- AND all associated ingredients are removed
- AND all associated steps are removed

### Requirement: API Error Handling

The system SHALL provide clear error responses for invalid operations.

#### Scenario: Duplicate recipe title
- GIVEN a recipe exists with a specific title
- WHEN another recipe is created with the same title (case-insensitive)
- THEN a conflict error is returned
- AND the duplicate recipe is not created

#### Scenario: Invalid recipe data
- GIVEN invalid recipe data (e.g., empty title, negative times)
- WHEN attempting to create or update a recipe
- THEN a validation error is returned with specific field errors
- AND no database changes are made

#### Scenario: Missing required fields
- GIVEN a recipe creation request without a title
- WHEN the request is processed
- THEN a validation error is returned
- AND the error message indicates the missing field
