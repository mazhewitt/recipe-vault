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

- `e2e-ipad-project-not-tablet/` — the Playwright `ipad` project renders at
  1280x720 because its device descriptor does not resolve, so it duplicates
  `chromium` and nothing tests the tablet breakpoint.

## Waiting on a human decision (`ready-for-human` / `needs-info`)

- `contents-thumbnails-full-size-photos/` — contents page polaroids load the
  full-size photo. Needs a decision on server-side resize vs. accepting it.

## Long-running programmes

- Journal 2.0 UI: direction in `planned-ideas/ui-v2-journal/`, remaining steps
  as `openspec/changes/journal-margin-notes`, `journal-book-only-layout`,
  `recipe-tags-contents-filters`.
- Meal planning: epic and RV-1xx stories in `planned-ideas/meal-planning-epic.md`.

## `archive/`

Closed work, kept for history. A directory moves here when every issue in it
is closed.

## Conventions

- One issue per directory, files numbered `NN-short-name.md` (or a lone
  `README.md`).
- `Status:` near the top; conversation appends under `## Comments`.
- A recorded decision can expire. If it rests on something being impossible,
  say what would reopen it.
