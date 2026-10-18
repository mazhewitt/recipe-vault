## Why

The owner reviewed the open items from the 2026-10-17/18 work on 2026-10-18 and decided five of them (recorded in design.md as P1–P5). They share one idea: **the cook reads everything from the page**, and the page shows tonight's cooking without rewriting the family's book.

- **A cooking adjustment rewrites the family recipe.** In the model eval (`openspec/changes/upgrade-gemini-models`, scenarios `halve-current` and `hard-substitute-and-scale`), all five Gemini models answered "swap in double cream and make it for 6" by calling `update_recipe`. That permanently replaced the coconut milk and set servings to 6, for the whole family, with no history or undo and without saying so. "Halve it" was split between saving and only replying. Replying only is no better: the page keeps showing 500 g while the reply says 250 g (`.scratch/scaling-overwrites-family-recipe`).
- **The header takes a third of the screen.** Above "method:" the right page stacks the title, a floated polaroid and a meta line wrapped over 3–4 rows. Step 1 starts at 390px on tablet portrait (29% of the screen) and 391px on the phone (42%), where the header repeats on every tab. On the lasagne only 4–5 of 10 steps fit (`.scratch/cook-header-takes-a-third-of-the-screen`, item 1).
- **A fingertip tick hits the neighbour.** Ingredient rows are 31px (29px on the phone) with no gap. A 44px fingertip lands on the next row 2 times in 5, and a wrong tick is faded enough to miss (same issue, item 2).
- **"I'm at the stove, what first?" gets a question back.** Every model asked about servings before giving any instruction, because the cooking-guidance session-start rule tells it to.

## What Changes

- **A servings stepper scales the page.** "serves − N +" rescales the displayed ingredient quantities for this session. The saved recipe is unchanged.
- **The assistant scales the page, not the book.** A new page tool `set_servings` sets the stepper, following `start_timer`'s path with no database write. Substitutions are presented in the reply with an offer to save. `update_recipe` is used only when the cook asks to change the saved recipe.
- **A compact header.** The title, a photo thumbnail and a "⋯" button sit on one line, and "serves − N + · total time" on the next. Difficulty, tags, the prep/cook split, share and add-photo open from "⋯" as a popover. The header is the same in every spread mode.
- **Ingredient rows about 38px tall, with ticks that stay readable.**
- **The first step first.** At the start of a cooking session the assistant gives step 1 straight away, with a one-line aside naming the servings the page shows.

## Non-goals

- Scaling quantities written inside the method text ("add 200 ml stock"). They are free text. When the page is scaled, a one-line note says the method's amounts are for the recipe's own servings.
- Recipe versions or undo for saved edits (option B of the scaling issue, not chosen).
- Anything in `steady-cooking-spread`, `safe-page-navigation` or `glanceable-cooking` beyond what P3 changes in the header.

## Capabilities

### Modified Capabilities
- `cooking-guidance`: recipe scaling becomes page scaling via `set_servings`; edits are saved only on request; the session start gives the first step first.
- `family-recipe-ui`: the compact header and its "⋯" popover; the servings stepper; ingredient row height and the ticked look; the hit-area and "nothing moves" scenarios that name header elements.
- `mcp-interface` / `web-chat`: the new `set_servings` page tool and its SSE event.

## Impact

- Backend: `src/mcp/tools.rs` and `src/mcp/server.rs` (the tool), `src/ai/client.rs` and `src/handlers/chat.rs` (the event, as for `start_timer`), `src/ai/prompts.rs` (the rules), `src/ai/llm.rs` mock (a "halve" note calls `set_servings`; "update"/"save" still calls `update_recipe`).
- Frontend: `static/recipe-display.js` (header, stepper, scaled quantities), `place-keeping.js` (servings kept with the ticks), `chat.js` (the event), `styles.css`.
- Tests: Rust unit/integration tests for the tool, e2e for the stepper, header, rows and the event, and a short live re-run of the affected model-eval scenarios on `gemini-3.8-flash` (under $1 of the owner's Gemini budget).

Built on branch `cook-from-the-page` from `cooking-ux-loop` once `glanceable-cooking` and `gemini-model-upgrade` are merged into it. It is released with them in one release after the owner's UI trial (owner decision 2026-10-18). Archive order: steady-cooking-spread, safe-page-navigation, glanceable-cooking, upgrade-gemini-models, then this change.
