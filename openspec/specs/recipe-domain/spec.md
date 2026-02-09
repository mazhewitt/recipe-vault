# Recipe Domain Specification

## Purpose

The Recipe Domain capability provides the core data structures and operations for managing recipes, including ingredients and cooking steps. This is the foundational data model for the Recipe Vault application.

## Requirements

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

The system SHALL provide methods to list all recipes and retrieve a single recipe with all its ingredients and steps, filtered by family membership.

#### Scenario: List all recipes
- GIVEN recipes exist in the database
- WHEN the recipe list is requested by a user
- THEN only recipes created by the user's family members are returned
- AND results are ordered by title alphabetically

#### Scenario: List all recipes in god mode
- GIVEN recipes exist in the database
- WHEN the recipe list is requested in god mode (API key without X-User-Email)
- THEN all recipes from all families are returned
- AND results are ordered by title alphabetically

#### Scenario: Get recipe details in family
- GIVEN a recipe exists with ingredients and steps
- AND the recipe was created by the user's family member
- WHEN the full recipe is requested by ID
- THEN the recipe is returned with all ingredients in order
- AND all steps are included in order
- AND timing and temperature data is included where present

#### Scenario: Get recipe details outside family
- GIVEN a recipe exists
- AND the recipe was created by a different family member
- WHEN the full recipe is requested by ID
- THEN a 404 Not Found response is returned
- AND the recipe details are not disclosed

#### Scenario: Get recipe details in god mode
- GIVEN a recipe exists with ingredients and steps
- WHEN the full recipe is requested by ID in god mode
- THEN the recipe is returned regardless of which family created it

#### Scenario: Recipe not found
- GIVEN a recipe ID that does not exist
- WHEN that recipe is requested
- THEN an appropriate not-found response is returned

### Requirement: Recipe Modification

The system SHALL allow recipes to be updated and deleted, restricted to family members.

#### Scenario: Update recipe metadata in family
- GIVEN an existing recipe created by a family member
- WHEN the title, description, or timing is modified by another family member
- THEN the changes are persisted
- AND `updated_by` is set to the current user's email
- AND other recipe data (ingredients, steps) remains unchanged

#### Scenario: Update recipe metadata outside family
- GIVEN an existing recipe created by a different family
- WHEN a user attempts to modify the recipe
- THEN a 404 Not Found response is returned
- AND no changes are made

#### Scenario: Update recipe metadata in god mode
- GIVEN an existing recipe
- WHEN the recipe is modified in god mode
- THEN the changes are persisted
- AND `updated_by` is set to DEV_USER_EMAIL

#### Scenario: Replace ingredients in family
- GIVEN an existing recipe with ingredients created by a family member
- WHEN the ingredient list is replaced by another family member
- THEN old ingredients are removed
- AND new ingredients are stored in order
- AND `updated_by` is set to the current user's email

#### Scenario: Replace ingredients outside family
- GIVEN an existing recipe created by a different family
- WHEN a user attempts to replace ingredients
- THEN a 404 Not Found response is returned
- AND no changes are made

#### Scenario: Replace steps in family
- GIVEN an existing recipe with steps created by a family member
- WHEN the step list is replaced by another family member
- THEN old steps are removed
- AND new steps are stored in order
- AND `updated_by` is set to the current user's email

#### Scenario: Replace steps outside family
- GIVEN an existing recipe created by a different family
- WHEN a user attempts to replace steps
- THEN a 404 Not Found response is returned
- AND no changes are made

#### Scenario: Delete recipe in family
- GIVEN an existing recipe created by a family member
- WHEN the recipe is deleted by another family member
- THEN the recipe is removed from the database
- AND all associated ingredients are removed
- AND all associated steps are removed

#### Scenario: Delete recipe outside family
- GIVEN an existing recipe created by a different family
- WHEN a user attempts to delete the recipe
- THEN a 404 Not Found response is returned
- AND the recipe is not deleted

#### Scenario: Delete recipe in god mode
- GIVEN an existing recipe
- WHEN the recipe is deleted in god mode
- THEN the recipe is removed regardless of which family created it
- AND all associated ingredients and steps are removed

### Requirement: Recipe Authorship Tracking

The system SHALL track which user created and last updated each recipe.

#### Scenario: Create recipe sets authorship
- GIVEN a user creates a new recipe
- WHEN the recipe is created
- THEN `created_by` is set to the user's email (normalized)
- AND `updated_by` is set to the user's email (normalized)

#### Scenario: Create recipe in god mode
- GIVEN a recipe is created in god mode
- WHEN the recipe is created
- THEN `created_by` is set to DEV_USER_EMAIL
- AND `updated_by` is set to DEV_USER_EMAIL

#### Scenario: Update recipe updates authorship
- GIVEN an existing recipe
- WHEN the recipe is updated
- THEN `updated_by` is set to the current user's email (normalized)
- AND `created_by` remains unchanged

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

## Data Types

### Recipe
```
Recipe {
    id: UUID
    title: String (1-200 chars)
    description: Option<String> (max 2000 chars)
    prep_time_minutes: Option<u32>
    cook_time_minutes: Option<u32>
    servings: Option<u32>
    created_at: DateTime
    updated_at: DateTime
}
```

### Ingredient
```
Ingredient {
    id: UUID
    recipe_id: UUID
    position: u32
    name: String
    quantity: Option<f64>
    unit: Option<String>
    notes: Option<String>
}
```

### Step
```
Step {
    id: UUID
    recipe_id: UUID
    position: u32
    instruction: String
    duration_minutes: Option<u32>
    temperature_value: Option<u32>
    temperature_unit: Option<String> ("C" | "F")
}
```

## Related Capabilities

- **mcp-interface**: Exposes recipe operations through MCP protocol
- **api-security**: Protects recipe API endpoints with authentication
