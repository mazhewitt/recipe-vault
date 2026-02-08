# Recipe Domain Specification (Delta)

## MODIFIED Requirements

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

## ADDED Requirements

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
