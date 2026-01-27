## Requirements

### Requirement: Assistant messages render markdown

The chat UI SHALL render assistant messages as HTML by parsing markdown content. User messages SHALL remain as plain text.

#### Scenario: Assistant message with bold text
- **WHEN** the assistant sends a message containing `**bold text**`
- **THEN** the UI displays "bold text" in bold formatting

#### Scenario: Assistant message with bullet list
- **WHEN** the assistant sends a message containing a markdown bullet list
- **THEN** the UI displays the items as a properly formatted HTML unordered list

#### Scenario: User message is not parsed
- **WHEN** a user sends a message containing `**asterisks**`
- **THEN** the UI displays the literal text including the asterisks

---

### Requirement: System prompt includes formatting guidelines

The AI agent system prompt SHALL include explicit instructions for the LLM to use markdown formatting when presenting recipes and lists.

#### Scenario: System prompt specifies markdown usage
- **WHEN** the AI agent initializes
- **THEN** the system prompt includes instructions to use markdown headers, bold text, and lists for recipe content

#### Scenario: System prompt includes recipe templates
- **WHEN** the AI agent initializes
- **THEN** the system prompt includes example formats for recipe lists and recipe details

---

### Requirement: Recipe list formatting

When presenting multiple recipes, the LLM SHALL format them as a numbered list with bold titles and brief metadata.

#### Scenario: List recipes response
- **WHEN** a user asks to list recipes and multiple recipes exist
- **THEN** the response displays each recipe with a bold title, description, and key metadata (prep time, cook time, servings) on separate lines

#### Scenario: Empty recipe list
- **WHEN** a user asks to list recipes and no recipes exist
- **THEN** the response displays a friendly message without unnecessary formatting

---

### Requirement: Recipe detail formatting

When presenting a single recipe's full details, the LLM SHALL use a structured format with headers for sections.

#### Scenario: Full recipe display
- **WHEN** a user asks for details of a specific recipe
- **THEN** the response includes:
  - Recipe title as a header
  - Description as a paragraph
  - Metadata (prep time, cook time, servings) with bold labels
  - Ingredients as a bulleted list with quantities
  - Steps as a numbered list

#### Scenario: Recipe with missing optional fields
- **WHEN** a recipe is displayed that has no description or timing information
- **THEN** the response omits those sections rather than showing empty placeholders

---

### Requirement: Markdown CSS styling

The chat UI SHALL include CSS styles for rendered markdown elements within assistant messages to ensure readable typography and spacing.

#### Scenario: Headers have appropriate sizing
- **WHEN** an assistant message contains markdown headers (h1-h4)
- **THEN** the headers display with visually distinct font sizes and bottom margins

#### Scenario: Lists have proper indentation
- **WHEN** an assistant message contains bullet or numbered lists
- **THEN** the lists display with left padding and appropriate spacing between items

#### Scenario: Paragraphs have vertical spacing
- **WHEN** an assistant message contains multiple paragraphs
- **THEN** each paragraph has bottom margin for visual separation
