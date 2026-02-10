# Recipe Difficulty Rating Specification

## Purpose

The Recipe Difficulty Rating capability provides AI-powered assessment of recipe complexity, assigning difficulty ratings on a 1-5 scale based on technique complexity, ingredient count, cooking steps, and timing requirements.

## ADDED Requirements

### Requirement: Difficulty Scale Definition

The system SHALL use a 1-5 integer scale for difficulty ratings with clearly defined criteria.

#### Scenario: Difficulty scale mapping
- **WHEN** a recipe is assessed for difficulty
- **THEN** the rating is assigned according to these criteria:
  - 1 (Easy): Simple techniques, few ingredients, < 30 min total time
  - 2 (Medium-Easy): Basic techniques, moderate ingredients, 30-45 min
  - 3 (Medium): Intermediate techniques, multiple steps, 45-60 min
  - 4 (Medium-Hard): Advanced techniques, timing-sensitive, 60-90 min
  - 5 (Hard): Expert techniques, complex steps, 90+ min

### Requirement: AI-Powered Assessment

The system SHALL invoke Claude API to analyze recipe content and assign difficulty ratings.

#### Scenario: Assess recipe difficulty with AI
- **WHEN** a recipe requires difficulty assessment
- **THEN** the system sends recipe details (title, ingredients, steps, timing) to Claude API
- **AND** uses a structured prompt with explicit rating criteria
- **AND** expects a single integer response (1-5)

#### Scenario: Successful difficulty assignment
- **WHEN** Claude API returns a valid rating (1-5)
- **THEN** the system stores the rating in the recipe's difficulty field
- **AND** the rating is immediately available for display

#### Scenario: Invalid AI response
- **WHEN** Claude API returns a non-numeric or out-of-range response
- **THEN** the system logs an error
- **AND** leaves the recipe difficulty as NULL
- **AND** continues processing other recipes (doesn't abort)

#### Scenario: AI API failure
- **WHEN** Claude API is unavailable or returns an error
- **THEN** the system logs the error with recipe ID
- **AND** leaves the recipe difficulty as NULL
- **AND** continues processing other recipes (doesn't abort)

### Requirement: Assessment Prompt Structure

The system SHALL use a consistent, structured prompt for difficulty assessment.

#### Scenario: Prompt includes recipe context
- **WHEN** invoking Claude for difficulty assessment
- **THEN** the prompt includes:
  - Recipe title
  - Preparation time
  - Cooking time
  - Servings count
  - Full ingredient list with quantities
  - Full step-by-step instructions

#### Scenario: Prompt includes rating criteria
- **WHEN** invoking Claude for difficulty assessment
- **THEN** the prompt explicitly lists the 1-5 scale criteria
- **AND** includes technique complexity considerations
- **AND** includes timing and ingredient considerations
- **AND** requests only a numeric response

### Requirement: Auto-Assignment for New Recipes

The system SHALL automatically assign difficulty when recipes are created without a user-specified rating.

#### Scenario: Create recipe without difficulty
- **WHEN** a user creates a recipe via POST /api/recipes
- **AND** the request does not include a difficulty value
- **THEN** the system invokes AI assessment after saving the recipe
- **AND** updates the recipe with the assigned difficulty

#### Scenario: Create recipe with user-specified difficulty
- **WHEN** a user creates a recipe via POST /api/recipes
- **AND** the request includes a difficulty value (1-5)
- **THEN** the system uses the user-specified difficulty
- **AND** does NOT invoke AI assessment

#### Scenario: Auto-assignment failure doesn't block creation
- **WHEN** a recipe is created without difficulty
- **AND** AI assessment fails
- **THEN** the recipe is still created successfully
- **AND** difficulty remains NULL
- **AND** the user is not shown an error

### Requirement: Rate Limiting for AI Calls

The system SHALL implement rate limiting to control API costs during batch processing.

#### Scenario: Batch processing with delay
- **WHEN** processing multiple recipes for difficulty assessment
- **THEN** the system waits at least 100ms between successive AI API calls
- **AND** processes recipes sequentially (not in parallel)

#### Scenario: Single recipe assessment has no delay
- **WHEN** assessing difficulty for a newly created recipe
- **THEN** the system invokes AI immediately without delay
- **AND** returns the response as fast as possible

## Data Types

### DifficultyRating
```
DifficultyRating: integer (1-5)
  1 = Easy
  2 = Medium-Easy
  3 = Medium
  4 = Medium-Hard
  5 = Hard
```

### AssessmentPrompt
```
AssessmentPrompt {
    recipe_title: String
    prep_time_minutes: Option<u32>
    cook_time_minutes: Option<u32>
    servings: Option<u32>
    ingredients: Vec<Ingredient>
    steps: Vec<Step>
    criteria: RatingCriteria
}
```

## Related Capabilities

- **recipe-domain**: Stores difficulty ratings in the recipes table
- **difficulty-backfill**: Uses this capability to assess existing recipes on startup
- **web-chat**: Users can trigger re-assessment via chat interface
