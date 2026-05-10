## Why

Recipe Vault currently routes real inference through Anthropic only. The LLM abstraction is already centralized in `src/ai/llm.rs`, and OpenAI support has been removed because it was unused. Adding Gemini as a first-class configured provider gives us an alternate inference backend without changing chat, MCP tool execution, recipe CRUD, or the frontend protocol.

## What Changes

- Add provider selection for chat and difficulty inference via environment configuration
- Add a Gemini implementation to `LlmProvider` using the existing `Message`, `ToolDefinition`, `ToolCall`, and `ContentBlock` abstractions
- Keep Anthropic as the default provider and preserve Anthropic prompt caching only for Anthropic requests
- Make API key validation provider-aware so Gemini mode requires `GEMINI_API_KEY` and does not require `ANTHROPIC_API_KEY`
- Update documentation and examples to describe Anthropic and Gemini provider options

## Capabilities

### New Capabilities
- `llm-provider-selection`: Select Anthropic or Gemini independently for chat and difficulty inference

### Modified Capabilities
- `web-chat`: Chat sends requests to the configured real LLM provider rather than always Anthropic
- `recipe-difficulty-rating`: Difficulty assessment sends requests to the configured real LLM provider rather than always Anthropic
- `llm-mocking`: `MOCK_LLM=true` continues to override the real provider selection for deterministic tests

## Impact

- `src/config.rs` - add provider config and provider-aware API key validation
- `src/ai/llm.rs` - add Gemini provider request/response, tool-call, and image-content mapping
- `src/chat/state.rs` - construct the configured chat provider
- `src/handlers/recipes.rs` - construct the configured difficulty provider
- `.env.example`, `README.md`, `openspec/config.yaml` - document provider selection
- No database migrations required
- No frontend API or SSE event shape changes
