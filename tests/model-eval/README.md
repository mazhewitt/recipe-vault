# Live model eval

Runs the real app against the live Gemini API and scores each candidate chat model
on ten cooking scenarios. Scoring checks the database or the SSE events the app
emits; it never judges prose. See
`openspec/changes/upgrade-gemini-models/design.md` for the rationale and results.

## What it measures

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

Per model it also records latency per scenario and the summed token usage from the
server's `gemini usage` log lines (prompt, output, thoughts, cached).

## Files

- `gemini-server.sh <port> <chat_model> [difficulty_model]` — starts the release
  binary with `AI_PROVIDER=gemini`, a fresh SQLite database and photo dir under
  `runs/<port>/`, then seeds it with `seed.cjs`.
- `seed.cjs <base_url>` — the ten-recipe eval book (explicit difficulty and tags,
  so seeding makes no background LLM calls).
- `run-eval.cjs <port> <label> [scenario_filter]` — drives `POST /api/chat` and
  writes `runs/results/<label>.json`.
- `run-all.sh <round>` — runs every candidate (list at the top of the file) in
  parallel, one port each.
- `recipe-card.png` — the handwritten card for image-to-recipe; `card.cjs`
  regenerates it (needs playwright installed in `tests/e2e`).

All run state (`runs/`) is git-ignored.

## How to run

```sh
cargo build --release              # the scripts run target/release/recipe-vault
export GEMINI_API_KEY=...          # export it from your secret store; never commit it
tests/model-eval/run-all.sh r1
```

One model on its own:

```sh
tests/model-eval/gemini-server.sh 3021 gemini-3.8-flash
node tests/model-eval/run-eval.cjs 3021 r1-flash38
```

The scripts never print the key.

**Never run it on port 3001.** That port belongs to the e2e suite;
`gemini-server.sh` refuses it.

## Cost

Roughly 170-190k prompt tokens per model per round (plus a small amount of output
and thinking). At current Flash prices that is under $1 per model per round; the
flagship and Pro models cost a few times more.
