# Recipe Domain Delta Specification

This delta spec documents changes to the recipe-domain capability.

## ADDED Requirements

### Requirement: Photo Filename Storage

The system SHALL store an optional photo filename for each recipe to track associated photo files.

#### Scenario: Store photo filename with recipe
- **WHEN** a recipe has an associated photo
- **THEN** the `photo_filename` field contains the filename (e.g., "abc-123.jpg")
- **AND** the field is persisted in the recipes.photo_filename column

#### Scenario: Recipe without photo
- **WHEN** a recipe has no associated photo
- **THEN** the `photo_filename` field is NULL
- **AND** the recipe is still valid and retrievable

#### Scenario: Get recipe includes photo filename
- **WHEN** a recipe is retrieved by ID
- **THEN** the response includes the `photo_filename` field
- **AND** `photo_filename` is null if no photo is attached

#### Scenario: List recipes includes photo filename
- **WHEN** recipes are listed
- **THEN** each recipe in the list includes the `photo_filename` field
- **AND** `photo_filename` is null for recipes without photos

## MODIFIED Data Types

### Recipe
```
Recipe {
    id: UUID
    title: String (1-200 chars)
    description: Option<String> (max 2000 chars)
    prep_time_minutes: Option<u32>
    cook_time_minutes: Option<u32>
    servings: Option<u32>
    difficulty: Option<u8> (1-5)
    photo_filename: Option<String>  // ← ADDED: e.g., "abc-123.jpg"
    created_at: DateTime
    updated_at: DateTime
    created_by: Option<String>
    updated_by: Option<String>
}
```

**Change**: Added `photo_filename: Option<String>` field to track associated photo files stored on the filesystem.
