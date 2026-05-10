## MODIFIED Requirements

### Requirement: AI-Powered Assessment

The system SHALL invoke the configured LLM provider to analyze recipe content and assign difficulty ratings.

#### Scenario: Assess recipe difficulty with AI
- **WHEN** a recipe requires difficulty assessment
- **THEN** the system sends recipe details (title, ingredients, steps, timing) to the configured LLM provider
- **AND** uses a structured prompt with explicit rating criteria
- **AND** expects a single integer response (1-5)

#### Scenario: Successful difficulty assignment
- **WHEN** the configured LLM provider returns a valid rating (1-5)
- **THEN** the system stores the rating in the recipe's difficulty field
- **AND** the rating is immediately available for display

#### Scenario: Invalid AI response
- **WHEN** the configured LLM provider returns a non-numeric or out-of-range response
- **THEN** the system logs an error
- **AND** leaves the recipe difficulty as NULL
- **AND** continues processing other recipes (doesn't abort)

#### Scenario: AI API failure
- **WHEN** the configured LLM provider is unavailable or returns an error
- **THEN** the system logs the error with recipe ID
- **AND** leaves the recipe difficulty as NULL
- **AND** continues processing other recipes (doesn't abort)
