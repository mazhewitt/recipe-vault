## MODIFIED Requirements

### Requirement: System prompt includes formatting guidelines

The AI agent system prompt SHALL include explicit instructions for the LLM to use markdown formatting when presenting recipe lists, and to keep conversational replies short and heading-free because they render as margin notes beside the recipe.

#### Scenario: System prompt specifies markdown usage
- **WHEN** the AI agent initializes
- **THEN** the system prompt includes instructions to use bold text and lists when presenting recipe lists in chat
- **AND** it states that headings and tables are not to be used in replies

#### Scenario: System prompt includes recipe templates
- **WHEN** the AI agent initializes
- **THEN** the system prompt includes an example format for recipe lists
- **AND** it reminds the model that full recipe details are shown by `display_recipe`, not written in chat

#### Scenario: System prompt asks for margin-note-length replies
- **WHEN** the AI agent initializes
- **THEN** the system prompt states that conversational replies render as margin notes and should be about 40 words or fewer

#### Scenario: Post-edit note is one sentence
- **WHEN** the AI agent initializes
- **THEN** the system prompt instructs the model to reply with a single sentence describing the change after a successful `update_recipe`
