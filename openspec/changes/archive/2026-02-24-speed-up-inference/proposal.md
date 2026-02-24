## Why

Inference responses feel slow — the UI shows a prolonged "Thinking" state before any reply arrives.
Investigation confirms no extended thinking is enabled; the latency is from an older model, absence of prompt caching, and a fresh HTTP client being created for every difficulty-assessment call.

## What Changes

- Add `cache_control: {"type": "ephemeral"}` to the system prompt block in Anthropic API calls so the large static system prompt is cached between turns
- Upgrade the default model from `claude-sonnet-4-5` to `claude-haiku-4-5` (configurable via `AI_MODEL`)
- Share a single `reqwest::Client` across all `LlmProvider` instances by accepting an optional client at construction time, eliminating repeated TLS handshakes for difficulty-assessment calls

## Capabilities

### New Capabilities
- `prompt-caching`: Send the system prompt with Anthropic's `cache_control` ephemeral header so it is cached server-side and not re-processed each turn

### Modified Capabilities
- None — no spec-level behaviour changes; this is a pure performance improvement to the existing inference pipeline

## Impact

- `src/ai/llm.rs` — `LlmProvider::new()` / `complete_anthropic()` (add cache_control header, accept optional client)
- `src/handlers/recipes.rs` — `auto_assign_difficulty()` (pass shared client)
- `.env.example` — update default `AI_MODEL` value
- No database migrations required
- No API surface changes visible to the frontend
