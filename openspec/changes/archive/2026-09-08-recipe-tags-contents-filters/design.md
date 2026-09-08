## Context

`planned-ideas/ui-v2-journal/README.md` is the design handoff for UI 2.0. This change is step 5 of the build order there (edge-tab filters, "which depend on the category decision"). It is written against the result of the four preceding changes: `journal-typography-contents` (change 1) introduced the contents page and `renderIndex(recipes, opts)` with `{ currentRecipeId }`; `journal-timer-cover-pill` (2) and `journal-margin-notes` (3) do not touch the contents page; `journal-book-only-layout` (4) keeps the contents page on the left page while a recipe is open (`renderIndex(list, { currentRecipeId, singleColumn: true })`). The deltas here extend `renderIndex` with a `filter` option and add the tab markup around it; they assume changes 1–4 have landed.

The category decision (2026-09-05): free-form, many-to-many tags rather than an enum column. The Mains and Sweets tabs are filters on two fixed tag names, `main` and `dessert`. This keeps the data model open (cuisine, diet, "kids", "christmas") without a schema change per category, and lets the AI populate it the same way it populated difficulty.

Relevant current code:
- `Recipe` (`src/models/recipe.rs`) has no tags or category. `CreateRecipeInput` / `UpdateRecipeInput` follow a `#[serde(default)]` pattern.
- `list_recipes` / `get_recipe` in `src/db/queries.rs` use `SELECT * FROM recipes` with `query_as`, so a `#[sqlx(skip)]` field is needed for tags.
- Difficulty auto-assignment lives in `src/handlers/recipes.rs` (`auto_assign_difficulty`, spawned from the create handler) and builds an `LlmProvider` from `config.difficulty_provider` / `config.difficulty_model`. `src/ai/difficulty_assessment.rs` is the prompt-and-parse module.
- The difficulty backfill code and the `system_flags` table are gone: `migrations/20260210130000_drop_system_flags.sql` dropped the table after the backfill completed, and there is no `src/backfill/` directory today. `openspec/specs/difficulty-backfill/spec.md` therefore describes a completed, historical migration; it is left untouched and this change introduces its own `backfill_flags` table and `src/backfill/` module.
- MCP tools in `src/mcp/tools.rs` build JSON schemas by hand; `handle_list_recipes` formats a reduced recipe object; `src/mcp/http_client.rs` passes `CreateRecipeInput` / `UpdateRecipeInput` through to the REST API.
- The mock LLM (`complete_mock` in `src/ai/llm.rs`) branches on message text; e2e tests run with `MOCK_LLM=true`.
- Meal plans are ephemeral (no table, no endpoint); RV-107 in `planned-ideas/meal-planning-epic.md` is the persistence story the Meals tab depends on.

## Goals / Non-Goals

**Goals**
- Tags on recipes end to end: schema, model, REST, MCP, chat prompt.
- Every recipe gets tags without anyone typing them: auto-tag on create, one-time backfill for the existing collection.
- Contents edge tabs All / Mains / Sweets that filter the contents page, remember the choice for the session, and degrade to chips on the phone.
- The Meals tab is specified now so the tab strip's markup and colours are settled, but it stays hidden until meal plans persist.

**Non-Goals**
- A tag editor UI. Tags are set through the API, MCP tools and the chat ("tag this as dessert"); a tag chip on the meta line is display-only.
- Tag search or tag pages. Search stays a chat action per the README.
- Per-family tag vocabularies. Tags are global names; visibility is still governed by the recipe's family.
- Meal-plan persistence or a Meals listing (RV-107).
- Re-tagging existing recipes on update. Only creation triggers auto-tagging.

## Decisions

### Schema: two tables, global vocabulary
`migrations/20260906120000_add_tags.sql`:
```sql
CREATE TABLE tags (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_tags_name_lower ON tags (LOWER(name));

CREATE TABLE recipe_tags (
    recipe_id  TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    tag_id     TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (recipe_id, tag_id)
);
CREATE INDEX idx_recipe_tags_tag_id ON recipe_tags (tag_id);
```
Tags are not family-scoped: a family only ever sees tags through recipes it can see, and sharing the vocabulary means `main` is `main` for everyone, which the edge tabs rely on. Deleting a recipe cascades its links; orphaned `tags` rows are harmless and left in place.

`migrations/20260906120100_add_backfill_flags.sql`:
```sql
CREATE TABLE backfill_flags (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO backfill_flags (key, value) VALUES ('tags_backfill_completed', 'false');
```
A generic table so later backfills reuse it. Both files are new; no applied migration is edited (CLAUDE.md). Filenames follow `YYYYMMDDHHMMSS_description.sql`.

### Model and normalisation
`Recipe.tags: Vec<String>` with `#[sqlx(skip)]` and `#[serde(default)]`, always serialised (an empty array, never omitted) so the frontend can rely on it. `CreateRecipeInput.tags: Vec<String>` (`#[serde(default)]`), `UpdateRecipeInput.tags: Option<Vec<String>>` — `None` leaves tags alone, `Some(vec![])` clears them (replace semantics, like ingredients and steps).

`normalize_tag(&str) -> Option<String>`: trim, lowercase, collapse internal whitespace to one space, then accept only if 1–30 chars of `[a-z0-9 -]`. `normalize_tags(&[String]) -> Result<Vec<String>, String>`: normalise each, reject the request with a message naming the offending tag if any fails, dedupe preserving first occurrence, reject if more than 10 remain. Validation happens in the handler before any write so a bad tag returns 400 and nothing changes.

### Queries
- `set_recipe_tags(tx, recipe_id, &[String])`: for each name `INSERT OR IGNORE INTO tags`, look up the id by `LOWER(name)`, then delete links not in the set and insert missing ones. Called inside the create and update transactions; the update path bumps `updated_at` / `updated_by` whenever `tags` is `Some`, even if the resulting set is unchanged (consistent with how ingredient replacement behaves).
- `load_tags_for(pool, &[recipe_id]) -> HashMap<String, Vec<String>>`: one query joining `recipe_tags` and `tags`, `ORDER BY recipe_id, LOWER(name)`. `list_recipes` calls it once for the whole page of ids; `get_recipe` and `get_recipe_by_share_token` call it for one id. Tags in responses are sorted alphabetically.

### Tag assessment mirrors difficulty assessment
`src/ai/tag_assessment.rs` exposes `assess_recipe_tags(llm, recipe, ingredients, steps) -> Result<Vec<String>, TagAssessmentError>`. The prompt includes title, description, timing, ingredients and steps and asks for a JSON array of 1–5 lowercase tags: exactly one course tag from `main | side | dessert | breakfast | snack | drink | sauce | bread`, optionally one cuisine tag (e.g. `italian`, `thai`) and diet tags (`vegetarian`, `vegan`, `gluten-free`). The parser strips code fences and any prose before the first `[`, runs every element through `normalize_tag`, drops failures, dedupes, caps at 5, and errors if no course tag survives. `complete_mock` gains a branch: when the system prompt is the tag-assessment prompt it returns `["main","curry"]`, so e2e and integration tests get deterministic tags.

The provider construction in `auto_assign_difficulty` (mock vs `config.difficulty_provider` / `difficulty_model`) is extracted into a shared helper so tagging reuses the same cheap model; no new configuration keys.

### Auto-assign on create
`POST /api/recipes` with empty `tags` spawns a second `tokio::spawn` beside the difficulty one, after the same 50 ms settle delay, which assesses and calls `set_recipe_tags` in its own transaction without touching `updated_by` (the recipe was just created by that user). A non-empty `tags` on create skips assessment entirely. Failures are logged and leave the recipe untagged; the backfill will not revisit it because the flag is per-collection, so the AI can be asked to tag it later.

### Backfill
`src/backfill/tags_backfill.rs` (new `src/backfill/` module, exported from `src/lib.rs`), spawned from `src/main.rs` after `sqlx::migrate!()` succeeds. Reads `backfill_flags.tags_backfill_completed`; if the table or row is missing it logs and skips. Selects `recipes r WHERE NOT EXISTS (SELECT 1 FROM recipe_tags WHERE recipe_id = r.id)` so it is idempotent and resumable; processes sequentially with a 100 ms delay, logs progress every 10, continues on individual failure, and sets the flag to `'true'` only after the full pass completes. If every attempt failed (and there was at least one recipe) the flag is left `'false'` so the next restart retries.

### MCP and prompt
`create_recipe` and `update_recipe` schemas gain `tags: { type: "array", items: { type: "string" }, description: "Lowercase tags. Use 'main' for main courses and 'dessert' for sweets; optionally add a cuisine (e.g. 'italian') or diet tag (e.g. 'vegetarian'). Omit on create to have tags assigned automatically." }`. `handle_list_recipes` adds `tags` to the reduced object. Tag validation errors from the API surface as `-32602`. `src/ai/prompts.rs` gains a `## Tags` section stating the fixed course names, that tags are lowercase, and that a request like "this is a pudding" or "tag it vegetarian" maps to `update_recipe` with the full replacement `tags` array (read the current tags first).

### Frontend: edge tabs and filter
- `renderIndex(recipes, { currentRecipeId, singleColumn, filter })` where `filter` is `'all' | 'main' | 'dessert' | 'meals'`. The renderer filters `recipes` by `tags.includes(filter)` for `main` / `dessert`, then builds the A–Z strip, groups, footer and page numbers from the filtered list. Page numbers still come from position in the **full** list so a recipe keeps its page number in every tab.
- Tab markup is static in `static/chat.html` inside `#page-left`, as a sibling of `#page-left-content` (so innerHTML rewrites never destroy it):
  ```html
  <nav class="contents-tabs" aria-label="Contents filter">
    <button type="button" class="contents-tab contents-tab-all is-active" data-filter="all" aria-pressed="true">All</button>
    <button type="button" class="contents-tab contents-tab-mains" data-filter="main" aria-pressed="false">Mains</button>
    <button type="button" class="contents-tab contents-tab-sweets" data-filter="dessert" aria-pressed="false">Sweets</button>
    <button type="button" class="contents-tab contents-tab-meals" data-filter="meals" aria-pressed="false" hidden>Meals</button>
  </nav>
  ```
  **Class names**: `contents-tabs` / `contents-tab`, *not* `edge-tabs` / `edge-tab`. Those latter
  names are already taken by the right page's Ingredients/Method/Notes section tabs
  (`static/chat.html`, `static/styles.css`, and `static/page-tabs.js`, which delegates on
  `[role="tab"][data-tab]`). The filter buttons therefore also carry no `role="tab"` and no
  `data-tab`, so the section-tab handler never sees them.

  Colours: All `--color-leather` with cream text; Mains `--color-border` (`#c9a86c`) with `--color-ink-dark` text (README contrast note); Sweets `--color-accent-brown` with cream text; Meals `--color-ink-medium` with cream text. Tabs sit on the outer (left) edge of the left page, rotated 90°, and are visible whenever the left page shows the contents (index view, and recipe view after change 4). Below 600px the same buttons render as a horizontal chip row directly under the "~ Contents ~" title, 44px tall targets.
- The Meals tab is only shown when `document.body.dataset.featureMeals` is set (CSS: `.contents-tab-meals { display: none } body[data-feature-meals] .contents-tab-meals { display: inline-flex }`, plus the `hidden` attribute removed by JS on the same condition). Nothing in this change sets the attribute; RV-107 will. If it is somehow active, selecting Meals renders the empty-filter message "No meal plans yet" because there is no meal-plan list to render.
- Filter state lives in shared state (`contentsFilter`) and is mirrored to `sessionStorage['rv-contents-filter']`; on load the stored value is used if it is one of the known filters, otherwise `all`. `sessionStorage` rather than `localStorage` so a new browser session starts on All.
- Empty filter: `<div class="index-empty">No mains yet. Ask me to tag a recipe as a main course.</div>` (Sweets: "No sweets yet…"), with the A–Z strip fully disabled and the footer reading "0 mains" / "0 sweets".
- Footer wording by filter: "N recipes" (All), "N mains", "N sweets", "N meal plans"; singular forms "1 main", "1 sweet", "1 meal plan".
- Next/previous navigation and the page numbers continue to traverse the **full** alphabetical list regardless of the active filter. The tabs are a lens on the contents page, not a change to the book's page order; doing otherwise would make "p. 7" mean different things on different tabs.
- Recipe meta line: after the difficulty dots, optional muted `.recipe-tag` chips (Kalam 12px, `--color-ink-light`, max 3 shown). Purely informational.

## Risks / Trade-offs

- **Backfill cost**: one cheap-model call per recipe, sequential with delay, same profile as the difficulty backfill which completed without incident. The flag gate means it runs once.
- **Tag quality**: the AI may pick the wrong course (`side` vs `main` for a hearty salad). Users fix it via chat; the prompt lists the fixed course names explicitly to reduce drift. A recipe with no course tag simply appears only under All.
- **Auto-tag vs backfill race**: a recipe created while the backfill is running may be tagged by both. `set_recipe_tags` is idempotent per name and the second writer wins; both produce a valid tag set.
- **`#[sqlx(skip)]` and `SELECT *`**: any new `query_as::<Recipe>` call site must remember to load tags. Mitigated by routing all recipe reads through `list_recipes` / `get_recipe` / `get_recipe_by_share_token`, which are the only ones today.
- **Global vocabulary leakage**: a family could learn that a tag name exists (via a unique-index conflict) but never which recipes carry it. Accepted; tag names are not sensitive.
- **Session-only persistence** means a reload keeps the filter but a new tab does not. Deliberate; the contents page should open on All for a fresh visit.

## Migration Plan

1. Add the two migration files (never edit applied ones). Run `sqlx migrate run` locally and against a **copy of the production database** per `ROLLBACK.md` / `migrations/MIGRATION_RESET.md` before tagging a release; confirm `recipe_tags` cascades on `DELETE FROM recipes`.
2. Deploy via a version tag as usual. `docker-entrypoint.sh` takes a backup before migrations. On first start the backfill tags every recipe; watch the logs for "Tags backfill completed".
3. Purge the Cloudflare cache after deploy (static assets changed) per CLAUDE.md.
4. Rollback: restore the pre-migration backup per `ROLLBACK.md` and redeploy the previous tag. The tables are additive, so the previous binary also runs against the migrated DB if only the code needs reverting.

## Open Questions

- Should `update_recipe` via chat re-run auto-tagging when the title or ingredients change substantially? Deferred; not needed for the tabs.
- Server-side tag suggestions for a future tag editor (`GET /api/tags`) are cheap once the table exists but have no consumer yet.
- Meals tab content (saved meal plans list, count in footer) is owned by RV-107 and will be specified with it.
