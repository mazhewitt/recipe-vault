## Context

`LlmProvider` is the single inference boundary used by the chat agent and background difficulty assessment. Chat relies on tool calls for MCP-backed recipe operations plus native display tools. The existing `Message` and `ContentBlock` types already represent text, tool results, and image inputs at a provider-neutral level.

Anthropic currently has one provider-specific behavior: prompt caching via `cache_control` on the system prompt. Gemini support must not weaken that path. It should add a separate provider adapter while leaving Anthropic defaults and caching intact.

## Goals / Non-Goals

**Goals:**
- Allow chat inference through Gemini by configuration
- Allow difficulty assessment through Gemini by configuration
- Preserve Anthropic as the default provider
- Preserve mock LLM behavior for tests
- Preserve image input support for recipe extraction
- Preserve tool-call loop behavior for MCP and native tools

**Non-Goals:**
- Runtime provider switching from the web UI
- Per-request provider selection
- Adding a new frontend protocol or SSE event shape
- Reintroducing OpenAI support
- Streaming provider tokens directly from Anthropic or Gemini; the current backend response loop remains unchanged

## Decisions

### Decision: Provider selection is environment-based

Add `AI_PROVIDER` for chat and `DIFFICULTY_PROVIDER` for difficulty assessment. Both accept `anthropic` or `gemini`. `AI_PROVIDER` defaults to `anthropic`. `DIFFICULTY_PROVIDER` defaults to `AI_PROVIDER` so deployments can switch both paths with one variable, while still allowing cheaper/faster difficulty settings later.

Model variables remain split:

```env
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-6

DIFFICULTY_PROVIDER=anthropic
DIFFICULTY_MODEL=claude-haiku-4-5
```

For Gemini:

```env
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-pro

DIFFICULTY_PROVIDER=gemini
DIFFICULTY_MODEL=gemini-2.5-flash
GEMINI_API_KEY=...
```

### Decision: API key config remains explicit

Keep provider-specific key fields rather than a generic `LLM_API_KEY`. This avoids ambiguous deployments with both providers configured and makes secret naming obvious:

- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

`Config::from_env()` validates only keys required by the selected real provider(s). `MOCK_LLM=true` bypasses real provider key requirements.

### Decision: Gemini is implemented in `LlmProvider`

Add `LlmProviderType::Gemini` and provider-specific methods in `src/ai/llm.rs`. The adapter maps existing internal types to Gemini's REST `generateContent` shape:

- system prompt -> Gemini system instruction
- user text -> text parts
- user image -> inline data part with MIME type and base64 data
- tool definitions -> function declarations
- assistant tool calls -> function call parts
- tool results -> function response parts

The agent loop continues to consume `LlmResponse::Text`, `ToolUse`, and `TextWithToolUse`.

### Decision: Anthropic prompt caching remains scoped

The `prompt-caching` capability remains Anthropic-specific. Gemini requests do not receive Anthropic `cache_control`, and provider selection must not alter Anthropic request bodies.

## Risks / Trade-offs

- **Tool response schema mismatch**: Gemini function responses differ from Anthropic tool results. Unit tests should cover multi-turn tool-call mapping before live testing.
- **Image extraction parity**: Gemini supports inline image data, but model behavior may differ. Keep a manual image extraction check in verification.
- **Native-language search quality**: Chat prompts rely on multilingual query quality. Manual verification should include native-script search examples before deploying Gemini as the chat provider.
- **Model names change over time**: Defaults should be documented and configurable. If Gemini defaults age, deployments can override `AI_MODEL` and `DIFFICULTY_MODEL`.

## Migration Plan

No database migration. Deployments that do nothing continue using Anthropic. Deployments can opt into Gemini by setting provider and key environment variables, then restarting the server.
