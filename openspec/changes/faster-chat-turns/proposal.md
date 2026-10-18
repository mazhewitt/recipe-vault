## Why

The owner tried the release candidate against the real Gemini on 2026-10-18: "the model or the connection to the model is too slow - the functionality works well". Measured that evening:

- **The connection is not it.** A cold connection to the Gemini API is 0.03 s (DNS, TCP, TLS) and 0.1 s to the first byte; the app reuses one connection.
- **Every 3.8 Flash call thinks first.** Asked to reply "OK", it takes 1.7 s at its default thinking level. Streaming a cooking answer, the first words come at 6.6–7.5 s by default and 1.4–2.1 s at `low`.
- **A turn is several calls in a row.** The browser sees nothing until the agent loop ends, so a turn costs the sum of its calls. A question about the open recipe is two: the page sends only the recipe's id, title and servings, so the model first calls `get_recipe` and only then answers. "Update the recipe" was three (14 s or so); a web search, six (over 30 s).

Four messages on the lasagne ("what temperature for the oven?", "how long does the sauce simmer?", "halve this", "I only have pancetta…"), two runs each through `/api/chat`:

| setup | median turn | mean | worst |
|---|---|---|---|
| today: 3.8 Flash, default thinking | 4.6 s | 5.8 s | 10.9 s |
| thinking `low` | 3.3 s | 3.9 s | 6.9 s |
| `low`, the recipe in the message (simulated) | 2.6 s | 4.5 s* | 18.8 s* |

\* one call stalled 18.8 s on Google's side (52 output tokens). With the recipe in the message, "how long does the sauce simmer?" was answered in 1.4–1.9 s, with no `get_recipe`.

## What Changes

- **The open recipe travels with the message.** When a chat request names `current_recipe`, the handler reads that recipe (scoped to the user's family) and adds its saved text to the `[Current recipe context]` block: title, description, servings, times, difficulty, tags, every ingredient and every step with its duration and temperature. Compact text, not `get_recipe`'s pretty JSON (about 600 tokens for the lasagne against about 4,000).
- **The model is told to use it.** The system prompt, the long-conversation reminder and the `get_recipe` tool description say to answer, scale and substitute from that text, and to call `get_recipe` only for another recipe or when the text is missing.
- **Chat thinks at `low` in production.** `GEMINI_THINKING_LEVEL=low` joins `AI_MODEL` and `DIFFICULTY_MODEL` in the NAS settings at the release, so it can be undone without one. The setting now applies to chat only: the difficulty and tag jobs on Flash-Lite keep their model's (minimal) default instead of being raised to `low`.
- **Three prompt gaps that `low` exposed, closed.** Asked which recipes are vegetarian, the model trusted the tags and dropped the untagged meat-free bakes; it pasted the prompt's English "edit it or add it to the book?" into a German reply; and the tags rule still said the context carries no tags. The prompt now says to judge diet from what a recipe is, to ask in the user's language, and that the open recipe's tags are in the context.
- **Checked live.** The model eval runs at `low` with the new context, with a `grounded-search` check that now wants every meat-free recipe named, and the timing table is measured again on the real implementation.

## Capabilities

### Modified Capabilities
- `current-recipe-context`: the open recipe's saved text is sent with each message, and the guidance changes from "call `get_recipe` when needed" to "answer from the text".
- `llm-provider-selection`: `GEMINI_THINKING_LEVEL` applies to chat requests only.
- `recipe-image-extraction`: the confirmation question is asked in the user's language.
- `recipe-tags`: diet questions are answered from what each recipe is, not from its tags alone.

## Impact

- `src/handlers/chat.rs` (the block, the family-scoped read), `src/chat/state.rs` and `src/main.rs` (the pool reaches the chat state), `src/ai/prompts.rs`, `src/ai/client.rs`, `src/mcp/tools.rs`, `src/handlers/recipes.rs` (the assessment provider drops the thinking level).
- Tests: `tests/chat_test.rs`, `tests/difficulty_test.rs`, the model eval (`grounded-search` now checks every meat-free recipe).
- Docs: `README.md`, `SYNOLOGY.md`, `.env.example`, `deploy/.env.example`.
- Cost: about 600 more prompt tokens on each turn with a recipe open, against about 4,000 saved on every turn that would have called `get_recipe`, and less thinking billed as output.
- Archives after `upgrade-gemini-models`, whose thinking-level requirement it modifies.
