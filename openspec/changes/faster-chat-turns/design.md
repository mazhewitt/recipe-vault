## Context

The chat is an agent loop over non-streaming `generateContent` (`upgrade-gemini-models` design). A turn's latency is the sum of its model calls, each of which thinks before it answers. The owner chose both levers on 2026-10-18: fewer calls (send the open recipe) and less thinking (`low`). Measurements are in the proposal.

## Decisions

### F1. The server reads the recipe; the page only names it
The page already has the recipe, but the request keeps sending only `recipe_id`, `title` and `servings`. The handler reads the recipe with `queries::get_recipe` and the requesting user's `family_members`, the same scoping as `GET /api/recipes/:id` and the MCP `get_recipe`.
- The text is the saved recipe, even straight after an `update_recipe` or a refresh.
- A request naming another family's recipe gets nothing of it: the block falls back to today's (id, title, servings and "call `get_recipe`"), and `get_recipe` would refuse it too.
- The request body is unchanged, so an old page works against a new server and vice versa.

### F2. Compact text, field names as `update_recipe` takes them
`get_recipe` returns pretty-printed JSON with every row id and timestamp: about 4,000 prompt tokens for the lasagne. The block is lines of text, about 600:

```
title: Granny's Beef Lasagne
description: …
servings: 6
prep_time_minutes: 40
cook_time_minutes: 150
difficulty: 3
tags: family-favourite, main, pasta
ingredients:
- 2 tbsp olive oil
- 1 onion (finely chopped)
steps:
1. Heat the oil … [duration_minutes: 10]
7. Heat the oven. [temperature: 180 Celsius]
```

Every field a cook asks about or an `update_recipe` call must carry is there, under its tool name, so "change it to pancetta and save it" needs no lookup either. Quantities print as stored (`0.5`, `2`).

### F3. In every turn's block, kept in the history
The block is part of the user message, as today, and the session keeps it. A ten-turn conversation repeats the recipe ten times: about 33,000 extra prompt tokens over the whole conversation, about $0.03 at list price, and cached as a stable prefix. Keeping only the latest copy would need the history and what the model saw to differ; not worth it.

### F4. The instruction follows the block
With the text: "answer from it; call `get_recipe` only for another recipe". Without it (no recipe, not readable, a database error): today's "call `get_recipe` if you need full details". A database error is logged at `warn` and never fails the turn.

### F5. Thinking `low`, for chat only, set in production at the release
`GEMINI_THINKING_LEVEL` stays an optional setting (`upgrade-gemini-models` D4), now passed to the chat provider only. Flash-Lite thinks minimally by default, and `low` would raise it for the difficulty and tag calls. Production sets `GEMINI_THINKING_LEVEL=low` with the model names at the release, and unsetting it is the rollback. The code default stays "the model's own", so a rollback of `AI_MODEL` alone cannot inherit a level the old model rejects.

### F6. What could go wrong, and the check
- **Quality at `low`.** In October `low` missed 5 of 8 vegetarian recipes in `grounded-search` (a `list_recipes` grounding task, untouched by F1). The eval reruns both sets at `low` with this change, with a check that can see the miss, and the result goes to the owner with the latency numbers; the check is never loosened to pass. (It failed again; see Results for the prompt fix.)
- **The model still calls `get_recipe`.** Harmless but slow; the eval logs tool calls per turn, and the timing table is rerun.
- **Prompt injection through recipe text.** The text is the family's own, already returned to the model by `get_recipe`; nothing new is exposed.

### Results (2026-10-18)

**Speed.** The same four messages through `/api/chat` on the real implementation at `low`: median 2.2 s, mean 2.6 s, worst 4.4 s (default thinking without the recipe: 4.6 / 5.8 / 10.9 s). No turn called `get_recipe`.

**Quality, round f1** (all 17 scenarios at `low`, fresh book): 84 / 85. The eval's `grounded-search` check was tightened first: it only asked for Shakshuka and Risotto, so it could not see October's miss; `names_every_vegetarian` now wants every meat-free recipe in the book. Two rounds more of the vegetarian scenarios showed it:
- **The vegetarian list** passed in f1 and failed in f1b and f1c: the model named only the two recipes *tagged* vegetarian and left out the six meat-free bakes (October's `low` failure, in a scenario with no open recipe, so from the thinking level, not F1).
- **The German card** (`replied_german`) failed once: the reply was German but ended with the prompt's English question pasted verbatim, then a German translation.

**Three prompt fixes**, each a gap in the prompt that `low` exposed rather than a tuning of the check:
- **Diet questions:** tags are often missing, so judge each recipe by what it is (a cake, bread, pancake or flapjack with no meat or fish is vegetarian). `recipe-tags`: ADDED "Diet questions are answered from what each recipe is".
- **The confirmation question** is asked in the user's language; the English sentence is now an example. `recipe-image-extraction`: MODIFIED "Extraction Response Format".
- **The tags rule** said the current recipe context carries "only the id and title, not the tags", now false; it would send the model to `get_recipe` before a tag change.

**Rounds g1–g3** (fresh book each, the image and text scenarios first so the book holds all eight vegetarian recipes; g1 adds both meal-plan scenarios): 37 / 37, 25 / 25, 25 / 25. All eight vegetarian recipes named every time; the German card wholly German every time.

**Spend:** about $1.10 for the timing runs and both eval passes; about $6 of the owner's $20 in all.

## Risks

- A recipe edited in another tab between the page's render and the message: the block carries the saved version, which is the one the model should use.
- Long recipes (a 40-step bake): about 2,000 tokens a turn, still under half a `get_recipe` call.
