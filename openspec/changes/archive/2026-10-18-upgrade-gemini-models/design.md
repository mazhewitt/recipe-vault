## Context

Recipe Vault's chat is an agent loop. A non-streaming `generateContent` call (`llm.rs:593`) is made with the system prompt from `src/ai/prompts.rs` and the MCP tools (`list_recipes`, `get_recipe`, `create_recipe`, `update_recipe`, `delete_recipe`, `start_timer`, plus native `display_recipe` / `display_meal_plan`, and `fetch` / DuckDuckGo `search` via `uvx` in production). The loop runs until the model answers in text. The browser sees nothing until the whole loop finishes (`handlers/chat.rs:180-185`), so on a tablet in the kitchen **latency is the sum of every model call, thinking included**.

The background jobs (difficulty 1-5, tag assessment) are single-shot, tool-free calls on every recipe save.

Research with primary sources: `research.md` (2026-10-17). ListModels with the production key on the same date confirmed every candidate id below is servable.

## Decisions

### D1. Chat model: `gemini-3.8-flash`, pending the eval
Candidates that are stable, current and servable:

| id | status | $/1M in/out | note |
|---|---|---|---|
| `gemini-2.5-pro` | baseline; end-of-line | 1.25 / 10 | Vertex retires 2026-10-20 |
| `gemini-3.8-flash` | stable 2026-09-02 | 0.75 / 3.75 to 2026-12-31, then 1.50 / 7.50 | "most intelligent Flash"; default thinking medium |
| `gemini-3.6-flash` | stable | as 3.8 | built to use fewer tokens and turns |
| `gemini-4-argon` | stable 2026-10-13 | 2 / 10 to 2026-11-30, then 4 / 20 | flagship; wants 32k output budget; slow on hard prompts |
| `gemini-3.5-flash-lite` | stable | 0.30 / 2.50 | default thinking minimal |

Rejected without eval:
- `gemini-3.1-pro-preview` is a preview and costs more.
- `gemini-3.5-flash` and `gemini-3.7-flash` are deprecated and auto-routed.
- The `-latest` aliases have undocumented targets.

The research recommendation is 3.8 Flash, on capability per dollar and because the app does not stream. **The eval below decides.** If 3.8 Flash fails on tool reliability, the fallback order is 3.6 Flash, then Argon.

### D2. Background model: `gemini-3.5-flash-lite`
Stable, no shutdown date, minimal thinking by default. About 90 calls a month costs about $0.04, so the choice here is about reliability, not price. The eval checks that difficulty and tag calls still parse.

### D3. Output budget 16,384, overridable
Thinking now counts against `maxOutputTokens`. 16k gives a long `create_recipe` call ample room at medium thinking without inviting runaway spend: the bill is for tokens produced, not the cap. Argon's guide asks for 32k, which `GEMINI_MAX_OUTPUT_TOKENS` provides if Argon is ever chosen.

### D4. `GEMINI_THINKING_LEVEL` is opt-in and model-gated
`thinkingLevel` is rejected by 2.5, and `minimal` by 3.8 Flash. Sending it only to `gemini-3*` / `gemini-4*` keeps rollback to 2.5 a pure configuration change. The default sends nothing, so each model uses its own default. The eval measures whether `low` buys enough latency to be worth setting in production.

### D5. Echo function calls exactly as returned
The app needs an id to pair each call with its result. When the model omits one, the synthetic id stays internal: `ToolCall` gains a flag recording that the id was synthesised, and the Gemini serializer omits `id` from both the `functionCall` and the `functionResponse` in that case. The Anthropic path is untouched, since it always receives ids.

### D6. Usage logging is the eval's ground truth
One `info` line per call, without content. The eval runner sums the lines from the server log, and the same line later shows real production spend, which `research.md` could only estimate.

## Eval (`tests/model-eval/`)

The real server runs with `AI_PROVIDER=gemini`, a fresh SQLite database and the ten-recipe seed book. Every seeded recipe carries an explicit difficulty and tags, so seeding triggers no background calls. `run-eval.cjs` drives `POST /api/chat` through ten scenarios and scores each by checking the database or the SSE events, never by judging prose:

| scenario | checks |
|---|---|
| display-by-name | `recipe_artifact` for the lasagne |
| display-german | German request opens the banana bread |
| timer-for-step | `timer_start` 90 min for step 4 of the lasagne |
| halve-current | curry updated to servings 2, coconut 200 ml, chicken 250 g, nothing dropped |
| image-to-recipe | handwritten card → one new recipe, 6-7 ingredients, 225 g flour, 220/200 °C, 12-15 min bake |
| text-to-recipe | flapjacks saved with 4 ingredients, 20 min, 180 °C, makes 12 |
| meal-plan | `meal_artifact` with valid ids, a main and a dessert, 6 guests |
| grounded-search | vegetarian recipes named without inventing meat dishes |
| guided-cooking-2-turns | first step mentions the oven, next mentions eggs, both concise |
| troubleshoot-french | replies in French and writes nothing |

The runner records latency, tool events, errors, server `ERROR` lines and summed usage per model.

### Results

Run on 2026-10-17 with the production prompt and tools, `uvx` fetch and search enabled as in the Docker image, and the ten-recipe seed book. Costs are list price × the logged `gemini usage` counts, with thoughts billed as output.

**Baseline unavailable.** On the key used for the eval, `gemini-2.5-pro` returns `404 NOT_FOUND: "This model models/gemini-2.5-pro is no longer available to new users. Please update your code to use models/gemini-3.1-pro-preview…"`. Production keeps working only because its key is grandfathered. This is a strong reason to move now rather than at Google's convenience.

**Round 1 was invalid for every model, and it found a bug.** Every model opened every first reply with "Our conversation was reset…", because the handler injected a lost-history notice into every new chat (fixed by task 5b.1). Two scenarios also asked for actions that the app's own prompt says need a confirmation turn: saving an image recipe, and showing a meal plan. The scenarios were corrected to send that confirmation. A `no_reset_notice` check now runs on every scenario.

**Basic set** (10 scenarios, 45 checks; rounds r2 and r3):

| model | checks r2 / r3 | median turn | worst turn | $ per round |
|---|---|---|---|---|
| `gemini-3.5-flash-lite` | 44 / 45 | 1.6 s | 5.0 s | 0.04 |
| `gemini-3.8-flash`, thinking low | 45 / 45 | 5.6–5.9 s | 23.5 s | 0.18 |
| `gemini-3.6-flash` | 44 / 45 | 6.0–6.6 s | 12.7 s | 0.20 |
| `gemini-3.8-flash` (default, medium) | 45 / 45 | 8.9 s | 24.5 s | 0.22 |
| `gemini-4-argon` (32k budget) | 45 / 45 | 11.6–13.6 s | 57 s | 0.29–0.36 |

**Hard set** (7 scenarios, 36 checks; rounds h1 and h2): German handwritten card, substitute and scale in one request, US cups, five-turn guided lasagne with the simmer timer, a vegetarian quick meal for 4, an ambiguous follow-up, and a recipe that doesn't exist.

| model | checks h1 / h2 | median turn | worst turn | $ per round |
|---|---|---|---|---|
| `gemini-3.5-flash-lite` | 36 / 36 | 1.0–1.2 s | 8.3 s | 0.04 |
| `gemini-3.8-flash`, thinking low | 36 / 35 | 3.4–5.8 s | 9.8 s | 0.17–0.20 |
| `gemini-3.6-flash` | 36 / 36 | 5.4–5.6 s | 17.4 s | 0.17–0.18 |
| `gemini-3.8-flash` (default) | 36 / 36 | 6.1–7.5 s | 15.2 s | 0.20–0.21 |
| `gemini-4-argon` | 35 / 35 | 9.6–13.5 s | **134.8 s** | 0.25–0.29 |

There were no 400s, no thought-signature errors and no `MAX_TOKENS` finishes in 334 calls. Every finish reason was `STOP`.

**Blind quality judgement.** The checks score outcomes, not prose. A separate judge read the anonymised transcripts of 13 prose-heavy scenarios: 5 dimensions, 325 points (`eval-judgement.md`).

| rank | model | total | defining failure |
|---|---|---|---|
| 1 | `gemini-3.8-flash` (default) | 297 | none serious; one cups conversion 25 g light; embellished a saved German card |
| 2 | `gemini-3.6-flash` | 291 | started the simmer timer early; oven field 200 vs 220 °C |
| 3 | `gemini-4-argon` | 290 | lost pacing in the guided lasagne (timer twice); English reply to German |
| 4 | `gemini-3.8-flash`, thinking low | 286 | missed 5 of 8 vegetarian recipes |
| 5 | `gemini-3.5-flash-lite` | 284 | saved photographed recipes without the preview, once twice (duplicate) |

**Decision (confirms D1 and D2).**
- **Chat: `gemini-3.8-flash` at its default thinking level.** It has the best quality and the only clean record. It also costs about half of 2.5 Pro per token through 2026, and adds about 6–9 s per turn.
- **`GEMINI_THINKING_LEVEL=low`** saves about 2–3 s but cost a grounding failure. Leave it unset.
- **Argon** is ruled out by latency: a 2-minute turn is unusable at the stove.
- **Flash-Lite** is ruled out for chat because it breaks the confirm-before-save flow.
- **Background jobs: `gemini-3.5-flash-lite`.** It is ideal for single-shot difficulty and tag calls, and the eval's created recipes received difficulty and tags from it without error.

**Prompt problems shared by every model** (filed in `.scratch/`, not model choices):
- One-off scaling or substitution ("make it for 6 with cream") permanently overwrites the family's master recipe without saying so.
- At "I'm at the stove, what first?" no model gives the first instruction before asking about servings.

**Spend for the whole evaluation**, five models across five rounds: about $4.60 at list price.

## Risks

- **3.8 Flash's intro price ends 2026-12-31** (to $1.50/$7.50). At the research's mid traffic estimate that is about $41 a month, roughly today's 2.5 Pro spend. 3.6 Flash costs the same and uses fewer tokens; the usage log will show which is cheaper in practice.
- **Implicit caching** could cut input cost further, but the hit rate is unknown (`research.md` §5). The usage log records `cached_tokens`, so this becomes measurable.
- **A 400 from a thought-signature mismatch** would surface as a chat error on the second tool step. Multi-step scenarios (halve-current, meal-plan) exercise exactly that path.
