# cook-from-the-page: verification

## 4.1 Revert-and-fail

Each line was reverted on its own, the named test run, and the file restored. After the pass, `git diff` was byte-identical to before (`cmp` of the two diffs). The e2e runs were on chromium and mobile-chrome, port 3002.

| Reverted | Red |
|----------|-----|
| `set_servings` range check (`tools.rs`, `1..=24`) | `mcp::tools::tests::test_set_servings_rejects_invalid` |
| `servings_set` extraction (`client.rs`) | `test_halve_over_mock_llm_yields_servings_data_and_no_recipe_ids` |
| `page_servings` context line (`handlers/chat.rs`) | `test_page_servings_reach_the_context_block`, `test_halve_over_mock_llm_yields_servings_data_and_no_recipe_ids` |
| mock "halve" branch (`llm.rs`) | `ai::llm::tests::test_mock_halve_sets_half_the_page_servings_rounded_up` |
| prompt's removed "ask servings first" (`prompts.rs`) | `ai::prompts::tests::system_prompt_no_longer_asks_servings_first_or_lists_scaled_ingredients` |
| g/ml rounding bands | servings › grams and millilitres…; quantities are scaled…; remembered… |
| halves round up | servings › grams and millilitres…; any other unit…; quantities are scaled… |
| "a little of" fallback | servings › a count that rounds to nothing reads "a little of"… |
| stored servings (`applyServings` reads `rv-place`) | servings › remembered for the session…; nothing is saved… |
| Clear ticks keeping the servings | place-keeping › clearing the ticks keeps the step mark and the servings… |
| `servings_set` recipe-id check | servings › another recipe is open: nothing changes |
| popover overlay positioning (`position: absolute`) | layout-stability › opening the "⋯" popover; recipe-display › the "⋯" popover holds the rest, overlaid… |
| share and add-photo out of the meta line | recipe-display › the meta line: the stepper and the total time…; step 1 sits within 180px… |
| difficulty slot's reserved width in the panel | recipe-display › the difficulty slot is reserved in the popover |
| outside-tap guard (`stopPropagation`/`preventDefault`) | recipe-display › the popover closes on a tap outside (which does nothing else)… |
| row padding (38px, `padding: 4px 0`) | recipe-display › every row is 38px (36px on the phone) from padding… |
| ticked opacity (0.65 → 0.4) | place-keeping › tapping an ingredient ticks it… |

Fixes from review, each red-checked the same way:
- Storing nothing once the stepper is back at S (`servings.js` `setServings`). With the fix reverted, servings › "stepping back to S stores no count…" fails with `expect(received).toBeNull()`, Received `8`.
- `Servings.redrawServings()` after Notes → Cook (`app.js`). With it removed, servings › "remembered across a spread mode switch…" fails: the parked panel comes back reading the old count.
- The `state.viewMode === 'recipe'` guard on `servings_set` (`chat.js`). With it removed, servings › "the contents is open: nothing changes…" fails on all three projects.

## 4.2 Gates (final run, HEAD 865995e)

- `grep -n "test.fail\|test.fixme" tests/e2e/tests/*.spec.ts`: one hit, added by this change (ce240a8): `recipe-display.spec.ts:476` "the first ingredient within 200px of the top on the phone". It stayed `fixme` pending the owner's decision on the phone target (see 4.3), and is a real test again since the merge. Nothing else.
- `cargo test`: 258 passed, 0 failed. `make lint`: clean. `openspec validate cook-from-the-page --strict`: valid (two INFO notes: the MODIFIED requirements come from steady-cooking-spread, so this change archives after it).
- Full e2e suite, port 3002 (killed before and after): 837 passed, 180 skipped, 0 failed (15.6m), chromium, mobile-chrome and ipad.

## 4.3 Re-measure (ports 3033 and 3034, a fresh server each, both stopped)

### header-block-before-method

The counter script runs every check whatever its filter argument, and it hung after `duration-chip-toggles-mark` (port 3031, killed). Its `header-block-before-method` line was also misleading after this change: share and add-photo are now inside the hidden "⋯" popover, so both read zero-sized and the script reported "same row". I therefore ran the check on its own (a copy, run from the scratchpad, never committed). It reads the step-1 and ingredient numbers the same way. It reports whether share and add-photo are in the popover, and it checks their row only with the popover open. It covers Lemon Drizzle Cake (the original) and the lasagne.

| Viewport | Before (Lemon) | After: Lemon | After: Lasagne | Target |
|----------|----------------|--------------|----------------|--------|
| tablet 810×1080: step 1 below the right page's top | 294px (meta line 101px, ~3 rows) | **178px** (meta 24px, 1 row) | **178px** | ≤180 met |
| tablet-landscape 1080×810 | 267px (74px, ~3 rows) | **165px** (24px, 1 row) | **165px** | ≤180 met |
| phone 390×844: step 1 below the page top | 328px | 177px | 177px | (none) |
| phone: first ingredient from the viewport top, Ingredients tab | 368px | **301px** | **301px** | ≤200 **NOT MET**; at the merge, with no heading on the phone: **254px**, against the restated ≤260, met |
| share / add-photo | meta line, same row | in the "⋯" popover; same row once it is open | same | |
| steps fully visible | tablet 5/10, landscape 4/10, phone 4/10 | 6/6 | tablet 7/10, landscape 5/10, phone 5/10 | |

The 1280×800 target is covered by e2e (recipe-display › step 1 sits within 180px of the page top (wide), chromium).

**The phone target cannot be met as designed.** The book chrome above the header is 162px. Add the one-line header (44px) and the meta line already sits at 206px, before the Ingredients tab's stepper line, the `ingredients:` heading and the reserved `.servings-note` slot. The e2e case stays `test.fixme` (recipe-display.spec.ts, "the first ingredient within 200px of the top on the phone") until the owner decides: relax the target in design.md P3 and the spec, or compress the chrome or the Ingredients tab's lead-in.

**Resolved at the merge into `cooking-ux-loop` (2026-10-18).** The owner chose to drop the repeated heading on the phone. The paper tab already names the panel, so the Ingredients and Method panels carry no section header there, and `placeMetaLine` moves "clear ticks" to the end of the meta line, back into the heading above 600px. The first ingredient is now at 254px. The target is restated to ≤260px, and the `test.fixme` is a real test again ("the first ingredient within 260px of the top on the phone"), with a second test for the heading and the "clear ticks" position. Red-checks:
- headings shown again: both tests red;
- "clear ticks" left in the hidden heading: the new test and three place-keeping tests red.

Both files were restored byte-identical. The other measured options were: also dropping the reserved servings-note line (234px), and also the hidden user chip's slot (198px). Those are left for later.

### ingredient-rows-tight-for-ticking (`cook/remeasure.cjs 3034 ingredient-rows-tight-for-ticking`)

| | Before | After | Target |
|-|--------|-------|--------|
| tablet | row 31px, pitch 30-34px, sweep hits neighbour 2/5 | row 39px, pitch 38-39px, **2/5** | ≤1/5 **NOT MET** (restated at the merge: ≤2/5, met) |
| phone | row 29px, pitch 28-32px, 2/5 | row 37px, pitch 36-37px, **2/5** | ≤1/5 **NOT MET** (restated at the merge: ≤2/5, met) |

**This target cannot be met by any row shorter than 44px.** The sweep samples five points 11px apart (centre ±11, ±22) and counts samples that land on another row. The spec also requires rows edge to edge with no gap. So with a 38px row, the ±22 samples (19px from centre to edge) always land on the rows above and below: 2/5. Getting to ≤1/5 takes rows of about 44px or more, which contradicts P4's 38px and puts the lasagne's 19-ingredient fit at 810×1080 at risk. This also needs the owner: drop or restate the sweep target, or change the row height.

**Resolved at the merge into `cooking-ux-loop`:** the owner chose ~38px rows (D3), so the target is restated to fit them: the centre and ±11px samples land on the aimed row, and only the ±22px samples may reach a neighbour (≤2/5). After the merge the rows are exactly 38px (36px on the phone), from `lighter-book`'s `--ingredient-row` padding plus a `min-height` that makes the rounded padding whole.

The counter script's "halve it" step (refresh-loses-place) now scales the page through `set_servings` instead of saving with `update_recipe`. It no longer exercises a refresh in place. The e2e refresh tests use "update it" for that.

## 4.4 Live model re-run (run by the lead, 2026-10-18, on the merge into `cooking-ux-loop`)

`tests/model-eval` scenarios `halve-current`, `hard-substitute-and-scale`, `guided-cooking-2-turns` and `hard-guided-5-turns` on `gemini-3.8-flash` (difficulty on `gemini-3.5-flash-lite`), two rounds, each on a fresh server and database (port 3021).

The four scenarios scored the old contract ("halve" passed by saving the recipe), so `run-eval.cjs` was brought to this change's criteria first:
- `current_recipe` carries the page's servings.
- `servings_set` events are collected.
- `halve-current` passes on `set_servings` 2 with the book unchanged.
- `hard-substitute-and-scale` passes on `set_servings` 6, the cream told, an offer to save and the book unchanged.
- Both guided scenarios check that an instruction comes before any question.
- The filter takes a comma-separated list.

| round | halve-current | hard-substitute-and-scale | guided-cooking-2-turns | hard-guided-5-turns | checks |
|-------|---------------|---------------------------|------------------------|---------------------|--------|
| 1 | 5/5 | 7/7 | 7/7 | 7/7 | 26/26 |
| 2 | 5/5 | 7/7 | 7/7 | 7/7 | 26/26 |

Against design.md's criteria:
- No `update_recipe` without a save request: no write in any scenario.
- `set_servings` for scaling: 2 for "halve" and 6 for "make it for 6", both rounds.
- The substitution reply offers to save, both rounds.
- The guided session's first reply has an instruction before any question, both scenarios, both rounds.

Spend: 28 calls, 253,989 prompt tokens, 1,141 output and 9,719 thinking tokens, about $0.23 at $0.75/$3.75 per 1M. That brings the owner's Gemini budget to about $4.83 of $20 spent.

| Scenario | Run 1 | Run 2 |
|----------|-------|-------|
| halve-current | | |
| hard-substitute-and-scale | | |
| guided-cooking-2-turns | | |
| hard-guided-5-turns | | |

Spend: (to log)

## 4.6 Hand-off: regions edited (line numbers on this branch, `start+count`)

- `static/recipe-display.js`: 10, 525+75 (the "⋯" popover), 722-760 (meta parts, share/photo icons), 771-825 (header, meta line, popover markup, servings note), 847-876.
- `static/place-keeping.js`: 43-75 (servings in the `rv-place` record).
- `static/chat.js`: 10, 64, 228+5 (`servings` in the current-recipe payload), 330+9 (`servings_set`).
- `static/styles.css`: 788-885 (header, "⋯", popover), 1084-1095 (ticked look), 1173-1270 (meta line, difficulty slot, stepper, scaled ink, note), 1308-1320 (thumbnail), 1665, 2407-2416 and 2705-2715 (rows), 2745+23 (phone header).
- `src/ai/prompts.rs`: 61+3, 114-116, 138-145, 246+43 (tests).
- `src/ai/llm.rs`: 220+15, 402+16, 487+16, 1488+77 (tests).
- `src/ai/client.rs`: 134+22, 518-522, 624-640, 670-704, 754-761, 799-843.
- `tests/e2e/tests/helpers.ts`: not edited.
- Also: `static/servings.js` (new), `static/app.js` (17, 379, 427, 457, 558, 570, 775, 806), `src/handlers/chat.rs`, `src/mcp/tools.rs`, `src/mcp/server.rs`.

Archive order: steady-cooking-spread, safe-page-navigation, glanceable-cooking, upgrade-gemini-models, then this change.
