## 1. Rust backend

- [x] 1.1 `src/mcp/tools.rs`: add optional integer `step_number` (minimum 1) to the `start_timer` schema; `handle_start_timer` reads it, rejects 0, echoes it in the result JSON and message; unit tests for with/without/zero step
- [x] 1.2 `src/ai/client.rs`: add `pub struct TimerData { duration_minutes, label, step_number: Option<u32> }`; `execute_tool` returns `Option<TimerData>` parsed from the tool result; `chat` returns `Vec<TimerData>` in place of `Vec<(f64, String)>`
- [x] 1.3 `src/handlers/chat.rs`: `SseEvent::TimerStart` gains `step_number: Option<u32>` (skipped when `None`); emit the event by serialising the variant from each `TimerData`
- [x] 1.4 `src/ai/llm.rs`: `complete_mock` "timer" branch returning a `start_timer` tool call with `step_number: 2`, and a text reply once the tool result comes back
- [x] 1.5 `src/ai/prompts.rs`: guided-cooking item 5 tells the model to pass `step_number` when the wait belongs to a numbered step
- [x] 1.6 `tests/chat_test.rs`: assert a "start a timer" message over the mock provider yields a `timer_start` SSE event whose JSON includes `step_number: 2`, and that an event without a step omits the field

## 2. HTML and CSS

- [x] 2.1 `static/chat.html`: move `#timer-widget` from the top of `<body>` to inside `.recipe-book`, directly after `.book-cover`; keep ids `timer-widget`, `timer-text` and the `timer-cancel` button
- [x] 2.2 `static/styles.css`: rewrite the `TIMER WIDGET` section (144-198) as an absolutely positioned cover pill (`top: -22px; right: 12px; z-index: 3`, cream background, 36px tall); delete the `::before`/`::after` tail rules; `.timer-cancel` 28×28px
- [x] 2.3 `static/styles.css`: remove the tablet timer override (1345-1348) and replace the phone override block (1465-1480) with the compact pill values (`top: -16px; right: 8px; height: 30px`, 14px text, close stays 28px)
- [x] 2.4 `static/styles.css`: add `--color-timer-band` token and `.prep-step.timer-active` (pale band, "timer running" label via `::after`)

## 3. JavaScript

- [x] 3.1 `static/timer.js`: add `initializeState`; `startTimer(durationMinutes, label, stepNumber)` records `{ recipeId: state.currentRecipeId, stepNumber }`; export `applyStepHighlight(recipeId)` and internal `clearStepHighlight()`; call them on start, complete and cancel
- [x] 3.2 `static/chat.js`: pass `parsed.step_number` as the third argument to `state.startTimer` in both the `timer_start` case and the legacy fallback branch
- [x] 3.3 `static/recipe-display.js`: import `applyStepHighlight` from `./timer.js` and call it with the recipe id at the end of `renderRecipe`
- [x] 3.4 `static/app.js`: expose `window.startTimer = Timer.startTimer` next to `window.cancelTimer`

## 4. Tests

- [x] 4.1 New `tests/e2e/tests/timer.spec.ts`: after seeding and opening a recipe, `window.startTimer(1, 'Test', 2)` shows `#timer-widget` inside `.recipe-book`, its bounding box does not intersect `.user-info` and is fully within the viewport, `.prep-step[data-step="2"]` has `timer-active`; navigating to another recipe removes the highlight and navigating back restores it; clicking `.timer-cancel` hides the pill and clears the highlight; on mobile-chrome the pill height is ≤ 30px and the close target is ≥ 28×28
- [x] 4.2 `tests/e2e/tests/timer.spec.ts`: sending "start a timer" through the chat (mock LLM) shows the pill with the label "Mock timer" and highlights step 2
- [x] 4.3 `cargo test`, `make lint`, `make test-e2e` green; `openspec validate journal-timer-cover-pill`

## 5. Documentation

- [x] 5.1 `design-system.md`: rewrite the "Component: Timer Widget" section as the cover pill (position relative to the book cover, sizes per breakpoint, 28px close target, step highlight band)
