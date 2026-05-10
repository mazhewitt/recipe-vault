## MODIFIED Requirements

### Requirement: Mock mode activates via configuration

The system SHALL activate mock LLM mode when `MOCK_LLM=true` environment variable is set, parsed into the `Config` struct.

#### Scenario: Mock mode enabled
- **WHEN** server starts with `MOCK_LLM=true`
- **THEN** `Config.mock_llm` is true
- **AND** chat and difficulty requests use the mock provider regardless of `AI_PROVIDER` or `DIFFICULTY_PROVIDER`

#### Scenario: Real mode when variable unset
- **WHEN** server starts without `MOCK_LLM` environment variable
- **THEN** `Config.mock_llm` is false
- **AND** chat and difficulty requests use the configured real LLM provider
