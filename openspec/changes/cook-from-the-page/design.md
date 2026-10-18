## Context

The owner made five decisions on 2026-10-18 (decisions 1–5 of the morning review). They are binding, and P1–P5 below are those decisions with the detail an implementer needs. The current behaviour is `steady-cooking-spread`, `safe-page-navigation` and `glanceable-cooking` (all implemented on `cooking-ux-loop`, none archived), plus `upgrade-gemini-models` (merged in, chat on `gemini-3.8-flash`). Every guarantee of those changes holds:
- nothing moves unless the cook acted on it (`layout-stability.spec.ts`);
- the slip's one home;
- 44px hit areas;
- the right page is the same in every spread mode (steady D2);
- the URL state;
- the reply sticky's clearance.

Evidence:
- `.scratch/scaling-overwrites-family-recipe/README.md` and `openspec/changes/upgrade-gemini-models/eval-judgement.md` (scaling, first step);
- `.scratch/cook-header-takes-a-third-of-the-screen/README.md` and `tests/usability/runs/audit-post-steady/counter` (header);
- `tests/usability/runs/audit-post-steady/cook` (rows).

The usability runs are in the audit worktree `/Users/mazhewitt/projects/recipe-vault-audit` and are gitignored; copy them in.

## Decisions (owner, 2026-10-18)

### P1. A servings stepper scales the page (decision 1, option C)

- The header's second line starts with `serves − N +`:
  - `button.servings-step[data-step="-1"]` and `[data-step="+1"]`, each with a 44px hit area;
  - `output.servings-count`, carrying `aria-live="polite"`.
- N starts at the recipe's `servings`. Its range is 1 to 4× the recipe's servings, capped at 24. The − button is disabled at 1, and + is disabled at the cap.
- A recipe without `servings` shows no stepper.
- The page shows each ingredient quantity × N / servings. A quantity of none ("salt and pepper", "a pinch") is unchanged. Rounding is for reading, not for chemistry:
  - grams and millilitres: whole numbers below 50, the nearest 5 from 50 to 500, the nearest 10 above 500;
  - kg and l: one decimal place;
  - cups, tbsp and tsp: the nearest ¼, shown as a fraction (½, 1¼);
  - unitless counts (eggs, onions): the nearest ½, shown as a fraction;
  - anything else: up to two significant decimals.
- While N differs from the recipe's servings:
  - each scaled quantity carries `data-scaled` and is drawn in the blue handwritten-note ink;
  - a one-line note under the ingredient heading reads "Scaled for N · amounts in the method are for <servings>". It goes in a slot reserved whether or not it shows, so showing it moves nothing.
- Changing N changes only the quantity text. It moves nothing else, except where a longer number wraps a line, which is the cook's own action.
- N is remembered for the session per recipe, in the same `rv-place:<id>` record as the ticks (sessionStorage). It survives a mode switch, a page turn and back, a refresh in place and a reload. Ticks are kept when N changes.
- Phone: the stepper is the first row of the Ingredients tab (see P3).
- Nothing is saved. The stepper never calls the server.

### P2. The assistant scales the page, not the book (decision 1, option C + A)

- New page tool `set_servings { servings: integer }`, plumbed exactly like `start_timer`:
  - `src/mcp/tools.rs` defines it, and `src/mcp/server.rs` handles it;
  - `src/ai/client.rs` turns the call into an SSE event `servings_set { servings, recipe_id }`, sent through `src/handlers/chat.rs`;
  - `static/chat.js` sets the stepper of the open recipe with that id, and ignores the event if another recipe is open.
  - There is no database write.
- `src/ai/prompts.rs` gets these rules:
  - "make it for 6", "halve it", "just two of us" → `set_servings`. The reply says the page now shows N servings and the saved recipe is unchanged.
  - A substitution or other one-off change for tonight → present the adjusted ingredient(s) and method in the reply, flag notable effects (a 1:1 cream for coconut milk swap makes it much richer), and end with "Want me to save this as a change to the recipe?". Call `update_recipe` only after the cook says yes, or when they explicitly ask to change or save the recipe ("change the recipe to…", "save it with cream", "update the servings in the book").
  - The existing "Recipe scaling" guidance that tells it to present a scaled list is replaced.
- Mock LLM (`src/ai/llm.rs`, `MOCK_LLM=true`):
  - a note containing "halve" calls `set_servings` with half the open recipe's servings, rounded up, at least 1;
  - a note containing "update" or "save" keeps calling `update_recipe` (servings 2), so the refresh-in-place e2e tests keep their trigger. Rewrite those tests' notes from "halve it" to "update it" where they rely on the save.

### P3. A compact header, the same in every mode (decision 2, option 1)

- Wide (tablet and desktop), right page:
  - **line 1:** the title, at its current size; a photo thumbnail about 44×44 (the polaroid, small and still tilted, which still opens the full-window preview); a "⋯" button (`button.recipe-more`, 44px hit area, `aria-expanded`, `aria-haspopup="dialog"`). The title wraps by words. A long title may take two lines, and nothing else moves for it.
  - **line 2:** `serves − N +` (P1) · total time.
  - **then** `method:`.
- "⋯" opens a popover (`.recipe-more-panel`, `role="dialog"`) anchored under it and overlaid on the page, so opening it moves nothing.
  - It holds the difficulty dots, the tag chips, the prep/cook split, share and add-photo, all as they are today, with their 44px hit areas.
  - It closes on a tap outside, on Escape, on a page turn or mode change, and after share or add-photo starts its flow.
  - The late-arriving difficulty (steady D5's reserved slot) now lands inside the popover, so it can never move the page.
- The header is identical in contents, cook and notes mode (steady D2).
- Phone:
  - the header above the tabs is one line: the title (one line, ellipsised), the thumbnail and "⋯";
  - the stepper line is the first row of the Ingredients tab;
  - total time goes in the popover.
- **Targets:**
  - the top of step 1 is at most 180px below the right page's top at 810×1080, 1080×810 and 1280×800 for Lemon Drizzle Cake and the lasagne;
  - on the phone the first ingredient row is at most 200px from the top of the viewport.
  - Record the before and after with `tests/usability/runs/audit-post-steady/counter/remeasure.cjs header-block-before-method`.
- This replaces steady-cooking-spread D9's "Share and photo end the meta line" and the meta-line layout. Every e2e test that finds share, add-photo, difficulty or tags on the meta line now opens "⋯" first. Don't delete them; rewrite them.

### P4. Ingredient rows about 38px, ticks that stay readable (decision 3, option 3)

- `.ingredient-item` gets `min-height: 38px` (36px on the phone) from vertical padding, not margin, so the whole row stays the tap target. The text is vertically centred and the hit area reaches row edge to row edge.
- Ticked: a strike-through, a small check mark in the gutter (no change to the row's box), and text opacity no lower than 0.6, so a wrong tick is easy to see at arm's length. A second tap unticks it, as today.
- **Targets:**
  - a 44px vertical sweep lands on the neighbour at most 1 time in 5 (`cook/remeasure.cjs ingredient-rows-tight-for-ticking`);
  - the lasagne's 19 ingredients still fit the left page at 810×1080 without scrolling.

### P5. The first step first (decision 5, option 1)

- `src/ai/prompts.rs`'s cooking-session start no longer asks for servings first.
  - When the cook starts cooking ("let's cook", "I'm at the stove, what first?"), the reply opens with step 1's instruction.
  - It ends with one line naming the servings the page shows, for example "(Going by 8 servings, as the page shows; change it at the top if you're cooking for fewer.)".
  - If the cook gives a number at any point, it calls `set_servings`.
- The current servings reach the model with the current-recipe context the chat already sends. Add the page's displayed servings (the stepper's N) to it, so the aside is right after a scale.

## Verification

- **Rust:** the tool's definition, the handler's event, and the mock's "halve" path.
- **e2e:** P1–P4 scenarios, plus the layout-stability anchors for the new header and stepper. No anchor moves when the stepper changes, except a wrapped quantity line.
- **Live (run by the lead, not an implementer, because it needs the owner's Gemini key):** re-run `tests/model-eval` scenarios `halve-current`, `hard-substitute-and-scale` and `guided-cooking-2-turns` and `hard-guided-5-turns` on `gemini-3.8-flash`, twice each. Pass criteria:
  - no `update_recipe` without an explicit save request;
  - `set_servings` is called for scaling;
  - the substitution reply offers to save;
  - the guided session's first reply contains an instruction before any question.

  Budget: under $1 (about $15 of the owner's $20 remains); log the spend in the change's verification notes.
- **Browser re-check:** re-run the counter and cook `remeasure.cjs` for the header and rows numbers.

## Risks

- **Fractions and rounding** can surprise ("1½ eggs"). The rounding table is deliberate. If a scaled count rounds to 0, show the unscaled amount with "a little".
- **Popover discoverability:** share and add-photo are one tap further away. The "⋯" sits next to the title on every viewport.
- **Prompt drift:** models might still call `update_recipe` for "halve it". The live re-run is the check. If it fails, tighten the rule wording before shipping, not after.
