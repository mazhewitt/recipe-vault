## Why

The cooking timer is a floating speech bubble at `position: fixed; top: 25px; right: 50px` — exactly the coordinates of the `.user-info` pill — so on desktop a running timer sits on top of the user's email and Logout link. The Journal 2.0 direction (`planned-ideas/ui-v2-journal/README.md`, chosen 2026-09-05) replaces the bubble with a cream pill "clipped" to the top-right edge of the book cover, and says timers should attach to a step: "Setting one highlights the step and pins the timer pill to the cover." This is build step 2 of 5.

`journal-typography-contents` (step 1) already gives every method step a `data-step` attribute, so the highlight has a DOM hook to target.

## What Changes

- `#timer-widget` moves from the top of `<body>` into `.recipe-book`, directly after `.book-cover`, and is absolutely positioned against the cover's top-right corner as a cream pill with a 28px close target. The speech-bubble tail goes. On the phone it becomes a compact pill in the same corner of the book frame. It never overlaps `.user-info`.
- `start_timer` gains an optional `step_number` argument (1-based index into the recipe's method). The tool echoes it and the backend forwards it on the `timer_start` SSE event.
- The frontend remembers `{ recipeId, stepNumber }` for the running timer and highlights `.prep-step[data-step="N"]` with a pale band and a small "timer running" label while that recipe is displayed. The highlight clears on completion or cancellation, is re-applied when the same recipe is re-rendered, and is absent when the timer has no step or another recipe is open.
- The mock LLM gains a "timer" branch so the end-to-end suite can exercise the whole path without a real model.
- The guided-cooking prompt tells the model to pass `step_number` when the wait belongs to a specific step.

No other layout change: the notepad, the two-page spread and page scrolling stay as they are after step 1.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `family-recipe-ui`: timer widget becomes a cream pill clipped to the top-right of the book cover with a 28px close target, compact on the phone, never overlapping the user pill
- `cooking-guidance`: `start_timer` accepts an optional `step_number`, echoed on the `timer_start` event; the frontend highlights the step a running timer belongs to

## Impact

- `src/mcp/tools.rs` — `start_timer` schema and `handle_start_timer` pass `step_number`
- `src/ai/client.rs` — `TimerData` struct replaces the `(f64, String)` timer tuple in `execute_tool` / `chat`
- `src/handlers/chat.rs` — `SseEvent::TimerStart` gains `step_number: Option<u32>`; emission loop updated
- `src/ai/llm.rs` — `complete_mock` "timer" branch
- `src/ai/prompts.rs` — guided-cooking timer guidance mentions `step_number`
- `static/chat.html` — `#timer-widget` moves inside `.recipe-book`
- `static/styles.css` — timer section rewritten as a cover pill; mobile override replaced; `.prep-step.timer-active`
- `static/timer.js` — `initializeState`, step tracking, `applyStepHighlight`
- `static/chat.js` — passes `parsed.step_number` to `startTimer`
- `static/recipe-display.js` — `renderRecipe` calls `applyStepHighlight` after writing the pages
- `static/app.js` — exposes `window.startTimer` for tests
- `tests/e2e/tests/timer.spec.ts` (new), `tests/chat_test.rs`, `src/mcp/tools.rs` unit tests
- `design-system.md` — Timer Widget component section
