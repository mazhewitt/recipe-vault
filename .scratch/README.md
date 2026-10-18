# `.scratch/` — the incoming work funnel

Informal tier of the two-tier tracker (see `docs/agents/issue-tracker.md`).
Anything here is still being triaged or waiting on a decision; formal work
lives in `openspec/changes/`. Labels are defined in
`docs/agents/triage-labels.md`.

**This index is a map, not a source of truth.** The `Status:` line inside each
file wins. List what is agent-ready with:

```sh
grep -rl "^Status: ready-for-agent" .scratch --include="*.md" | grep -v /archive/
```

## Ready for an agent (`ready-for-agent`)

- _(nothing right now)_

## Needs triage (`needs-triage`)

- `recipe-create-spawns-two-racing-writers/` — `POST /api/recipes` spawns two
  background tasks that deadlock on the same row, so recipes silently keep a
  NULL difficulty. Product defect, ships to production. The most consequential
  thing in this directory.
- `e2e-sqlite-in-memory-pool-contention/` — the e2e server runs a 5-connection
  pool over one shared-cache in-memory SQLite, which turns that race into a hard
  `SQLITE_LOCKED`. Harness only; one-line fix or a temp-file DB.
- `tablet-page-turn-overlay-covers-margin-notes/` — at 601-1024px the page-turn
  overlay hid the margin notes. Fixed in `static/page-transitions.js` with tests
  both directions; what needs a decision is whether it warrants a
  `recipe-page-transitions` spec delta.
- `e2e-breakpoint-guard-conventions/` — three e2e follow-ups: the guards that
  silently un-assert a test (`test.skip(isMobile, …)` and the bare `return`),
  two near-duplicate tablet tests, and `clearRecipes` living in three copies.
- `js-unit-test-layer/` — the frontend has no unit-test tier, so pure helpers
  (`escapeHtml`, `formatDuration`, the notes-scoping predicates) are asserted
  through a release build and a real browser or not at all. Lists what would
  pay, what should stay in Playwright, and the five decisions to make first.

- `book-spread-modes-follow-ups/02-open-decisions.md` — five judgement calls
  left by the spread-modes change: the one-per-line cook ingredient list, the
  now-inert right-edge strip, a deleted rather than adapted test, and the two
  open questions `design.md` raised (sticky cook mode, meal-plan thread bucket).
  Nothing broken; all cheap to reverse.

### From the 2026-10-17 usability audit

These findings fall outside `openspec/changes/steady-cooking-spread` and
`safe-page-navigation`. Each maps back to its audit rows in
`openspec/changes/steady-cooking-spread/audit-summary.md`. The audit also added
a comment to `recipe-create-spawns-two-racing-writers/`: it reproduces on a
file-backed database too (`SQLITE_BUSY`, 4 of 4 creates).

- `notes-thread-gaps/` — the thread is lost on reload, the phone cannot reach
  the book-level thread, and a turn that opens a recipe or meal plan files its
  reply where the cook cannot see it. The most user-visible of this batch.
- `tablet-swipe/` — no swipe on the tablet, the likely cooking device;
  deliberately deferred by safe-page-navigation for its own design.
- `share-flow/` — every tap mints a new public link, the share falls back to
  `prompt()`, and the public page has a relative `og:image` and double step
  numbers.
- `photo-upload-feedback/` — errors appear 600-1200px from the camera button,
  photos over 5MB are refused with no downscale, there is no remove, and the
  photo is re-downloaded on every render.
- `contents-page-rough-edges/` — the A-Z strip scrolls away, the return scroll
  overshoots, the letters are 20px, Notes moves the contents across the spine,
  and four results split across two pages. Three items need a spec decision.
- `meal-plan-dead-end/` — three disabled buttons, and no way back to the plan.
- `first-paint-stability/` — the Google Fonts swap reflows the recipe,
  unpinned `marked@latest` blocks paint, and the placeholder jumps on load.
- `timer-pill-and-duration-chips/` — promoted 2026-10-18 to
  `openspec/changes/glanceable-cooking` (G6, G7); archive with that change.
- `note-input-rough-edges/` — the image chip grows the slip and cannot
  re-attach the same file, an empty send is silent, and send keeps its hover
  colour on touch.
- `phone-paging-rough-edges/` — "next recipe ›" moves between taps, paging
  resets the tab, and a header tap during a view transition is lost.
- `cook-page-polish/` — uneven cook-mode ingredient spacing, and 14px replies
  beside an 18px method.

## Waiting on a human decision (`ready-for-human` / `needs-info`)

- `cook-header-takes-a-third-of-the-screen/` — 27-42% of the screen sits
  above step 1 (title, polaroid, a 3-4 row meta line, share and add-photo),
  and ingredient rows are 29-31px, so ticks land on the neighbour. Both trade
  space against D9 and list length; three options for the owner. Left out of
  `glanceable-cooking` on purpose.

- `book-spread-modes-follow-ups/01-deploy-and-purge-cache.md` — the spread-modes
  work is implemented, tested and archived but unshipped: merge, tag a release,
  and purge the Cloudflare cache (static assets only, so the compiled
  `ASSET_VERSION` does not change on its own). Also deletes the stale
  `book-spread-modes` branch.

- `contents-thumbnails-full-size-photos/` — contents page polaroids load the
  full-size photo. Decision brief appended 2026-09-08 with measured bytes and
  the cost of each option; still needs the maintainer to pick one.
- `contents-page-e2e-cross-project-flake/` — mitigated in the tests, not fixed
  at the cause. The guessed cause was refuted, the replacement account was never
  captured in a failing run, and the two mechanisms that would produce it are
  the two `needs-triage` items above. Decide whether to close it as mitigated
  or hold it until those land. **Do not archive on green runs alone.**

## Long-running programmes

- Journal 2.0 UI: direction in `planned-ideas/ui-v2-journal/`, remaining steps
  as `openspec/changes/journal-margin-notes`, `journal-book-only-layout`,
  `recipe-tags-contents-filters`.
- Meal planning: epic and RV-1xx stories in `planned-ideas/meal-planning-epic.md`.

## `archive/`

Closed work, kept for history. A directory moves here when every issue in it
is closed.

- `e2e-ipad-project-not-tablet/` — resolved 2026-09-08. The `ipad` project runs
  at a real 810x1080, the tablet tests execute there, and
  `tests/e2e/tests/viewport-contract.spec.ts` fails if either drifts. Landed in
  e3b0e2c.

## Conventions

- One issue per directory, files numbered `NN-short-name.md` (or a lone
  `README.md`).
- `Status:` near the top; conversation appends under `## Comments`.
- On archiving, the `Status:` line is replaced by `Resolved: <date> (<commit>)`.
- A recorded decision can expire. If it rests on something being impossible,
  say what would reopen it.
