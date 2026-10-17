# `POST /api/recipes` spawns two background writers that deadlock against each other

Status: needs-triage
Reported: 2026-09-08
Reporter: Claude (found while fixing `.scratch/contents-page-e2e-cross-project-flake/`; not caused by that work)
Severity: medium — recipes silently keep `difficulty = NULL` even though the LLM answered; ships to production, not just the e2e harness

## Symptom

Creating a recipe with neither `difficulty` nor `tags` set makes the server race
itself. In one `make test-e2e` run, 12 recipes ended up with no difficulty
because the difficulty write lost a deadlock to the tagging write on the same
row. The user-visible effect is a recipe whose difficulty dots never appear,
with nothing in the UI to say why.

## Evidence

`/tmp/rv-server.log` (one full 3-project e2e run, `RUST_LOG=debug`) contains 12
occurrences of

```
Failed to auto-assign difficulty to recipe <id>: Database error: error returned from database: (code: 6) database is deadlocked
```

at lines 4268, 4500, 5232, 5733, 7732, 13907, 14856, 15237, 16678, 20893, 25219
and 26287. The context around line 4268 shows the tagging transaction
committing and the difficulty `UPDATE` returning `rows_affected=0` in the same
microsecond.

## Cause

`src/handlers/recipes.rs:41-89` — `create_recipe` spawns **two independent**
`tokio` tasks for the same recipe id:

- `src/handlers/recipes.rs:51` → `auto_assign_difficulty`, which calls
  `queries::update_recipe` (`src/db/queries.rs:220-243`: `BEGIN` /
  `SELECT 1 FROM recipes` / `UPDATE recipes`).
- `src/handlers/recipes.rs:77` → `auto_assign_tags`, which calls
  `queries::set_recipe_tags` (`src/db/queries.rs:414-450`), writing `tags` and
  `recipe_tags` in its own transaction.

Both sleep the *same* 50 ms settle delay (`recipes.rs:54` and `recipes.rs:80`)
and then open their own write transaction touching the same row, so they
routinely collide. With `foreign_keys = ON` (`src/db/connection.rs:18-20`) the
tags transaction also needs to read `recipes` to validate the FK parent, which
closes the lock cycle.

The failure is spec-legal — `openspec/specs/recipe-difficulty-rating/spec.md`
permits a NULL difficulty when assessment fails — but the assessment did not
fail. Our own second task killed it.

## Proposed fix

Spawn **one** task that runs tagging and difficulty sequentially (ideally
committing both in a single transaction), instead of two tasks racing on one
row. That removes the self-collision entirely and halves the post-create write
load.

Related: `.scratch/e2e-sqlite-in-memory-pool-contention/README.md` describes the
database configuration that turns this race into a hard `SQLITE_LOCKED`
failure rather than a retryable wait.

## Comments

### 2026-10-17: Claude (usability audit)

The 2026-10-17 usability audit rediscovered this outside the e2e harness. It is finding `difficulty-backfill-lock-race` in `openspec/changes/steady-cooking-spread/audit-summary.md`, from the "manage" explorer.

- **Setup.** A file-backed SQLite database (`sqlite:<dir>/explore.db?mode=rwc`), not the shared-cache in-memory e2e database, with the mock LLM.
- **Result.** All 4 of 4 recipes created through `POST /api/recipes` with no difficulty and no tags logged `Failed to auto-assign difficulty to recipe …: Database error: (code: 5) database is locked`, immediately before `Auto-assigned tags ["main","curry"]`.
- **What the UI shows.** Three seconds later the recipe had tags and no difficulty. The UI polls at 3s, 10s and 22s (`static/recipe-display.js:72-96`), then gives up, and the difficulty dots never appear.
- **A different error code from the evidence above.** This is code 5 (`SQLITE_BUSY`, "database is locked"), not code 6 ("database is deadlocked"). `src/db/connection.rs:6-9` sets no `busy_timeout` and no `BEGIN IMMEDIATE`, so the read-then-write transaction that loses the race fails at once instead of waiting.

So this is not an artefact of the e2e configuration. It happens on a file database, which is what production runs on, and that is worth weighing when triaging severity.

The proposed fix above stands: one task, tagging and difficulty run in sequence. The audit also suggests a `busy_timeout`, or `BEGIN IMMEDIATE` with one retry on `SQLITE_BUSY`, on the pool as defence in depth.

On the frontend, steady-cooking-spread D5 reserves the difficulty slot in the meta line, so a late value no longer reflows the page. It does nothing for a value that never arrives.
