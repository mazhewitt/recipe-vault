## MODIFIED Requirements

### Requirement: Recipe Structure

The system SHALL store recipes with a title, optional description, timing information, serving size, optional difficulty rating, and a set of tags.

#### Scenario: Complete recipe creation
- **WHEN** a user wants to add a new recipe
- **THEN** they provide title, description, prep time, cook time, servings, optional difficulty, and optional tags
- **AND** the recipe is stored with all provided information
- **AND** a unique identifier is assigned

#### Scenario: Minimal recipe creation
- **WHEN** a user wants to quickly capture a recipe
- **THEN** they provide only a title
- **AND** the recipe is stored with the title
- **AND** other fields default to null/empty
- **AND** difficulty is null (will be auto-assigned)
- **AND** tags are empty (will be auto-assigned)

#### Scenario: Create recipe with difficulty
- **WHEN** a user creates a recipe and specifies difficulty (1-5)
- **THEN** the recipe is stored with the user-specified difficulty
- **AND** no AI assessment is triggered

#### Scenario: Create recipe without difficulty
- **WHEN** a user creates a recipe without specifying difficulty
- **THEN** the recipe is stored with difficulty = NULL
- **AND** AI assessment is triggered to assign difficulty

#### Scenario: Create recipe with tags
- **WHEN** a user creates a recipe and specifies one or more tags
- **THEN** the tags are normalised and stored in `recipe_tags`
- **AND** no AI tag assessment is triggered

#### Scenario: Create recipe without tags
- **WHEN** a user creates a recipe without tags
- **THEN** the recipe is stored with no `recipe_tags` rows
- **AND** AI tag assessment is triggered to assign tags

### Requirement: Recipe Retrieval

The system SHALL provide methods to list all recipes and retrieve a single recipe with all its ingredients, steps and tags, filtered by family membership.

#### Scenario: List all recipes
- GIVEN recipes exist in the database
- WHEN the recipe list is requested by a user
- THEN only recipes created by the user's family members are returned
- AND results are ordered by title alphabetically
- AND each recipe includes its `tags` array (empty when untagged)

#### Scenario: List all recipes in god mode
- GIVEN recipes exist in the database
- WHEN the recipe list is requested in god mode (API key without X-User-Email)
- THEN all recipes from all families are returned
- AND results are ordered by title alphabetically
- AND each recipe includes its `tags` array

#### Scenario: Get recipe details in family
- GIVEN a recipe exists with ingredients and steps
- AND the recipe was created by the user's family member
- WHEN the full recipe is requested by ID
- THEN the recipe is returned with all ingredients in order
- AND all steps are included in order
- AND timing and temperature data is included where present
- AND the recipe's `tags` are included sorted alphabetically

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

#### Scenario: Tags are loaded in one query for a list
- GIVEN a list of recipes is being returned
- WHEN their tags are loaded
- THEN a single query joining `recipe_tags` and `tags` populates every recipe's `tags`
- AND no per-recipe query is issued

### Requirement: Recipe Modification

The system SHALL allow recipes to be updated and deleted, restricted to family members, including replacing a recipe's tags.

#### Scenario: Update recipe metadata in family
- GIVEN an existing recipe created by a family member
- WHEN the title, description, or timing is modified by another family member
- THEN the changes are persisted
- AND `updated_by` is set to the current user's email
- AND other recipe data (ingredients, steps, tags) remains unchanged

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

#### Scenario: Replace tags in family
- GIVEN an existing recipe with tags created by a family member
- WHEN the update request includes a `tags` array from another family member
- THEN links to tags not in the array are removed
- AND links to new tags are created (creating `tags` rows as needed)
- AND `updated_by` is set to the current user's email
- AND ingredients and steps remain unchanged

#### Scenario: Replace tags with an empty array
- GIVEN an existing recipe with tags
- WHEN the update request includes `tags: []`
- THEN all of the recipe's tag links are removed

#### Scenario: Update without tags field leaves tags unchanged
- GIVEN an existing recipe with tags
- WHEN the update request omits `tags`
- THEN the recipe's tags are unchanged

#### Scenario: Replace tags outside family
- GIVEN an existing recipe created by a different family
- WHEN a user attempts to replace its tags
- THEN a 404 Not Found response is returned
- AND no changes are made

#### Scenario: Delete recipe in family
- GIVEN an existing recipe created by a family member
- WHEN the recipe is deleted by another family member
- THEN the recipe is removed from the database
- AND all associated ingredients are removed
- AND all associated steps are removed
- AND all associated `recipe_tags` rows are removed

#### Scenario: Delete recipe outside family
- GIVEN an existing recipe created by a different family
- WHEN a user attempts to delete the recipe
- THEN a 404 Not Found response is returned
- AND the recipe is not deleted

#### Scenario: Delete recipe in god mode
- GIVEN an existing recipe
- WHEN the recipe is deleted in god mode
- THEN the recipe is removed regardless of which family created it
- AND all associated ingredients, steps and tag links are removed
