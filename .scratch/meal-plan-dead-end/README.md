# Meal plan: three buttons that do nothing, and no way back to the plan after opening a dish

Status: needs-triage
Reported: 2026-10-17
Reporter: Claude (usability audit, openspec/changes/steady-cooking-spread/audit-summary.md)
Severity: low. Meal planning is at phase 1, but every plan shown today ends in a dead end.

## Description

Finding `meal-plan-dead-end` from the audit's "ask" explorer.

- **Three permanently disabled buttons.** The plan shows Shopping List, Cooking Timeline and Save Meal, all disabled (`static/meal-plan-display.js:63-67`). `tests/e2e/tests/meal-plan-display.spec.ts:101` asserts exactly that, as the "Phase 1 state".
- **No way back to the plan.** Opening a dish turns the page to the recipe, and the plan is gone:
  - nothing stores it;
  - there is no "back to the plan" link;
  - the Meals filter is gated off (`static/app.js:630-634`, `static/spread-modes.js:128-130`).
  The only way back is to ask the assistant again.
- **Phone layout-shift burst.** Showing a plan on the phone gives a layout-shift burst of 0.726: `#page-right-content` goes from 629 to 264px tall, and the edge-nav rects and `form#note-input` move.

Evidence: remeasure `meal-plan-dead-end`, 3 disabled action buttons and 0 routes back to the plan. The phone layout shift is from the explorer's x5 run.

Already handled elsewhere: steady-cooking-spread D1 keeps the note input on a meal plan, where it used to be hidden, so a follow-up such as "swap the side" can be typed.

## What a fix needs

- Hide actions that are not built yet rather than showing them disabled, and update `meal-plan-display.spec.ts:101` to match.
- Keep the last meal plan in session state. Offer a "back to the meal plan" link on a recipe opened from it.
- Re-measure the phone layout shift once steady-cooking-spread lands. Its fixed `.app-container` width (D5) may remove most of it.
- Context: `planned-ideas/meal-planning-epic.md`, in particular RV-107 (persisting meal plans).

## 2026-10-18 re-check

Fresh-eyes re-check of the post-steady build (`e35a58c`), ask explorer (`tests/usability/runs/audit-post-steady/ask/`, finding `meal-plan-stale-sticky`, new):

- Ask "show me the lasagne" from the contents, then ask for a meal plan from the lasagne. The plan opens, but the sticky above the input shows the earlier book-level reply ("I've pulled up the recipe in the side panel for you!…"). The plan's own reply ("I've assembled your meal plan") was filed under the lasagne and is not shown.
- The slip still reads "p. 7", the lasagne's page, on the plan.
- Asking for a plan from cook mode also switches the left page to the contents.
- Evidence: `remeasure.cjs meal-plan-stale-sticky`: tablet viewMode=meal, sticky=["I've pulled up the recipe in the side panel for yo"], slip page number "p. 7". `x-flow.cjs` gives the same at tablet, landscape and phone, with spread modes [meal, contents]. Shots: `ask/shots/flow-D-meal-tablet.png`, `flow-D-meal-phone.png`.
- Likely cause:
  - `static/chat.js` ≈168-170 files the turn under the recipe on screen when the note was sent.
  - `static/margin-notes.js` ≈123-126 `displayedRecipeId()` returns `null` (the book thread) for a meal plan, so `latestReply()` (≈144-150) picks the newest book-thread reply, however old.
  - `static/meal-plan-display.js` ≈26-32 never calls `setNotePageNumber` (`static/recipe-display.js` ≈165).
- Fix direction: show the in-flight turn's reply on whichever page it opened (see `notes-thread-gaps` item 3). At minimum, never show a book-thread reply older than the current view on a freshly opened plan. Set the slip's page number to blank or "plan" in `renderMealPlan`.
- Still present from the first audit: 3 disabled action buttons and 0 routes back to the plan (`meal-plan-dead-end`).
- Not taken up by `openspec/changes/glanceable-cooking` (its proposal's Non-goals).
