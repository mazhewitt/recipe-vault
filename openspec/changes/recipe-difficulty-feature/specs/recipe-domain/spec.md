# Recipe Domain Delta Specification

## MODIFIED Requirements

### Requirement: Recipe Structure

The system SHALL store recipes with a title, optional description, timing information, serving size, and optional difficulty rating.

#### Scenario: Complete recipe creation
- **WHEN** a user wants to add a new recipe
- **THEN** they provide title, description, prep time, cook time, servings, and optional difficulty
- **AND** the recipe is stored with all provided information
- **AND** a unique identifier is assigned

#### Scenario: Minimal recipe creation
- **WHEN** a user wants to quickly capture a recipe
- **THEN** they provide only a title
- **AND** the recipe is stored with the title
- **AND** other fields default to null/empty
- **AND** difficulty is null (will be auto-assigned)

#### Scenario: Create recipe with difficulty
- **WHEN** a user creates a recipe and specifies difficulty (1-5)
- **THEN** the recipe is stored with the user-specified difficulty
- **AND** no AI assessment is triggered

#### Scenario: Create recipe without difficulty
- **WHEN** a user creates a recipe without specifying difficulty
- **THEN** the recipe is stored with difficulty = NULL
- **AND** AI assessment is triggered to assign difficulty

## ADDED Requirements

### Requirement: Difficulty Rating Storage

The system SHALL store an optional difficulty rating for each recipe with values 1-5.

#### Scenario: Store difficulty with recipe
- **WHEN** a recipe is created or updated with a difficulty value
- **THEN** the difficulty is validated to be between 1 and 5 (inclusive)
- **AND** the value is stored in the recipes.difficulty column

#### Scenario: Invalid difficulty value rejected
- **WHEN** a recipe creation or update includes difficulty < 1 or > 5
- **THEN** a validation error is returned
- **AND** the operation is rejected
- **AND** the error message indicates valid range is 1-5

#### Scenario: NULL difficulty is valid
- **WHEN** a recipe is created or updated without difficulty
- **THEN** the difficulty field is set to NULL
- **AND** the recipe is saved successfully

#### Scenario: Get recipe includes difficulty
- **WHEN** a recipe is retrieved by ID
- **THEN** the response includes the difficulty field
- **AND** difficulty is null if not yet assigned

#### Scenario: List recipes includes difficulty
- **WHEN** recipes are listed
- **THEN** each recipe in the list includes the difficulty field
- **AND** difficulty is null for recipes not yet rated

### Requirement: Update Recipe Difficulty

The system SHALL allow updating a recipe's difficulty independently of other fields.

#### Scenario: Update only difficulty
- **WHEN** a recipe is updated with only a difficulty value
- **THEN** only the difficulty field is modified
- **AND** other recipe fields remain unchanged
- **AND** updated_by is set to the current user

#### Scenario: Update difficulty via API
- **WHEN** PUT /api/recipes/:id is called with difficulty in the request body
- **THEN** the recipe's difficulty is updated
- **AND** a 200 OK response is returned
- **AND** the updated recipe is returned in the response

## Modified Data Types

### Recipe
```
Recipe {
    id: UUID
    title: String (1-200 chars)
    description: Option<String> (max 2000 chars)
    prep_time_minutes: Option<u32>
    cook_time_minutes: Option<u32>
    servings: Option<u32>
    difficulty: Option<u8> (1-5)         // NEW
    created_at: DateTime
    updated_at: DateTime
}
```
