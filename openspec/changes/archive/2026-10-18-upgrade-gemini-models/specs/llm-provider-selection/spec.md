## ADDED Requirements

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

The application SHALL accept an optional `GEMINI_THINKING_LEVEL` of `low`, `medium` or `high`, and SHALL send it as `generationConfig.thinkingConfig.thinkingLevel` only to models whose id starts with `gemini-3` or `gemini-4`.

#### Scenario: Unset
- **WHEN** `GEMINI_THINKING_LEVEL` is unset
- **THEN** Gemini requests SHALL NOT include `thinkingConfig`, and each model uses its own default

#### Scenario: Gemini 3+ model
- **WHEN** `GEMINI_THINKING_LEVEL=low` and the model is `gemini-3.8-flash`
- **THEN** the request SHALL include `"thinkingConfig": {"thinkingLevel": "low"}`

#### Scenario: Gemini 2.5 model
- **WHEN** `GEMINI_THINKING_LEVEL=low` and the model is `gemini-2.5-pro`
- **THEN** the request SHALL NOT include `thinkingConfig`, because 2.5 rejects `thinkingLevel`

#### Scenario: Unsupported value
- **WHEN** `GEMINI_THINKING_LEVEL=minimal` or any value outside `low|medium|high`
- **THEN** configuration loading SHALL fail with an error naming the variable and the accepted values

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
