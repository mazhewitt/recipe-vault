## Why

Production chat runs on `gemini-2.5-pro`, which is end-of-line:

- Vertex retires `gemini-2.5-pro` and `gemini-2.5-flash` on 2026-10-20, with `gemini-3.8-flash` named as the replacement.
- On the Gemini API (which this app uses) 2.5 has no shutdown date yet. Since 2026-09-18 it is limited to keys that already used it, a typical prelude to retirement.

Its successors are better at the things the cook relies on (tool use, reading photographed recipe cards, following a long conversation) and, through 2026, cheaper. `gemini-3.8-flash` is $0.75/$3.75 per 1M tokens against 2.5 Pro's $1.25/$10. See `research.md` for sources.

The Gemini client in `src/ai/llm.rs` was written against 2.5. It already echoes thought signatures correctly, which is the headline Gemini 3 breaking change. It has four smaller gaps that the newer models make likelier to bite:

1. **The output cap is 4096 tokens, and since Gemini 3 it includes thinking** (`llm.rs:626-629`). A photographed recipe turned into a `create_recipe` call, plus thinking, can be cut off.
2. **`finishReason` is never read** (`llm.rs:758-767`). A truncated, blocked or malformed reply surfaces as an opaque chat error, with nothing in the log to say why.
3. **Synthetic function-call ids are written into echoed parts** (`llm.rs:785-789`, `713-718`). Google requires the functionCall part to be returned "exactly as it was returned by the model".
4. **Token usage is never logged**, so cost and thinking volume are invisible. That makes this choice, and every later one, guesswork.

## What Changes

- **Log per-call usage** for Gemini: model, prompt / output / thoughts / cached tokens and `finishReason`, at `info`. Never content.
- **Raise the Gemini output budget** to 16,384 tokens, overridable with `GEMINI_MAX_OUTPUT_TOKENS`.
- **Read `finishReason`.** A cut-off, blocked or malformed reply becomes a specific, user-presentable error instead of a parse failure, and is logged with its reason.
- **Echo function calls unchanged.** A call id is sent back only if the model supplied one. When the app has to invent an id to pair a call with its result, the id stays internal.
- **Optional `GEMINI_THINKING_LEVEL`** (`low` | `medium` | `high`), sent only to Gemini 3+ models. 2.5 rejects the field, and `minimal` is rejected by 3.8 Flash, so it is not offered.
- **New Gemini defaults**, chosen by a live eval against the production prompt, tools and data shape (results in `design.md`):
  - chat: `gemini-3.8-flash` (was `gemini-2.5-pro`)
  - background difficulty and tagging: `gemini-3.5-flash-lite` (was `gemini-2.5-flash`)
- **A repeatable model eval** in `tests/model-eval/` drives the real `/api/chat` through ten cooking scenarios and scores the outcomes. It runs against a fresh database, and the next model change runs it again instead of guessing.
- **No more phantom "conversation was reset".** The handler tells the model that history was lost on every brand-new chat, because the browser's first message carries no `conversation_id`. Real models obey, so every first reply apologises for a reset that never happened. Found by the eval; affects every model, current one included.
- Docs: `.env.example`, `deploy/.env.example` (still says `claude-3-5-sonnet-20241022`) and `README.md`.

## Non-goals

- **Moving chat to Claude 5.5.** Sonnet 5.5 thinks by default and requires its thinking blocks to be passed back unchanged in tool loops. The client discards them (`llm.rs:572`, `492-512`). That is a separate change; it is filed in `.scratch/anthropic-claude-5-thinking-blocks/`.
- **Token streaming to the browser.** The UI waits for the whole agent loop today (`handlers/chat.rs:180-185`), so a faster model is the cheapest latency win available.
- **Preserving thought signatures on text parts.** Google calls it "recommended … omitting it won't cause an error"; revisit if the eval shows multi-turn quality loss.
- **The Interactions API.** `generateContent` remains documented and supported.

## Capabilities

### Modified Capabilities
- `web-chat`: the lost-history notice is sent only when a known-but-lost conversation is resumed.
- `llm-provider-selection`: Gemini requests have an output budget, read `finishReason`, echo function calls unchanged, log usage and accept an optional thinking level; default Gemini model ids change.

## Impact

- `src/ai/llm.rs` (Gemini request/response), `src/config.rs` (defaults, two optional env vars), docs.
- Production: set `AI_MODEL=gemini-3.8-flash` and `DIFFICULTY_MODEL=gemini-3.5-flash-lite` in the NAS `.env`, or remove them and take the new defaults. Rollback: set `AI_MODEL=gemini-2.5-pro`. No data or schema change.
