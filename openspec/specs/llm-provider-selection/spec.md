# llm-provider-selection Specification

## Purpose
TBD - created by archiving change add-gemini-inference-provider. Update Purpose after archive.
## Requirements
### Requirement: Real LLM provider is configurable

The application SHALL support selecting the real LLM provider for chat and difficulty assessment through environment configuration.

#### Scenario: Anthropic remains the default
- **WHEN** `AI_PROVIDER` is not set
- **THEN** chat inference SHALL use Anthropic
- **AND** `AI_MODEL` SHALL continue to select the Anthropic chat model

#### Scenario: Gemini chat provider is selected
- **WHEN** `AI_PROVIDER=gemini`
- **THEN** chat inference SHALL use Gemini
- **AND** `AI_MODEL` SHALL select the Gemini chat model

#### Scenario: Difficulty provider defaults to chat provider
- **WHEN** `DIFFICULTY_PROVIDER` is not set
- **THEN** difficulty assessment SHALL use the provider selected by `AI_PROVIDER`
- **AND** `DIFFICULTY_MODEL` SHALL select that provider's difficulty model

#### Scenario: Difficulty provider can differ from chat provider
- **WHEN** `AI_PROVIDER=anthropic`
- **AND** `DIFFICULTY_PROVIDER=gemini`
- **THEN** chat inference SHALL use Anthropic
- **AND** difficulty assessment SHALL use Gemini

### Requirement: Provider API keys are validated conditionally

The application SHALL require API keys only for selected real providers.

#### Scenario: Anthropic selected
- **WHEN** Anthropic is selected for chat or difficulty assessment
- **THEN** `ANTHROPIC_API_KEY` SHALL be required

#### Scenario: Gemini selected
- **WHEN** Gemini is selected for chat or difficulty assessment
- **THEN** `GEMINI_API_KEY` SHALL be required

#### Scenario: Gemini-only deployment
- **WHEN** both chat and difficulty assessment use Gemini
- **THEN** `ANTHROPIC_API_KEY` SHALL NOT be required

#### Scenario: Mock mode bypasses real keys
- **WHEN** `MOCK_LLM=true`
- **THEN** no real provider API key SHALL be required for chat or difficulty inference

### Requirement: Gemini provider supports existing chat capabilities

Gemini chat inference SHALL preserve the existing chat behavior exposed by the API and frontend.

#### Scenario: Text chat
- **WHEN** a user sends a text-only chat message
- **AND** `AI_PROVIDER=gemini`
- **THEN** the message SHALL be sent to Gemini
- **AND** the response SHALL be returned through the existing SSE event flow

#### Scenario: Image chat
- **WHEN** a user sends a chat message with an image attachment
- **AND** `AI_PROVIDER=gemini`
- **THEN** the text and image SHALL be sent to Gemini
- **AND** Gemini SHALL be able to analyze the image content

#### Scenario: Tool use
- **WHEN** Gemini returns a function call corresponding to an available tool
- **THEN** the agent loop SHALL execute the tool
- **AND** send the tool result back to Gemini
- **AND** continue until a final text response is produced or the existing iteration limit is reached

### Requirement: Anthropic prompt caching remains provider-scoped

Anthropic-specific prompt caching SHALL remain enabled for Anthropic requests and SHALL NOT be applied to Gemini requests.

#### Scenario: Anthropic selected
- **WHEN** `AI_PROVIDER=anthropic`
- **THEN** chat requests to Anthropic SHALL continue to include the configured Anthropic cache control on the system prompt

#### Scenario: Gemini selected
- **WHEN** `AI_PROVIDER=gemini`
- **THEN** Gemini requests SHALL NOT include Anthropic `cache_control` fields
