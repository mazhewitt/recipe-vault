## MODIFIED Requirements

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
