# Triage labels

Issues live as Markdown files under `.scratch/<slug>/`, so labels are recorded
as a `Status:` line near the top of each file rather than as GitHub labels.

| String in `Status:` line | Meaning                                       |
| ------------------------ | --------------------------------------------- |
| `needs-triage`           | Maintainer needs to evaluate this issue       |
| `needs-info`             | Waiting on the reporter for more information  |
| `ready-for-agent`        | Fully specified, an agent can pick it up      |
| `ready-for-human`        | Needs a human decision, hardware, or data     |
| `wontfix`                | Will not be actioned                          |

Example header:

```markdown
# Contents thumbnails download full-size photos

Status: needs-triage
Reported: 2026-09-06
Reporter: mazda

## Description
…
```

## Promotion out of triage

When an item leaves `.scratch/` and becomes an OpenSpec change (see
`issue-tracker.md`), the `Status:` line stops being meaningful. OpenSpec has
its own lifecycle (proposed, in progress, archived). Do not carry the triage
label into `proposal.md`.
