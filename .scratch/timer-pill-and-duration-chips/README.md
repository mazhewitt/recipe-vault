# Timer affordances: the pill does not lead back to its step, and the duration chips look tappable but are not

Status: promoted 2026-10-18 to `openspec/changes/glanceable-cooking` (item 2: G6, G7; item 1 is G7 of the same change). Archive this directory when that change is archived.
Reported: 2026-10-17
Reporter: Claude (usability audit, openspec/changes/steady-cooking-spread/audit-summary.md)
Severity: low. Both are expectations a cook brings from kitchen timers, not defects.

## Description

### 1. The running pill does not lead back to its recipe or step (`timer-pill-not-linked`, cook) — covered by `openspec/changes/glanceable-cooking` G7

With a Lasagne timer running, turning to Lemon Drizzle correctly keeps the pill. But the pill shows only the label the assistant chose, and tapping it does nothing. To see which step the timer belongs to, the cook has to page back by hand; the step highlight reappears only then.

- Evidence: on the next recipe the step highlight count is 0 and the pill is shown; back on the Lasagne it is 1.
- Cause: `static/timer.js:67-104` stores `recipeId` and `stepNumber` but exposes no way to navigate to them, and the pill in `static/chat.html:28-39` has no click handler.
- steady-cooking-spread D7 gives the *finished* pill a tap meaning: dismiss. Any tap meaning for the *running* pill has to stay distinct from that, and the ✕ stays the cancel.

### 2. Step duration chips look like buttons (`duration-chip-looks-tappable`, counter) — promoted to `openspec/changes/glanceable-cooking` (G6, G7)

Each timed step ends with a shaded, rounded "4 min" chip. A cook's first instinct is to tap it to start that timer, and nothing happens. Timers can only be started by asking the assistant.

- Evidence: the chip is a `SPAN` with background `rgb(240, 230, 204)`, `cursor: auto` and no handler.
- Cause: `static/recipe-display.js:568-570` renders a bare span, and `static/styles.css:834-845` styles it as a chip.

## What a fix needs

- Item 1: tapping the running pill goes back to the timer's recipe and scrolls to its step. Consider showing the step in the pill ("Step 2 · 7:42").
- Item 2: decide between two options:
  - make the chip a 44px button that starts a local timer for that step, through the same `startTimer(minutes, label, stepNumber)` path and with no round trip to the assistant;
  - or style it as plain text.
- cooking-guidance only defines timers driven by the assistant (the `start_timer` tool). A local timer is a new requirement, so it needs a spec decision first.

## Comments

- 2026-10-18: item 2 promoted to `openspec/changes/glanceable-cooking`. G6 decides the open choice above in favour of a 44px button that starts a local timer through `startTimer`, with a confirming second tap before it replaces a running timer. G7 makes the running pill name its step ("Step 2 · 7:42") and lead to it. That also settles item 1. The re-check of the post-steady build (`tests/usability/runs/audit-post-steady/`) found both still present: `duration-chip-looks-tappable` (cook, counter) and `timer-pill-not-linked` (cook).
