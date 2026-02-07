## MODIFIED Requirements

### Requirement: Empty recipe book shows placeholder

The recipe book SHALL display the recipe index as its default state instead of placeholder content. The placeholder is replaced by the index view.

#### Scenario: No recipe selected

- **WHEN** the chat page loads without a recipe displayed
- **THEN** the recipe book shows the alphabetical recipe index (not placeholder text)

#### Scenario: No recipes exist

- **WHEN** the chat page loads and no recipes exist in the vault
- **THEN** the recipe book shows a friendly empty state message within the index view (e.g., "Your recipe book is empty. Ask me to create a recipe!")
