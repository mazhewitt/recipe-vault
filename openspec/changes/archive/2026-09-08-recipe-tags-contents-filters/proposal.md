## Why

The Journal 2.0 contents page (`planned-ideas/ui-v2-journal/README.md`) has coloured edge tabs on the left page: All, Mains, Sweets, Meals. They are filters on the contents, and the README leaves the underlying question open: "a category (Mains / Sweets / …) does not exist on recipes today". The decision taken on 2026-09-05 is a free-form, many-to-many **tags** table with an AI backfill for existing recipes and auto-tagging on create, mirroring how difficulty was introduced. The Mains and Sweets tabs map to the fixed tag names `main` and `dessert`; other tags (cuisine, diet, other courses) are free for the family and the AI to use.

This is build step 5 of 5 and the only step that touches the database.

## What Changes

- **Tags storage**: new `tags` and `recipe_tags` tables (many-to-many). Tags are a global, case-insensitive vocabulary; family scoping comes from the recipe. Tag names are normalised (trim, lowercase, collapsed whitespace, `[a-z0-9 -]`, 1–30 chars, max 10 per recipe).
- **API**: recipes carry a `tags: string[]` field in list and detail responses; `POST /api/recipes` accepts `tags`; `PUT /api/recipes/:id` accepts `tags` with replace semantics; invalid tags return 400.
- **MCP**: `create_recipe` and `update_recipe` gain a `tags` array parameter whose description names `main` and `dessert`; `list_recipes` output includes tags.
- **AI auto-tagging**: a recipe created without tags is tagged in the background by a new `tag_assessment` module (1–5 lowercase tags, exactly one course tag from a fixed list, optional cuisine and diet tags). The mock LLM returns `["main","curry"]`.
- **Backfill**: a one-time, flag-gated, idempotent startup task tags every recipe that has no tags, on a new `backfill_flags` table (the old `system_flags` table was dropped in `migrations/20260210130000_drop_system_flags.sql`).
- **Chat prompt**: a "## Tags" section describing the vocabulary and when to set tags.
- **Contents edge tabs**: All / Mains / Sweets (+ Meals, gated) on the outer edge of the left page filter the contents by tag; the A–Z strip and footer reflect the filter; an empty-filter message; the filter persists in `sessionStorage`. On the phone the tabs render as chips under the title. The Meals tab is specified but hidden unless `body[data-feature-meals]` is set, because it depends on meal-plan persistence (RV-107 in `planned-ideas/meal-planning-epic.md`).
- Optional tag chips on the recipe meta line.

## Capabilities

### New Capabilities

- `recipe-tags`: free-form many-to-many recipe tags — storage, normalisation, REST API, MCP parameters, AI auto-assignment on create, and the fixed course vocabulary (`main`, `dessert`, …) that the contents tabs rely on
- `tags-backfill`: one-time startup task that AI-tags existing untagged recipes, tracked in a new `backfill_flags` table

### Modified Capabilities

- `recipe-domain`: `Recipe` gains `tags`; list/get include tags; update supports replacing tags
- `mcp-interface`: `create_recipe` / `update_recipe` accept `tags`; `list_recipes` returns tags
- `recipe-book-index`: contents edge tabs filter recipes; Meals tab gated; footer counts reflect the filter
- `web-chat`: the unified system prompt describes the tag vocabulary and tag-setting tool usage

## Impact

- `migrations/20260906120000_add_tags.sql`, `migrations/20260906120100_add_backfill_flags.sql` — new files only; applied migrations are never edited
- `src/models/recipe.rs` — `tags` on `Recipe`, `CreateRecipeInput`, `UpdateRecipeInput`; `normalize_tag` / `normalize_tags`
- `src/db/queries.rs` — `set_recipe_tags`, `load_tags_for`; `list_recipes` / `get_recipe` populate tags
- `src/ai/tag_assessment.rs` (new), `src/ai/mod.rs`, `src/ai/llm.rs` (mock branch), `src/ai/prompts.rs`
- `src/backfill/mod.rs`, `src/backfill/tags_backfill.rs` (new), `src/lib.rs`, `src/main.rs` (spawn after migrations)
- `src/handlers/recipes.rs` — auto-tag spawn in the create handler
- `src/mcp/tools.rs`, `src/mcp/http_client.rs` — `tags` passthrough
- `static/recipe-display.js`, `static/app.js`, `static/navigation.js`, `static/chat.html`, `static/styles.css` — edge tabs, filter, persistence, chips
- `tests/tags_test.rs` (new), `tests/e2e/tests/contents-filters.spec.ts` (new), `tests/e2e/tests/helpers.ts`
- `difficulty-backfill` spec is left untouched; it describes a completed, historical migration (see design.md)
