## ADDED Requirements

### Requirement: Fetch Recipe from URL
The system SHALL provide a tool that fetches web content from a given URL and returns it in markdown format suitable for recipe extraction.

#### Scenario: Fetch recipe webpage successfully
- **WHEN** user provides URL "https://example.com/banana-bread"
- **THEN** fetch tool SHALL retrieve the webpage content
- **AND** content SHALL be converted to markdown format
- **AND** markdown SHALL be returned to Claude for extraction

#### Scenario: Handle fetch errors
- **WHEN** URL is invalid or unreachable
- **THEN** fetch tool SHALL return error message
- **AND** error SHALL be surfaced to Claude in tool result

#### Scenario: Respect content length limits
- **WHEN** webpage content exceeds maximum length
- **THEN** fetch tool SHALL return truncated content
- **AND** truncation SHALL preserve beginning of content (where recipes typically are)

### Requirement: URL-Based Recipe Creation Workflow
The system SHALL support end-to-end workflow of fetching URL, extracting recipe data, and saving to database.

#### Scenario: Complete URL-to-recipe flow
- **WHEN** user sends message "Save this recipe: https://example.com/cake"
- **THEN** Claude SHALL call fetch tool with the URL
- **AND** Claude SHALL extract recipe details from returned markdown
- **AND** Claude SHALL call create_recipe with extracted data
- **AND** Claude SHALL call display_recipe to show saved recipe to user

#### Scenario: Handle non-recipe URLs
- **WHEN** fetched content does not contain recipe information
- **THEN** Claude SHALL inform user that no recipe was found
- **AND** Claude SHALL suggest providing a different URL or manual entry

### Requirement: Fetch Server Integration
The system SHALL integrate the official @modelcontextprotocol/server-fetch as a managed MCP server process.

#### Scenario: Fetch server initialization
- **WHEN** AiAgent starts
- **THEN** fetch server SHALL be spawned via uvx command
- **AND** fetch server SHALL register its "fetch" tool
- **AND** fetch tool SHALL be available to Claude

#### Scenario: Fetch tool parameters
- **WHEN** Claude calls fetch tool
- **THEN** tool SHALL accept "url" parameter as required string
- **AND** tool SHALL accept optional "max_length" parameter
- **AND** tool SHALL accept optional "raw" parameter for unformatted content

### Requirement: System Prompt Documentation
The system SHALL document URL recipe extraction capability in the system prompt so Claude knows how to use it.

#### Scenario: Prompt includes URL extraction guidance
- **WHEN** chat session initializes
- **THEN** system prompt SHALL include section on "Fetching Recipes from URLs"
- **AND** section SHALL explain workflow: fetch → extract → create → display
- **AND** section SHALL mention fetch tool usage

#### Scenario: Claude follows documented workflow
- **WHEN** user provides recipe URL
- **THEN** Claude SHALL follow documented workflow from system prompt
- **AND** Claude SHALL use fetch tool before attempting recipe creation
- **AND** Claude SHALL not fabricate recipe data without fetching URL first
