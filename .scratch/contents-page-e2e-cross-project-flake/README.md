# contents-page.spec.ts flakes in a full multi-project e2e run

Status: ready-for-human
Reported: 2026-09-06 (recovered from git: added in 6f71e1d)
Reporter: Claude — observed while reviewing `openspec/changes/journal-margin-notes`

## Symptom

In a full `make test-e2e` run (chromium + mobile-chrome + ipad), `tests/e2e/tests/contents-page.spec.ts:28` failed once on the `ipad` project: `.index-recipe-item` count was 4, expected 3.

## Notes

- Did not reproduce when running `contents-page.spec.ts` in isolation, when paired with `chat.spec.ts`, or in a full ipad-only rerun.
- ~~Order dependent: the Playwright projects share one server and one in-memory database, so recipes created by tests in another project can appear in the contents list a later project asserts an exact count on.~~ **Corrected 2026-09-08 — see the comment below.** `workers: 1` + `fullyParallel: false` (`tests/e2e/playwright.config.ts`) run the projects strictly one after another, so nothing from another project is ever in flight. The real shape is narrower: a DB-wide absolute-count assertion sitting behind a best-effort recipe sweep whose HTTP responses were never checked, against a database that throws transient write errors.
- Observed while reviewing `openspec/changes/journal-margin-notes`; the spec is untouched by that change.

## Likely fix

Scope each assertion to the recipes the test created *and* make the clear-down
reliable. Page numbers (`p. 3` / `p. 5` / `p. 7`) are positions in the full
alphabetical list (`recipe-book-index` spec, "Entry shows a page number":
`2 * i + 3`), so they cannot be scoped away — an empty book is a precondition
that has to be *guaranteed*, not hoped for.

## Comments

### 2026-09-08 — root cause, from the last full run's server log

The stated hypothesis (cross-*project* contamination) is wrong. Three verified
facts combine instead.

**1. The DOM count equals the server's list length exactly.** The desktop path
rewrites both `#page-left-content` and `#page-right-content` on every render
(`static/recipe-display.js:352-366`), and the two `renderGroup()` calls are fed
disjoint `slice()`s of the same sorted letter list
(`static/recipe-display.js:346-347`). `openBook()` is a `page.reload()`, so the
module-scoped `recipeListCache` (`static/app.js:46-59`) is gone. A 4th row means
the server returned 4 recipes. Pagination is refuted too — `src/db/queries.rs:179`
and `:188` have no LIMIT/OFFSET. A scope mismatch is refuted: the sweep runs in
god mode (`src/auth.rs:190-196`) over an unfiltered
`SELECT * FROM recipes ORDER BY LOWER(title)`, so its view is a strict superset
of the family-scoped browser view.

**2. Recipe leakage is real, large and continuous — just not cross-project.**
Every project shares one server and one in-memory DB, and most spec files never
sweep. Reconstructed from `/tmp/rv-server.log` (27 MB, `RUST_LOG=debug`, the run
that produced `tests/e2e/playwright-report/`):

- `10:47:39.840`, `10:48:15.337` and `10:49:06.225` — god-mode list queries
  returning **17, 69 and 59** rows, each immediately followed by that many
  DELETEs. Those are `clearRecipes` sweeps at the start of a spec file, mopping
  up everything the previous files left behind.
- Immediately before `ipad/contents-page.spec.ts`: three `seedTagged` INSERTs at
  `10:49:09.955-09.961`, a fourth INSERT (`Tagged Recipe`) at `10:49:10.331`
  from the `Recipe tag chips` describe whose `beforeEach` had no sweep, then a
  god-mode list at `10:49:10.481` returning **4** rows and 4 DELETEs. The
  failing assertion sits directly downstream of a 4-recipe sweep that has to
  succeed completely, every time.

**3. `clearRecipes` checked nothing, and the server does return transient write
failures.** All three copies (`contents-page.spec.ts:9-14`,
`contents-filters.spec.ts:6-11`, `index.spec.ts:4-17`) discarded every response,
and `ApiError::Database` maps to HTTP 500 (`src/error.rs:52-59`). The DB is a
5-connection pool over a shared-cache in-memory SQLite, where lock cycles are
reported as a hard `SQLITE_LOCKED` (code 6). `create_recipe` spawns two
independent background writers per recipe that deadlock against each other
**12 times in that single run** (`/tmp/rv-server.log` lines 4268, 4500, 5232,
5733, 7732, 13907, 14856, 15237, 16678, 20893, 25219, 26287) — one of them at
`10:49:10.650`, 12 ms before the next sweep. One swallowed 500 on one DELETE
anywhere in a 15-file, 3-project suite lands on this assertion.

The 4th row was therefore a survivor of the sweep, not a concurrently-created
recipe: the timeline at `10:49:10.482-10.609` is sweep → 4 DELETEs → 3 INSERTs →
list = 3, with no stray INSERT in between. `Apple Crumble <suffix>` sorts before
`Apple Pie` and `Tagged Recipe <suffix>` sorts after `Carrot Cake`, so in both
cases the `nth(0..2)` page-number assertions still pass and only the count
fails — exactly the reported symptom.

**Not proven:** the failing run itself was not captured
(`tests/e2e/test-results/.last-run.json` for the log above says
`{"status":"passed","failedTests":[]}`), so "a DELETE returned 500 and the sweep
swallowed it" is inference from a proven capability rather than a captured
instance. Nor was `DELETE FROM recipes` observed as the deadlock victim —
every observed victim was the difficulty `UPDATE`. Both would need a targeted
stress test on the e2e port to confirm. Resurrection was actively refuted:
`queries::update_recipe` is not an upsert (`src/db/queries.rs:222-243`) and
`recipe_tags` has an FK with `ON DELETE CASCADE`
(`migrations/20260906120000_add_tags.sql:11-13`), and all 270 DELETEs in the
passing run returned `rows_affected=1`.

### 2026-09-08 — fix applied (tests only, e3b0e2c)

- `clearRecipes` in all three spec files now retries up to three times, warns
  with the HTTP status when a DELETE fails, and finishes by asserting the book
  is empty — naming the leftover titles instead of surfacing as a bare "4 vs 3"
  a few lines later.
- Added the two missing sweeps: `Recipe tag chips`
  (`contents-filters.spec.ts`) and `Recipe typography and meta line`
  (`contents-page.spec.ts`).
- Every fragile count is now paired: an exact count of *this test's* rows
  (filtered by the unique title suffix) plus the absolute count, so "the app
  dropped a row" and "the sweep leaked a row" fail separately.
- Page-number assertions are now addressed by `data-recipe-id` rather than
  `nth(i)`, so a failure names the recipe.
- `index.spec.ts:144` (`empty state renders correctly`) used to `return` early
  whenever any recipe existed. Given the leakage above it had not asserted
  anything in a long time; it now clears the book and always runs.

Two follow-ups filed rather than fixed here, since both touch `src/`:

- `.scratch/recipe-create-spawns-two-racing-writers/` — the product defect.
- `.scratch/e2e-sqlite-in-memory-pool-contention/` — the harness defect.

Kept at `needs-triage`: whether either of those gets promoted to an OpenSpec
change is a human decision.

### 2026-09-08 — end state: mitigated in the tests, root cause narrowed but never proven. Not archived.

Written by the agent closing out the run, verifying the two comments above
against the working tree (file reads and greps only; this agent did not own
port 3001 and ran no tests). Deliberately **not** marked `Resolved:` and **not**
archived, for three reasons:

1. **The originally-guessed cause was wrong, and the replacement is inference,
   not a capture.** The issue guessed cross-*project* contamination. That is
   refuted: `workers: 1` + `fullyParallel: false` in
   `tests/e2e/playwright.config.ts:5,8` run projects strictly in sequence. The
   replacement account — a `DELETE` returning a swallowed HTTP 500 out of a
   best-effort sweep, leaving one recipe behind for an absolute count to trip on
   — rests on a *proven capability* (`ApiError::Database` → 500 at
   `src/error.rs:52-59`; 12 real `SQLITE_LOCKED` deadlocks in one logged run)
   rather than on the failing run itself, which was never captured. No
   `DELETE FROM recipes` was ever observed losing a deadlock; every observed
   victim was the difficulty `UPDATE`. Proving it needs a targeted stress test
   on the e2e port that nobody has run.
2. **What shipped is a test-robustness change, not a fix to the thing that
   causes flakes.** The mechanism still exists in `src/` and still ships. It is
   carried by two open child issues, both `needs-triage`:
   `.scratch/recipe-create-spawns-two-racing-writers/` (the product defect) and
   `.scratch/e2e-sqlite-in-memory-pool-contention/` (the harness config that
   converts the race into a hard error).
3. **A clean run is weak evidence here.** The original failure never reproduced
   in isolation, in a paired run, or in a full `ipad`-only rerun. Green full runs
   since the change therefore cannot distinguish "fixed" from "did not happen to
   fire".

What *is* done, verified in the tree:

- `clearRecipes` in `contents-page.spec.ts:25`, `contents-filters.spec.ts:21` and
  `index.spec.ts:21` now sweeps up to three times, checks `GET /api/recipes`
  with `expect(list.ok())`, warns with the HTTP status and body on a failed
  `DELETE` (tolerating 404), and ends on
  `expect(titles, 'clearRecipes could not empty the book').toEqual([])`. The
  precondition is asserted where it is established instead of surfacing as a
  bare "4 vs 3" further down.
- The two missing sweeps were added (`Recipe tag chips`,
  `Recipe typography and meta line`).
- Fragile counts are paired: this test's rows by unique title suffix, plus the
  whole-book absolute. Page-number assertions address rows by `data-recipe-id`,
  so a failure names the recipe. Whole-book absolutes (footer text, `p. 3/5/7`)
  remain absolute by necessity — page number is a position in the full
  alphabetical list, as the "Likely fix" section above already conceded.

**The decision this needs from a human** is which of these:

- close it as mitigated and let the two child issues carry the cause; or
- keep it open until `recipe-create-spawns-two-racing-writers` lands, and
  re-verify then; or
- fund the targeted stress test that would turn the inference above into a
  captured instance.

Nothing here is blocked on an agent. Do not archive this directory on the
strength of green runs alone.
