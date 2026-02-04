## ADDED Requirements

### Requirement: Mock LLM provider exists

The system SHALL include a `Mock` variant in `LlmProviderType` that returns predictable responses without calling external APIs.

#### Scenario: Mock variant available
- **WHEN** code references `LlmProviderType::Mock`
- **THEN** the code compiles and the variant is usable

### Requirement: Mock mode activates via configuration

The system SHALL activate mock LLM mode when `MOCK_LLM=true` environment variable is set, parsed into the `Config` struct.

#### Scenario: Mock mode enabled
- **WHEN** server starts with `MOCK_LLM=true`
- **THEN** `Config.mock_llm` is true and chat requests use the mock provider

#### Scenario: Real mode when variable unset
- **WHEN** server starts without `MOCK_LLM` environment variable
- **THEN** `Config.mock_llm` is false and chat requests use the real Anthropic API provider

### Requirement: Mock returns appropriate SSE for list queries

The mock provider SHALL return SSE responses matching the captured format when input suggests a list request.

#### Scenario: List recipes mock response
- **WHEN** chat input contains "list" (case-insensitive)
- **THEN** mock returns SSE stream with:
  - `event: chunk` with empty text
  - `event: tool_use` with `{"status":"completed","tool":"list_recipes"}`
  - `event: chunk` with recipe list text
  - `event: done` with conversation_id and tools_used

### Requirement: Mock returns appropriate SSE for display queries

The mock provider SHALL return SSE responses matching the captured format when input suggests a display request.

#### Scenario: Display recipe mock response
- **WHEN** chat input contains "show" or "display" (case-insensitive)
- **THEN** mock returns SSE stream with:
  - `event: chunk` with empty text
  - `event: tool_use` with `{"status":"completed","tool":"display_recipe"}`
  - `event: recipe_artifact` with a valid `recipe_id`
  - `event: chunk` with confirmation text
  - `event: done` with conversation_id and tools_used

### Requirement: Mock uses configurable recipe ID

The mock provider SHALL use the `mock_recipe_id` from configuration when returning `recipe_artifact` events.

#### Scenario: Recipe ID from config
- **WHEN** mock returns a `recipe_artifact` event and `MOCK_RECIPE_ID` is set
- **THEN** the `recipe_id` value matches the configured `mock_recipe_id`

#### Scenario: Test seeds recipe and configures mock
- **WHEN** test creates a recipe via API and sets `MOCK_RECIPE_ID` to that recipe's ID
- **THEN** mock returns that ID in `recipe_artifact` events and the recipe displays correctly

### Requirement: Mock preserves conversation context

The mock provider SHALL maintain conversation_id across requests in the same session.

#### Scenario: Conversation ID persists
- **WHEN** multiple chat requests are made with the same conversation_id
- **THEN** mock responses include the same conversation_id in the done event
