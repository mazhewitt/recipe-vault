# Deploy book-spread-modes: merge, tag, purge the Cloudflare cache

Status: ready-for-human
Reported: 2026-09-09
Reporter: Claude (task 10.3 of the archived change, which is a deployer step)

The change is implemented, tested and archived
(`openspec/changes/archive/2026-09-09-book-spread-modes/`), but nothing has
shipped. Task 10.3 was deliberately left unticked because it is not an
implementation step.

## State

- Branch `implement-book-spread-modes`, three commits ahead of `main`:
  `03b5873` (the `.scratch` issue, already on main), `a087471` (the
  implementation), `a8e7c03` (the note-slip revision). Plus the archive commit
  once it lands.
- Not merged, not tagged, not pushed. `main` is 13+ commits ahead of
  `origin/main` independently of this.
- `make lint` clean, `make test-e2e` 327 passed / 72 skipped across chromium,
  mobile-chrome and ipad.

## What deploying needs

1. Merge to `main` (fast-forward as of writing).
2. Tag a release — CI/CD ships on git tags (`v2.x.y`), per `CLAUDE.md`.
3. **Purge the Cloudflare cache** (Caching > Purge Everything). This change is
   static assets only, and `ASSET_VERSION` is compiled into the binary, so the
   `?v=` cache-buster does not change on its own. `cache-control: no-cache`
   means browsers revalidate, but the edge still needs the purge.

No Rust, no database, no migration — `src/` and `migrations/` are untouched, so
there is nothing to test against a copy of the production database this time.

## Also worth doing at the same time

The branch `book-spread-modes` (no prefix) is a stale ancestor of `main` with no
commits of its own — it was the branch the proposal was written on, before it
merged. It is now confusable with `implement-book-spread-modes`. Delete it.
