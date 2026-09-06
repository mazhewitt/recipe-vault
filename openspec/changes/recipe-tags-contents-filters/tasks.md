## 1. Migrations (new files only; never edit applied migrations)

- [ ] 1.1 `migrations/20260906120000_add_tags.sql`: `tags` table with unique index on `LOWER(name)`; `recipe_tags` join table with cascades, composite primary key and an index on `tag_id`
- [ ] 1.2 `migrations/20260906120100_add_backfill_flags.sql`: `backfill_flags(key PRIMARY KEY, value, updated_at)` seeded with `tags_backfill_completed = 'false'`
- [ ] 1.3 Run migrations locally and against a copy of the production database (`ROLLBACK.md`); confirm the cascade on recipe delete and that sqlx checksums are unchanged for existing files

## 2. Model and normalisation (`src/models/recipe.rs`)

- [ ] 2.1 Add `tags: Vec<String>` to `Recipe` (`#[sqlx(skip)]`, `#[serde(default)]`, always serialised), `tags: Vec<String>` to `CreateRecipeInput` (`#[serde(default)]`), `tags: Option<Vec<String>>` to `UpdateRecipeInput`
- [ ] 2.2 Implement `normalize_tag` and `normalize_tags` (trim, lowercase, collapse whitespace, `[a-z0-9 -]{1,30}`, dedupe, max 10) and wire them into `CreateRecipeInput::validate` / update validation
- [ ] 2.3 Unit tests for normalisation: casing, whitespace, invalid characters, length bounds, dedupe, over-limit
- [ ] 2.4 Update every struct-literal construction of `CreateRecipeInput` / `UpdateRecipeInput` in `tests/` and `src/` for the new field

## 3. Queries (`src/db/queries.rs`)

- [ ] 3.1 `set_recipe_tags(tx, recipe_id, &[String])`: insert-or-ignore tag rows, relink (delete removed, insert missing)
- [ ] 3.2 `load_tags_for(pool, &[String]) -> HashMap<String, Vec<String>>` with a single JOIN, tags sorted alphabetically
- [ ] 3.3 `create_recipe` writes tags in its transaction; `update_recipe` replaces tags when `tags` is `Some` and bumps `updated_at` / `updated_by`; `list_recipes`, `get_recipe`, `get_recipe_by_share_token` populate `tags`
- [ ] 3.4 `delete_recipe` test confirms `recipe_tags` rows are gone

## 4. AI tag assessment

- [ ] 4.1 `src/ai/tag_assessment.rs`: `assess_recipe_tags`, `format_tag_prompt` (course list `main | side | dessert | breakfast | snack | drink | sauce | bread`, optional cuisine and diet tags, JSON array only), `parse_tag_response` (strip code fences / leading prose, normalise, dedupe, cap 5, require a course tag); export from `src/ai/mod.rs`
- [ ] 4.2 Unit tests: clean array, fenced array, prose-wrapped array, mixed case, missing course tag, empty array
- [ ] 4.3 `src/ai/llm.rs` `complete_mock`: return `["main","curry"]` for the tag-assessment system prompt
- [ ] 4.4 `src/handlers/recipes.rs`: extract the provider construction from `auto_assign_difficulty` into a shared helper; add `auto_assign_tags` and spawn it from the create handler when `input.tags` is empty

## 5. Backfill

- [ ] 5.1 `src/backfill/mod.rs` + `src/backfill/tags_backfill.rs`: `check_backfill_status`, `run_tags_backfill` (untagged recipes via `NOT EXISTS`, sequential, 100 ms delay, progress every 10, continue on failure, flag set only on full completion, left `'false'` when all attempts failed); export from `src/lib.rs`
- [ ] 5.2 `src/main.rs`: spawn the backfill after successful `sqlx::migrate!()`; skip with an info log when the table or flag row is missing
- [ ] 5.3 Integration test: flag false + untagged recipes with mock LLM → all tagged and flag `'true'`; flag true → nothing processed; recipes already tagged are skipped

## 6. MCP and prompt

- [ ] 6.1 `src/mcp/tools.rs`: `tags` array parameter on `create_recipe_tool` and `update_recipe_tool` with a description naming `main` and `dessert`; handlers pass it through; `handle_list_recipes` includes `tags`; unit tests for the schemas
- [ ] 6.2 `src/mcp/http_client.rs`: `tags` flows through `create_recipe` / `update_recipe` unchanged (serde); tag validation errors map to `-32602`
- [ ] 6.3 `src/ai/prompts.rs`: add a `## Tags` section (vocabulary, lowercase, replace semantics on `update_recipe`, examples for "tag this as dessert" / "mark it vegetarian")
- [ ] 6.4 `tests/mcp_integration_test.rs`: create with tags, update replacing tags, list shows tags

## 7. REST integration tests (`tests/tags_test.rs`)

- [ ] 7.1 Create with explicit tags → stored normalised and returned sorted; create without tags (mock LLM) → `["curry","main"]` after the background task
- [ ] 7.2 List includes `tags` for every recipe (empty array when none)
- [ ] 7.3 Update with `tags` replaces the set; update without `tags` leaves them; update with `[]` clears them; `updated_by` bumped
- [ ] 7.4 Case/whitespace dedupe (`"Main"`, `" main "` → one `main`); invalid character and >10 tags → 400 with no changes
- [ ] 7.5 Delete recipe removes its `recipe_tags` rows; family isolation unchanged (tags visible only through visible recipes)

## 8. Frontend

- [ ] 8.1 `static/chat.html`: `.edge-tabs` nav inside `#page-left` as a sibling of `#page-left-content`, Meals tab `hidden`
- [ ] 8.2 `static/styles.css`: rotated edge tabs on the outer edge of the left page with the four colours (Mains uses dark text), active state, `body[data-feature-meals]` rule, `.index-empty`, `.recipe-tag` chips; `@media (max-width: 600px)` chip row under the title with 44px targets
- [ ] 8.3 `static/recipe-display.js`: `renderIndex(recipes, { currentRecipeId, singleColumn, filter })` filters by tag, derives the A–Z strip / groups / footer wording from the filtered list, keeps page numbers from the full list, renders the empty-filter message; meta line renders up to 3 `.recipe-tag` chips
- [ ] 8.4 `static/app.js` / `static/navigation.js`: `contentsFilter` in shared state, read from `sessionStorage['rv-contents-filter']` on load (fallback `all`), written on tab click; tab click re-renders the contents with the current filter and updates `is-active` / `aria-pressed`; Meals tab un-hidden only when `body.dataset.featureMeals` is set; next/previous still traverse the full list
- [ ] 8.5 `design-system.md`: edge tab colours and the contrast rule for the tan tab

## 9. E2E tests

- [ ] 9.1 `tests/e2e/tests/helpers.ts`: `createRecipe` accepts `tags`
- [ ] 9.2 `tests/e2e/tests/contents-filters.spec.ts`: tabs render (Meals hidden); Mains shows only `main`-tagged recipes and footer "N mains"; Sweets likewise; A–Z strip disables letters absent from the filtered list; empty filter message; filter survives a reload but not a fresh context; page numbers unchanged across tabs; next arrow from a filtered contents opens the first recipe of the full list; phone chip row; `body[data-feature-meals]` set via `page.evaluate` reveals the Meals tab
- [ ] 9.3 Existing specs: `index.spec.ts` seeds now carry tags from the mock; adjust footer assertions if needed; `make lint`

## 10. Verification and deployment

- [ ] 10.1 `cargo test`, `make lint`, `make test-e2e` green; `openspec validate recipe-tags-contents-filters`
- [ ] 10.2 Verify no secrets staged (`git diff --cached`); tag release; watch logs for "Tags backfill completed"; purge Cloudflare cache
