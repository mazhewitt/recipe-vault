# Timer affordances: the pill does not lead back to its step, and the duration chips look tappable but are not

Status: needs-triage
Reported: 2026-10-17
Reporter: Claude (usability audit, openspec/changes/steady-cooking-spread/audit-summary.md)
Severity: low. Both are expectations a cook brings from kitchen timers, not defects.

## Description

### 1. The running pill does not lead back to its recipe or step (`timer-pill-not-linked`, cook)

With a Lasagne timer running, turning to Lemon Drizzle correctly keeps the pill. But the pill shows only the label the assistant chose, and tapping it does nothing. To see which step the timer belongs to, the cook has to page back by hand; the step highlight reappears only then.

- Evidence: on the next recipe the step highlight count is 0 and the pill is shown; back on the Lasagne it is 1.
- Cause: `static/timer.js:67-104` stores `recipeId` and `stepNumber` but exposes no way to navigate to them, and the pill in `static/chat.html:28-39` has no click handler.
- steady-cooking-spread D7 gives the *finished* pill a tap meaning: dismiss. Any tap meaning for the *running* pill has to stay distinct from that, and the ✕ stays the cancel.

### 2. Step duration chips look like buttons (`duration-chip-looks-tappable`, counter)

Each timed step ends with a shaded, rounded "4 min" chip. A cook's first instinct is to tap it to start that timer, and nothing happens. Timers can only be started by asking the assistant.

- Evidence: the chip is a `SPAN` with background `rgb(240, 230, 204)`, `cursor: auto` and no handler.
- Cause: `static/recipe-display.js:568-570` renders a bare span, and `static/styles.css:834-845` styles it as a chip.

## What a fix needs

- Item 1: tapping the running pill goes back to the timer's recipe and scrolls to its step. Consider showing the step in the pill ("Step 2 · 7:42").
- Item 2: decide between two options:
  - make the chip a 44px button that starts a local timer for that step, through the same `startTimer(minutes, label, stepNumber)` path and with no round trip to the assistant;
  - or style it as plain text.
- cooking-guidance only defines timers driven by the assistant (the `start_timer` tool). A local timer is a new requirement, so it needs a spec decision first.
