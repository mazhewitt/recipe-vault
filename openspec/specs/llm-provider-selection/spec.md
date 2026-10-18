# llm-provider-selection Specification

## Purpose
Lets the deployment choose the chat and background models (Anthropic or Gemini) through configuration, with conditional key checks, current defaults, an output budget, an optional thinking level and surfaced finish reasons.

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

### Requirement: Gemini defaults are current stable models

When `AI_MODEL` or `DIFFICULTY_MODEL` is unset and Gemini is the selected provider, the application SHALL default to stable (non-preview, non-deprecated) Gemini model ids, pinned exactly rather than through a `-latest` alias.

#### Scenario: Gemini chat default
- **WHEN** `AI_PROVIDER=gemini` and `AI_MODEL` is unset
- **THEN** chat inference SHALL use `gemini-3.8-flash`

#### Scenario: Gemini background default
- **WHEN** difficulty assessment or tag assessment uses Gemini and `DIFFICULTY_MODEL` is unset
- **THEN** it SHALL use `gemini-3.5-flash-lite`

#### Scenario: Explicit model still wins
- **WHEN** `AI_MODEL=gemini-2.5-pro` is set
- **THEN** chat inference SHALL use `gemini-2.5-pro` unchanged, so production can roll back by configuration alone

### Requirement: Gemini output budget covers thinking

Gemini requests SHALL set `generationConfig.maxOutputTokens` to 16384 by default, overridable by a positive integer in `GEMINI_MAX_OUTPUT_TOKENS`, because on Gemini 3 and later the limit is shared by thinking and visible output.

#### Scenario: Default budget
- **WHEN** a Gemini request is built and `GEMINI_MAX_OUTPUT_TOKENS` is unset
- **THEN** `generationConfig.maxOutputTokens` SHALL be 16384

#### Scenario: Override
- **WHEN** `GEMINI_MAX_OUTPUT_TOKENS=32768`
- **THEN** `generationConfig.maxOutputTokens` SHALL be 32768

#### Scenario: Invalid override
- **WHEN** `GEMINI_MAX_OUTPUT_TOKENS` is not a positive integer
- **THEN** configuration loading SHALL fail with an error naming the variable

### Requirement: Gemini thinking level is optional and model-gated

The application SHALL accept an optional `GEMINI_THINKING_LEVEL` of `low`, `medium` or `high`, and SHALL send it as `generationConfig.thinkingConfig.thinkingLevel` only on chat requests, and only to models whose id starts with `gemini-3` or `gemini-4`. Background difficulty and tag assessments SHALL NOT carry it, so their model keeps its own default.

#### Scenario: Unset
- **WHEN** `GEMINI_THINKING_LEVEL` is unset
- **THEN** Gemini requests SHALL NOT include `thinkingConfig`, and each model uses its own default

#### Scenario: Gemini 3+ model
- **WHEN** `GEMINI_THINKING_LEVEL=low` and the chat model is `gemini-3.8-flash`
- **THEN** the chat request SHALL include `"thinkingConfig": {"thinkingLevel": "low"}`

#### Scenario: Gemini 2.5 model
- **WHEN** `GEMINI_THINKING_LEVEL=low` and the model is `gemini-2.5-pro`
- **THEN** the request SHALL NOT include `thinkingConfig`, because 2.5 rejects `thinkingLevel`

#### Scenario: Unsupported value
- **WHEN** `GEMINI_THINKING_LEVEL=minimal` or any value outside `low|medium|high`
- **THEN** configuration loading SHALL fail with an error naming the variable and the accepted values

#### Scenario: Background assessments keep their model's default
- **WHEN** `GEMINI_THINKING_LEVEL=low` and a difficulty or tag assessment calls `gemini-3.5-flash-lite`
- **THEN** that request SHALL NOT include `thinkingConfig`

### Requirement: Gemini finish reasons are surfaced

The Gemini client SHALL read `candidates[0].finishReason` and `promptFeedback.blockReason`, and turn a response without usable content into a specific error rather than a generic parse failure.

#### Scenario: Normal completion
- **WHEN** `finishReason` is `STOP` and the parts contain text or function calls
- **THEN** the response SHALL be parsed exactly as before

#### Scenario: Cut off by the output budget
- **WHEN** `finishReason` is `MAX_TOKENS` and the response has no text and no function call
- **THEN** the client SHALL return an error whose message says the reply was cut off before it finished
- **AND** the finish reason SHALL be logged at `warn`

#### Scenario: Partial text at the budget
- **WHEN** `finishReason` is `MAX_TOKENS` and the response has some text but no function call
- **THEN** the client SHALL return the text it received
- **AND** the finish reason SHALL be logged at `warn`

#### Scenario: Blocked or malformed
- **WHEN** `promptFeedback.blockReason` is present, or `finishReason` is `SAFETY`, `RECITATION`, `PROHIBITED_CONTENT`, `BLOCKLIST`, `SPII` or `MALFORMED_FUNCTION_CALL`, and there is no usable content
- **THEN** the client SHALL return an error naming the reason
- **AND** the error SHALL NOT include prompt or response content

### Requirement: Gemini function calls are echoed unchanged

When a Gemini function call is sent back in conversation history, its part SHALL contain exactly the fields the model returned: `name`, `args`, the `thoughtSignature` if one was returned, and `id` only if the model supplied one.

#### Scenario: Model supplied an id
- **WHEN** the model returns `functionCall` with `id: "abc"`
- **THEN** the echoed part and the matching `functionResponse` SHALL both carry `id: "abc"`

#### Scenario: Model omitted the id
- **WHEN** the model returns a `functionCall` without an `id`
- **THEN** the app MAY use a synthetic id internally to pair the call with its result
- **AND** the echoed `functionCall` part SHALL NOT contain an `id`
- **AND** the matching `functionResponse` SHALL NOT contain an `id`

#### Scenario: Signature preserved
- **WHEN** the model returns a `functionCall` part with a `thoughtSignature`
- **THEN** the echoed part SHALL carry the identical signature on the same part

### Requirement: Gemini usage is logged

After every Gemini `generateContent` response, the client SHALL log one `info` line carrying the model id, `promptTokenCount`, `candidatesTokenCount`, `thoughtsTokenCount`, `cachedContentTokenCount` and `finishReason`. Missing counts are logged as 0. Prompt and response content SHALL NOT be logged.

#### Scenario: Usage line
- **WHEN** a Gemini response includes `usageMetadata`
- **THEN** a log line of the form `gemini usage model=<id> prompt_tokens=<n> output_tokens=<n> thoughts_tokens=<n> cached_tokens=<n> finish_reason=<r>` SHALL be emitted at `info`
