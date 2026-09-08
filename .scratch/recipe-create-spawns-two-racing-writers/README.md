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
