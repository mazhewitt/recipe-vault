## ADDED Requirements

### Requirement: System prompt is sent with cache control
When making a request to the Anthropic Messages API, the system prompt SHALL be sent as a structured content block with `cache_control: {type: "ephemeral"}` so the Anthropic API can cache the prompt prefix and skip re-tokenising it on subsequent calls.

#### Scenario: First request includes cache_control block
- **WHEN** the application sends a chat completion request to the Anthropic API
- **THEN** the `system` field in the request body SHALL be an array containing one object with `type: "text"`, `text: <system prompt content>`, and `cache_control: {"type": "ephemeral"}`

#### Scenario: Subsequent requests in same session benefit from cache
- **WHEN** a second or later chat turn is sent using the same system prompt content
- **THEN** the Anthropic API SHALL return a non-zero `cache_read_input_tokens` value in the usage block, confirming the cache was hit

#### Scenario: Fallback when system prompt is absent
- **WHEN** `complete_anthropic` is called with `system_prompt: None`
- **THEN** no `system` field SHALL be included in the request body (behaviour unchanged from current)

### Requirement: Default model is claude-haiku-4-5
The application SHALL default to `claude-haiku-4-5` when the `AI_MODEL` environment variable is not set, in place of the previous default `claude-sonnet-4-5`.

#### Scenario: No AI_MODEL env var set
- **WHEN** the application starts without `AI_MODEL` configured
- **THEN** all Anthropic API calls SHALL use model `claude-haiku-4-5`

#### Scenario: AI_MODEL override is respected
- **WHEN** `AI_MODEL=claude-sonnet-4-6` is set in the environment
- **THEN** all Anthropic API calls SHALL use model `claude-sonnet-4-6`

### Requirement: HTTP client is shared across LLM providers
A single `reqwest::Client` SHALL be created at application startup and reused for all `LlmProvider` instances, so that TLS sessions and connection pools are shared rather than re-initialised per request.

#### Scenario: Shared client passed to LlmProvider
- **WHEN** `LlmProvider::new()` is called with an explicit `reqwest::Client`
- **THEN** that client SHALL be used for all outbound HTTP requests made by that provider instance

#### Scenario: No client provided falls back to new client
- **WHEN** `LlmProvider::new()` is called without a client (e.g. in tests or mocks)
- **THEN** a new `reqwest::Client` SHALL be created internally (existing behaviour preserved)

#### Scenario: Difficulty assessment reuses app-level client
- **WHEN** `auto_assign_difficulty` creates an `LlmProvider`
- **THEN** it SHALL use the shared client from application state rather than creating a new one
