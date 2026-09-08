# The e2e server runs a 5-connection pool over one shared-cache in-memory SQLite

Status: needs-triage
Reported: 2026-09-08
Reporter: Claude (found while fixing `.scratch/contents-page-e2e-cross-project-flake/`)
Severity: low-medium — harness only, but it manufactures flakes that look like app bugs

## Description

`src/db/connection.rs:5-9` hardcodes `max_connections(5)` for every
`DATABASE_URL`. The e2e server runs with `DATABASE_URL='sqlite::memory:'`, and
sqlx rewrites that to `file:sqlx-in-memory-{seqno}` with `in_memory = true` **and
`shared_cache = true`** (`sqlx-sqlite-0.8.6/src/options/parse.rs:20-24`).

Shared-cache SQLite uses table-level locks and reports lock cycles as
`SQLITE_LOCKED` (code 6) via `sqlite3_unlock_notify`
(`sqlx-sqlite-0.8.6/src/connection/handle.rs:80`) — a hard error, not something
`busy_timeout` waits out. A file-backed WAL database would not behave this way.

Consequence: five connections contend on one shared cache, and any two
concurrent write transactions on the same tables can deadlock outright. One
observed run produced 12 such failures (see
`.scratch/recipe-create-spawns-two-racing-writers/README.md`), and the same
mechanism can hit a request-path `DELETE FROM recipes`, which surfaces to the
test as an HTTP 500 (`src/error.rs:52-59`).

Relatedly, `src/db/connection.rs:12-15` issues `PRAGMA journal_mode = WAL` on a
single pooled connection. That is a no-op for an in-memory database, and sqlx's
own notes warn that changing `journal_mode` needs an exclusive lock that
`busy_timeout` cannot wait on (`sqlx-sqlite-0.8.6/src/options/mod.rs:177-181`).

## Proposed fix

Either:

1. Cap the pool at one connection when the URL is in-memory, e.g.
   `let max = if database_url.contains(":memory:") || database_url.contains("mode=memory") { 1 } else { 5 };`
   — production keeps 5 because it is file-backed; or
2. Point the e2e server at a temp-file database so it gets real WAL semantics
   and the same locking behaviour as production.

Option 2 is the more faithful harness; option 1 is the one-line change.

## Detection

After a full `make test-e2e`, both of these should be zero:

```sh
grep -c 'deadlocked' /tmp/rv-server.log        # baseline today: 12
grep -c 'ERROR.*Database error' /tmp/rv-server.log
```
