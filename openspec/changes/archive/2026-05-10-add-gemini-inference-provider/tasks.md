## 1. Configuration

- [x] 1.1 Add an `LlmProviderKind` config enum with `anthropic` and `gemini`
- [x] 1.2 Add `AI_PROVIDER`, defaulting to `anthropic`
- [x] 1.3 Add `DIFFICULTY_PROVIDER`, defaulting to `AI_PROVIDER`
- [x] 1.4 Add optional `GEMINI_API_KEY`
- [x] 1.5 Make provider API key validation conditional on selected provider(s), with `MOCK_LLM=true` bypassing real keys
- [x] 1.6 Update `.env.example`, `README.md`, and `openspec/config.yaml`

## 2. Gemini provider adapter

- [x] 2.1 Add `LlmProviderType::Gemini`
- [x] 2.2 Add `LlmProvider::gemini()` constructor or equivalent configured construction helper
- [x] 2.3 Implement Gemini request body creation for text, image, assistant tool-call, and tool-result messages
- [x] 2.4 Implement Gemini tool/function declaration mapping from `ToolDefinition`
- [x] 2.5 Implement Gemini response parsing for text-only, tool-only, and text-with-tool-call responses
- [x] 2.6 Return helpful `LlmError::InvalidResponse` values for malformed Gemini responses

## 3. Wiring

- [x] 3.1 Use the configured chat provider in `ChatState::get_or_create_agent()`
- [x] 3.2 Use the configured difficulty provider in `auto_assign_difficulty()`
- [x] 3.3 Preserve `MOCK_LLM=true` behavior for chat and difficulty assessment
- [x] 3.4 Preserve Anthropic prompt caching behavior when `AI_PROVIDER=anthropic`

## 4. Tests

- [x] 4.1 Add config parsing tests for Anthropic defaults
- [x] 4.2 Add config parsing tests for Gemini chat and difficulty provider selection
- [x] 4.3 Add config tests proving Gemini mode does not require `ANTHROPIC_API_KEY`
- [x] 4.4 Add Gemini request mapping unit tests for text, image, tool definitions, tool calls, and tool results
- [x] 4.5 Add Gemini response parsing unit tests for text-only, tool-only, and mixed text/tool responses
- [x] 4.6 Run `cargo test`
- [x] 4.7 Run frontend lint and Playwright e2e with `MOCK_LLM=true`

## 5. Manual verification

- [x] 5.1 Start locally with `AI_PROVIDER=gemini` and send a normal chat message
- [x] 5.2 Ask to list recipes and confirm MCP tool use still works
- [x] 5.3 Paste a recipe image and confirm extraction still works
- [x] 5.4 Create a recipe without difficulty and confirm Gemini difficulty assessment stores a 1-5 rating
- [x] 5.5 Verify a native-language recipe search prompt still produces an appropriate native-script query
