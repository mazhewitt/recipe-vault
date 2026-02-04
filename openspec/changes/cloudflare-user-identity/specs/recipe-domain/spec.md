# Recipe Domain Delta Spec

## MODIFIED Requirements

### Requirement: Recipe Structure

The system SHALL store recipes with a title, optional description, timing information, serving size, and authorship tracking.

#### Scenario: Complete recipe creation
- **GIVEN** a user wants to add a new recipe
- **WHEN** they provide title, description, prep time, cook time, and servings
- **THEN** the recipe is stored with all provided information
- **AND** a unique identifier is assigned
- **AND** `created_by` is set to the current user's email (if available)
- **AND** `updated_by` is set to the current user's email (if available)

#### Scenario: Minimal recipe creation
- **GIVEN** a user wants to quickly capture a recipe
- **WHEN** they provide only a title
- **THEN** the recipe is stored with the title
- **AND** other fields default to null/empty
- **AND** `created_by` is set to the current user's email (if available)

#### Scenario: Recipe creation without user context
- **GIVEN** a recipe is created via API key (no Cloudflare identity)
- **WHEN** the recipe is stored
- **THEN** `created_by` and `updated_by` are null

### Requirement: Recipe Modification

The system SHALL allow recipes to be updated and deleted, tracking who made the modification.

#### Scenario: Update recipe metadata
- **GIVEN** an existing recipe
- **WHEN** the title, description, or timing is modified
- **THEN** the changes are persisted
- **AND** other recipe data (ingredients, steps) remains unchanged
- **AND** `updated_by` is set to the current user's email (if available)
- **AND** `updated_at` timestamp is refreshed

#### Scenario: Replace ingredients
- **GIVEN** an existing recipe with ingredients
- **WHEN** the ingredient list is replaced
- **THEN** old ingredients are removed
- **AND** new ingredients are stored in order
- **AND** `updated_by` is set to the current user's email (if available)

#### Scenario: Replace steps
- **GIVEN** an existing recipe with steps
- **WHEN** the step list is replaced
- **THEN** old steps are removed
- **AND** new steps are stored in order
- **AND** `updated_by` is set to the current user's email (if available)

#### Scenario: Delete recipe
- **GIVEN** an existing recipe
- **WHEN** the recipe is deleted
- **THEN** the recipe is removed from the database
- **AND** all associated ingredients are removed
- **AND** all associated steps are removed

### Requirement: Recipe Retrieval

The system SHALL provide methods to list all recipes and retrieve a single recipe with all its ingredients, steps, and authorship information.

#### Scenario: List all recipes
- **GIVEN** recipes exist in the database
- **WHEN** the recipe list is requested
- **THEN** all recipes are returned with basic information (id, title, total time)
- **AND** results are ordered by title alphabetically

#### Scenario: Get recipe details
- **GIVEN** a recipe exists with ingredients and steps
- **WHEN** the full recipe is requested by ID
- **THEN** the recipe is returned with all ingredients in order
- **AND** all steps are included in order
- **AND** timing and temperature data is included where present
- **AND** `created_by` and `updated_by` are included if set

#### Scenario: Recipe not found
- **GIVEN** a recipe ID that does not exist
- **WHEN** that recipe is requested
- **THEN** an appropriate not-found response is returned

## ADDED Requirements

### Requirement: Authorship Display

The system SHALL display recipe authorship information in the UI when available.

#### Scenario: Recipe with authorship
- **WHEN** a recipe is displayed that has `created_by` set
- **THEN** the creator's email is shown (e.g., "Created by daughter@gmail.com")

#### Scenario: Recipe with update tracking
- **WHEN** a recipe is displayed that has `updated_by` different from `created_by`
- **THEN** both creator and last modifier are shown

#### Scenario: Recipe without authorship
- **WHEN** a recipe is displayed that has null `created_by`
- **THEN** no authorship information is displayed
