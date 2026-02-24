## Context

The recipe-vault chat feature calls the Anthropic Messages API for every user turn. Observed latency is high — the UI shows a prolonged "Thinking" state before the first token arrives.

Current state:
- Model: `claude-sonnet-4-5` (default; configurable via `AI_MODEL`)
- System prompt: ~129 lines, sent verbatim on every API call, never cached
- `reqwest::Client`: created fresh in `auto_assign_difficulty()` each time a recipe is saved without an explicit difficulty; the chat-path client is reused correctly (one per user session)
- No extended thinking configured — the delay is pure inference latency, not a reasoning budget

## Goals / Non-Goals

**Goals:**
- Reduce time-to-first-token (TTFT) for chat turns by enabling Anthropic prompt caching on the system prompt
- Upgrade the chat model from `claude-sonnet-4-5` to `claude-sonnet-4-6` (faster, higher quality, better multilingual support)
- Use `claude-haiku-4-5` for difficulty assessment only — a simple structured task that doesn't require Sonnet's language capabilities
- Eliminate unnecessary TLS handshakes in the difficulty-assessment path by reusing a shared `reqwest::Client`

**Non-Goals:**
- Changing the conversation flow, tool set, or agent loop logic
- Adding streaming to the Anthropic HTTP call (the SSE layer to the browser already exists)
- Tuning `max_tokens` or the system prompt content

## Decisions

### 1 — Prompt caching via `cache_control`

**Decision**: Wrap the system prompt in a structured content block with `"cache_control": {"type": "ephemeral"}` when calling `complete_anthropic`. This tells the Anthropic API to cache the prefix after the first call so subsequent turns skip re-tokenising the system prompt.

**Alternatives considered**:
- *Do nothing*: No improvement.
- *Shorten the system prompt*: Effective but risks reducing quality; cache control is simpler and reversible.

**How**: Change the `system` field in the request body from a plain string to an array:
```json
"system": [
  {
    "type": "text",
    "text": "<system prompt>",
    "cache_control": {"type": "ephemeral"}
  }
]
```
Both formats are accepted by the Anthropic API.

### 2 — Split model strategy: Sonnet for chat, Haiku for difficulty assessment

**Decision**: Introduce a second model config value (`DIFFICULTY_MODEL`) defaulting to `claude-haiku-4-5`, while upgrading the chat model default (`AI_MODEL`) from `claude-sonnet-4-5` to `claude-sonnet-4-6`.

**Rationale**: The chat path requires strong multilingual capability. The system prompt explicitly instructs the model to generate search queries in the native script of a dish's cuisine (Marathi, Bengali, Konkani, etc.) and to disambiguate diaspora dishes with cultural nuance. Haiku is weaker at less-resourced scripts and may produce incorrect transliterations or miss colloquial local terminology — silently degrading recipe search quality. Sonnet 4-6 is measurably faster than 4-5 and has better multilingual coverage.

Difficulty assessment, by contrast, is a single-turn structured task: read a recipe, return a digit 1–5. It requires no multilingual reasoning and is a background fire-and-forget call. Haiku handles this correctly and at lower cost.

**Alternatives considered**:
- *Haiku for everything*: Faster and cheaper, but risks silent quality regressions on native-language search queries and diaspora disambiguation.
- *Sonnet 4-6 for everything*: Correct but misses the cost/latency saving on difficulty assessment.
- *Single `AI_MODEL` env var for both*: Simpler config but forces a quality/speed compromise on one path or the other.

### 3 — Share a single `reqwest::Client`

**Decision**: Accept an optional `reqwest::Client` parameter in `LlmProvider::new()`. Application startup creates one shared client and passes it everywhere (chat state + difficulty assessment). If `None` is passed, a new client is created (preserves existing test/mock behaviour).

**Alternatives considered**:
- *Global/lazy static client*: Works but harder to test and configure (timeouts, TLS settings).
- *Pass Arc<Client> through Config*: Cleaner for the config-driven path; chosen approach is minimal change.

## Risks / Trade-offs

- **Haiku quality regression on difficulty assessment** → Low risk: the task is a single digit 1–5 with clear rubric. If the rating proves inaccurate, `DIFFICULTY_MODEL` can be overridden to Sonnet.
- **Sonnet 4-6 regression on chat** → No regression expected; 4-6 is strictly newer than 4-5.
- **Cache miss on first request** → No regression; TTFT on first turn is unchanged; subsequent turns benefit.
- **Anthropic caching API changes** → `cache_control` is stable as of anthropic-version `2023-06-01`; if it changes, removing the field degrades gracefully back to current behaviour.
- **Shared client connection limits** → `reqwest::Client` default pool is 10 connections per host; recipe-vault is a family app with very low concurrency, so this is not a concern.

## Migration Plan

1. Update `LlmProvider::new()` to accept `Option<reqwest::Client>` — backwards-compatible
2. Add prompt-caching block to `complete_anthropic()`
3. Update default `AI_MODEL` to `claude-sonnet-4-6` in `.env.example` and `config.rs`
4. Add `DIFFICULTY_MODEL` config value defaulting to `claude-haiku-4-5`; pass it when constructing the `LlmProvider` in `auto_assign_difficulty()`
5. Pass shared client from app startup into chat state and difficulty-assessment path
6. No database migrations, no API changes, no cache purge needed

**Rollback**: Revert the three code changes; no persistent state is affected.

## Open Questions

- None — all decisions are low-risk and reversible via env var.
