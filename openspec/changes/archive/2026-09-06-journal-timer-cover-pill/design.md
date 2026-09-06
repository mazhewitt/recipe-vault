## Context

Step 2 of the Journal 2.0 build order in `planned-ideas/ui-v2-journal/README.md`. It is written against the result of `journal-typography-contents` (step 1): method steps are already rendered as `<div class="prep-step" data-step="N"><span class="step-number">N.</span><span class="step-text">…</span></div>`, which is the hook the timer highlight targets. Steps 3–5 (`journal-margin-notes`, `journal-book-only-layout`, `recipe-tags-contents-filters`) build on the result of this change; in particular step 3's status lines ("Step 3 timer set…") assume the pill and step highlight exist.

Current code:
- `static/chat.html:21-32` — `#timer-widget` is a sibling of `.user-info` at the top of `<body>`.
- `static/styles.css:144-198` — `.timer-widget` is `position: fixed; top: 25px; right: 50px` with `::before`/`::after` drawing a speech-bubble tail; `.user-info` at `styles.css:1282` uses the same coordinates, so they overlap. Tablet override at `1345-1348`, phone override at `1465-1480` (hides the tail, shrinks text).
- `static/timer.js` — module-scoped `activeTimer = { interval, label }`; `startTimer(durationMinutes, label)`, `cancelTimer()`; no `initializeState`, so `app.js:71` skips it.
- `static/chat.js:305-310` and `337-338` — `timer_start` handling calls `state.startTimer(parsed.duration_minutes, parsed.label)`.
- `src/mcp/tools.rs:205-225` — `start_timer` schema (`duration_minutes`, `label`); `315-343` — `handle_start_timer` returns `timer_id`, `duration_minutes`, `label`, `message`.
- `src/ai/client.rs:578-602` — `execute_tool` parses the tool result back into `Option<(f64, String)>`; `chat` at `612-615` returns that tuple inside a six-element tuple.
- `src/handlers/chat.rs:61-65` — `SseEvent::TimerStart { duration_minutes, label }`; `201-209` emits the event with a hand-built `json!`.
- `src/ai/llm.rs:198` — `complete_mock` pattern-matches the last user message; no timer branch.
- `src/ai/prompts.rs:104-108` — guided-cooking timer guidance.

## Goals / Non-Goals

**Goals**
- Timer pill anchored to the book cover; no overlap with the user pill at any breakpoint.
- 28px minimum close target (44px on the phone per the README touch rule is not required for the close button since it sits inside a 36px pill; 28px is the README's stated target).
- Timers may carry a step number end to end: tool → SSE → frontend highlight.
- Highlight survives re-render of the same recipe and never leaks onto another recipe.
- Deterministic e2e coverage via the mock LLM.

**Non-Goals**
- Multiple simultaneous timers (single-timer rule from `cooking-guidance` stays).
- Timer persistence across page reloads.
- Margin/status-line rendering of timer confirmations (step 3).
- Moving the timer for the book-only layout (step 4 keeps it on the cover; only the cover's size changes).

## Decisions

### Pill lives inside the book
`#timer-widget` moves to `static/chat.html` inside `.recipe-book`, immediately after `<div class="book-cover"></div>`. `.recipe-book` is already `position: relative` (`styles.css:508-513`) and `.book-cover` is `absolute; top:-8px; right:-12px` (`516-535`), so the pill is positioned as `position: absolute; top: -22px; right: 12px; z-index: 3` — half its height above the cover's top edge, which reads as clipped on. The `::before`/`::after` tail rules are deleted. Because the pill is no longer `fixed`, it scrolls and resizes with the book and cannot collide with `.user-info`, which stays `fixed` in the viewport corner.

Pill styling: background `var(--color-paper-cream)` (`#f5f0e5` today), `2px solid var(--color-ink-dark)` border, `var(--radius-pill)`, `padding: 4px 8px 4px 14px`, height 36px, `box-shadow: var(--shadow-soft)`. Contents in order: clock icon (18px), `.timer-text` (Kalam 18px/400), `.timer-cancel` button sized `28px × 28px` with `min-width/min-height: 28px` and a circular hover tint. `.timer-text` keeps the `"{label}: M:SS"` format so nothing in `timer.js` display logic changes.

Phone (`@media (max-width: 600px)`): `top: -16px; right: 8px; height: 30px; padding: 2px 6px 2px 10px`, text 14px, icon 14px, close still 28px. Remove the old override block at `styles.css:1465-1480` (`top/right/padding` and the `::before/::after` hide). Tablet override at `1345-1348` is also removed; the cover-relative position needs no breakpoint tuning.

### Step highlight
`.prep-step.timer-active` gets `background: var(--color-timer-band)` (new token `--color-timer-band: #fff4c2`, a pale yellow that keeps `--color-ink` legible), `border-radius: var(--radius-sm)`, `margin: 0 -8px; padding-left/right: 8px` so the band bleeds slightly past the text, and a `::after` pseudo-element with `content: "timer running"` in Kalam 13px `--color-ink-light`, positioned at the step's top-right. `prefers-reduced-motion` is respected by not animating the band in.

### `TimerData` replaces the tuple
`src/ai/client.rs` gains

```rust
#[derive(Debug, Clone, PartialEq)]
pub struct TimerData {
    pub duration_minutes: f64,
    pub label: String,
    pub step_number: Option<u32>,
}
```

`execute_tool` returns `Option<TimerData>` (parsing `step_number` from the tool result with `as_u64`), and `chat` returns `Vec<TimerData>` in the timer slot of its tuple. This is the first step toward the side-effects struct noted in the plan's cross-cutting risks; the rest of the tuple is left alone here.

### SSE payload
`SseEvent::TimerStart` in `src/handlers/chat.rs` becomes `{ duration_minutes: f64, label: String, #[serde(skip_serializing_if = "Option::is_none")] step_number: Option<u32> }` and the emission loop at `201-209` serialises the variant instead of a hand-built `json!`, so the wire format is `{"duration_minutes":30,"label":"Marinate chicken","step_number":2}` and unchanged when there is no step.

### Tool contract
`start_timer` schema adds `"step_number": {"type": "integer", "minimum": 1, "description": "The 1-based method step this wait belongs to, when there is one"}` (not required). `handle_start_timer` reads it with `as_u64`, rejects `0` with `invalid_params`, and echoes it in the result JSON only when present. The `message` string appends `" (step N)"` when a step is given.

### Frontend state
`static/timer.js` gains `initializeState(sharedState)` (so `app.js:71` wires it) and stores `activeTimer = { interval, label, recipeId, stepNumber }` where `recipeId` is `state.currentRecipeId` at the moment the timer starts. `startTimer(durationMinutes, label, stepNumber)` calls `applyStepHighlight(state.currentRecipeId)` after showing the pill; `onTimerComplete` and `cancelTimer` call `clearStepHighlight()` which removes `.timer-active` from every `.prep-step` in the book. Exported `applyStepHighlight(recipeId)` is a no-op unless a timer is running with a `stepNumber` and `recipeId === activeTimer.recipeId`; otherwise it clears then toggles `.prep-step[data-step="N"].timer-active` inside `#page-left-content` and `#page-right-content` (mobile renders both halves into the left page after step 1). `renderRecipe` in `static/recipe-display.js` calls `Timer.applyStepHighlight(recipe.id)` as its last statement (imported directly; no cycle since `timer.js` imports nothing). `chat.js` passes `parsed.step_number` as the third argument in both `timer_start` branches. `app.js` exposes `window.startTimer = Timer.startTimer` alongside the existing `window.cancelTimer` so Playwright can drive the highlight without the SSE round trip.

### Mock LLM
`complete_mock` in `src/ai/llm.rs`: when the last user message contains "timer", return `ToolUse` for `start_timer` with `{"duration_minutes": 0.1, "label": "Mock timer", "step_number": 2}`; when the last message is a tool result and the user message contained "timer", return the text "Timer started for step 2." This mirrors the existing list/show branches and lets `timer.spec.ts` assert the pill and the highlight on step 2 of a seeded recipe.

### Prompt
`src/ai/prompts.rs` item 5 gains: "When the wait belongs to a specific numbered step of the recipe, pass `step_number` so the page can highlight it. Example: start_timer(30, "Marinate chicken", step_number=2)".

## Risks / Trade-offs

- Absolute positioning above the cover means the pill's top 18px sit outside `.recipe-book`; `.book-container` must not clip (`overflow: visible` is the default and is checked in the e2e test by asserting the pill's bounding box is fully visible).
- `applyStepHighlight` relies on `state.currentRecipeId` being the id of the recipe on the page. `fetchAndDisplayRecipe` sets it (`recipe-display.js:555`) before `renderRecipe` runs, so the hook sees the right id.
- Widening the `chat` return tuple to a struct field is a small refactor across `client.rs` and `chat.rs`; unit tests in `tests/chat_test.rs` that destructure the tuple must be updated.
- The mock branch keys on the word "timer"; existing e2e messages do not use it, so no test changes behaviour by accident.

## Migration Plan

Frontend + backend in one deploy; the SSE field is optional so an old frontend cached against a new backend ignores it, and `?v=` cache-busting from step 1 refreshes the assets. No database changes. Rollback is a redeploy of the previous tag. Purge the Cloudflare cache after deploy per CLAUDE.md.

## Open Questions

- None blocking. Whether step-3 status lines should also carry a "cancel" affordance is left to `journal-margin-notes`.
