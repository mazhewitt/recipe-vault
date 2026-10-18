## MODIFIED Requirements

### Requirement: Extraction Response Format

The system SHALL format extracted recipes in a conversational, reviewable format, in the user's language.

#### Scenario: Display extracted recipe in chat
- **WHEN** Claude successfully extracts a recipe from an image
- **THEN** the response includes formatted sections for:
  - Recipe title
  - Description (if available)
  - Ingredients list with quantities and units
  - Numbered preparation steps
  - Timing information (prep time, cook time if detected)
  - Temperature information (if detected)
- **AND** the response ends by asking, in the user's language, whether to edit the recipe or add it to the book ("Would you like me to edit it or add it to the book?" in English)
- **AND** a user writing in German gets the whole reply, that question included, in German (model eval `hard-german-card`: `replied_german`)

#### Scenario: User requests edits to extracted recipe
- **WHEN** a user responds with requested changes (e.g., "change servings to 24")
- **THEN** Claude incorporates the changes
- **AND** displays the updated recipe
- **AND** asks for confirmation again

#### Scenario: User confirms recipe for saving
- **WHEN** a user responds with confirmation (e.g., "yes", "add it", "save it")
- **THEN** Claude calls the create_recipe tool with extracted data
- **AND** confirms the recipe was saved
- **AND** displays the recipe in the side panel
