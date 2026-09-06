# Issue tracker: local Markdown + OpenSpec (two-tier)

Recipe Vault keeps its issues in the repo, not on GitHub. Two tiers:

- **`.scratch/<slug>/`** — informal incoming work: bug reports, half-formed
  ideas, drive-by feature requests, follow-ups that fell out of a review. This
  is where triage lives.
- **`openspec/changes/<name>/`** — formal work: anything promoted out of triage
  into a real change with proposal, design, spec deltas and tasks.

The two layers are not parallel trackers. `.scratch/` is the funnel and
OpenSpec is the formal layer downstream. An item in `.scratch/` is *either*
still being triaged, or has been promoted (and its directory can then be
deleted or archived).

`planned-ideas/` is older and coarser: epics and design handoffs (for example
the meal-planning epic with its RV-1xx story ids, and the Journal 2.0 UI
direction). New work should start in `.scratch/`; a `.scratch/` file may link
to an epic in `planned-ideas/` for context.

## `.scratch/` conventions

- One issue or feature per directory: `.scratch/<slug>/`
- Issue files: `.scratch/<slug>/<NN>-<short-name>.md`, numbered from `01`.
  A directory with a single issue may use `README.md` instead.
- Triage state is a `Status:` line near the top of each file (see
  `triage-labels.md`). Also record `Reported:` and `Reporter:`.
- Comments and conversation history append to the bottom under a
  `## Comments` heading, dated.
- `.scratch/README.md` is an index, not a source of truth. The `Status:` line
  inside each file wins.

## Promotion: `.scratch/` → `openspec/changes/`

When triage decides an item is `ready-for-agent` or `ready-for-human` and it
is bigger than a one-commit fix:

1. Create the change directory under `openspec/changes/<name>/` (proposal,
   design, tasks, spec deltas; run `openspec validate <name>`).
2. Carry the relevant content from the `.scratch/` file(s) into `proposal.md`.
3. Delete the `.scratch/<slug>/` directory, or move it to `.scratch/archive/`
   if the history is worth keeping. Update `.scratch/README.md`.

Small fixes that need no spec change can be done straight from the `.scratch/`
file. Mark it `Resolved: <date> (<commit>)` and archive it.

Items marked `wontfix` are deleted from `.scratch/` with a one-line note in the
commit message.

## When an agent is told to "file an issue"

Create a new file under `.scratch/<slug>/`, creating the directory if needed.
Do **not** create an OpenSpec change directly. That is a promotion decision,
not a triage decision.
