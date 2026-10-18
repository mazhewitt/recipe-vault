## Before you start

Groups 1, 2 and 3 are independent and can be taken by three implementers in parallel, one group each, on branch `glanceable-cooking` (from `e35a58c`). Group 4 runs after all three have landed. Each implementation task names the files to touch, the test to write first and a red-check: the edit to revert, or the state of the tree, under which the new test must fail. Line numbers below are from `e35a58c`: re-grep before editing, because the other groups are editing the same files.

Spec references are written as `capability › Requirement › Scenario`, for this change's deltas under `specs/`.

e2e in this worktree runs on port 3002, never 3001 (3001 belongs to the `safe-page-navigation` workflow's suite, which may be running at the same time):
- Full suite: `lsof -tiTCP:3002 -sTCP:LISTEN | xargs kill; cd /Users/mazhewitt/projects/recipe-vault-glance && cargo build --release && cd tests/e2e && npx playwright test -c playwright.3002.config.ts`. This is this worktree's `make test-e2e`.
- One spec: `cd /Users/mazhewitt/projects/recipe-vault-glance/tests/e2e && npx playwright test -c playwright.3002.config.ts tests/<file>.spec.ts`.
- Lint: `cd /Users/mazhewitt/projects/recipe-vault-glance && make lint`.
- `tests/e2e/playwright.3002.config.ts` (a copy of `playwright.config.ts` with the port changed) and the `tests/e2e/node_modules` symlink are untracked and are never committed.
- If a test fails in a timing-looking way, re-run that spec alone before investigating, and record both runs.
- The three projects are chromium (1280×720), mobile-chrome (Pixel 5, 393×851) and ipad (810×1080).

Breakpoint guards: use `isPhone(page)` and `isTablet(page)` from `tests/e2e/tests/helpers.ts` (≈172-183) with `test.skip(isPhone(page), '<reason>')`, never a bare `return` (`.scratch/e2e-breakpoint-guard-conventions/`). The layout-stability helpers are `trackAnchors`, `expectAnchorsStill`, `ANCHORS` and `expectHitArea` (≈293-500), and the fixture is `createCookingRecipe` (≈503). Mock LLM keywords are listed in `openspec/changes/steady-cooking-spread/tasks.md` "e2e facts".

Timers and chimes: tests count `OscillatorNode.start()` calls with the stub `timer.spec.ts` already installs, and step through the 15-second repeats and the 5-minute stop with Playwright's page clock (`await page.clock.install()` before `page.goto`, then `page.clock.runFor(ms)` or `fastForward`), never with real waits.

Before/after measurement: the three explorer folders `tests/usability/runs/audit-post-steady/{cook,ask,counter}/` (gitignored) are copied into this worktree from `/Users/mazhewitt/projects/recipe-vault-audit`. Each `remeasure.cjs` needs a server from `tests/usability/fresh.sh <port>` on port 3036 only (never 3001, 3011-3015 or 3021-3026), and is re-run fresh for each script because ask and counter halve the lasagne:

```sh
cd /Users/mazhewitt/projects/recipe-vault-glance
tests/usability/fresh.sh 3036 && node tests/usability/runs/audit-post-steady/cook/remeasure.cjs 3036 <check-id>
```

Stop the server you started (`kill $(cat tests/usability/runs/3036/server.pid)`) when done. The "before" numbers are in `cook/remeasure-new-checks.txt` (the new cook checks), `ask/remeasure-new.txt` and `counter/remeasure-extended.txt`; `*/remeasure-now.txt` hold the older checks.

## 1. Nothing covers, nothing moves (G1, G2, G3, G4)

- [x] 1.1 The sticky's foot clearance (G1).
  - Files: `static/margin-notes.js` `placeSticky` (≈255) and the `ResizeObserver` beside it (≈291); `static/styles.css`, the left page's `padding-bottom: var(--slip-clearance)` (≈616) and the phone `#page-right` padding in the ≤600px block.
  - Set `--sticky-clearance` on `.book-container` to the sticky's rendered height plus its gap above the slip, `0px` with no sticky. Add it to the bottom padding of `#page-left` above 600px and `#page-right` at 600px and narrower: `calc(var(--slip-clearance) + var(--sticky-clearance))`.
  - The clearance never shrinks while the view lasts, so a dismissal at scroll end cannot clamp `scrollTop` and move the page. Reset it to `0px` when a different recipe or the contents is drawn, or the spread mode changes. Keep it `0px` in `notes` mode and on the phone Notes tab.
  - Test first, in `tests/e2e/tests/reply-sticky.spec.ts`: one case per scenario of web-chat › The reply sticky never hides the end of the page. Use `createCookingRecipe` (at least 15 ingredients; extend the fixture if needed) and a three-line hand-built SSE reply. Scroll the container to its end, and compare the last `.ingredient-item` / `.index-recipe-item` / `.footer-prev` / `.footer-next` bottom with `#page-margin`'s top. On the phone, call `expectHitArea` on both footer links.
  - In `layout-stability.spec.ts`, add family-recipe-ui › Nothing on the page moves unless the cook acted on it › A reply sticky over a page scrolled to its end, and also assert the container's `scrollTop`.
  - Red-check: on `e35a58c` the last ingredient sits under the sticky on chromium and ipad, and the footer links are blocked on mobile-chrome. Then remove the `--sticky-clearance` term from the padding: the reply-sticky cases go red. Then make the clearance follow the sticky's current height on dismissal: the scroll-at-end case goes red.
- [x] 1.2 The phone book stays put (G2).
  - Files: `static/styles.css`, the phone `.user-info` rules (≈2288 and `body:not([data-view-mode="index"]) .user-info` ≈2302).
  - At ≤600px take `.user-info` out of flow: absolutely positioned in the strip above the book, where it sits now on the contents. If it then overlaps a control on the contents page, keep its slot with `visibility: hidden` instead of `display: none`.
  - Add `.book-container` to `ANCHORS(page)` in `helpers.ts` when `isPhone(page)`.
  - Test first: in `layout-stability.spec.ts`, assert `.book-container` in "Opening a recipe" on mobile-chrome, and add "Returning to the contents on the phone" (`test.skip(!isPhone(page), 'the chip only hides at ≤600px')`). In `responsive.spec.ts`, add web-chat › Logout UI › Hiding the chip on the phone moves nothing, with a `PerformanceObserver` `layout-shift` buffer read after the turns.
  - Red-check: on `e35a58c` `.book-container` moves dy=36 on mobile-chrome (counter `phone-book-jumps-on-open`). Restoring `display: none` turns the case red.
- [x] 1.3 Each spread mode keeps its own left-page scroll (G3).
  - Files: `static/spread-modes.js` `setSpreadMode` (≈81). Save `#page-left.scrollTop` under the outgoing mode before `spreadRenderer(mode)`, and restore the incoming mode's saved value after it, in the same frame. `static/app.js`: reset the saved positions when a recipe or meal plan is opened (`cook` = 0) and on return to the contents page.
  - `static/recipe-display.js` `renderIndex` (≈226): its scroll-the-current-row-into-view runs only when the contents are drawn fresh. Pass an option from the mode switch so a round trip skips it.
  - Do not touch the phone tabs: `safe-page-navigation` N3 owns them.
  - Test first, in `spread-modes.spec.ts` (`test.skip(isPhone(page), 'no spread modes at ≤600px')`): one case per scenario of book-spread-modes › Each spread mode keeps its own left-page scroll. Add a `requestAnimationFrame` sampler for "no frame shows it at another position".
  - Red-check: on `e35a58c` Contents → Cook brings the ingredients back at L=88 (cook `left-scroll-leaks-across-modes`). Deleting the restore line turns the cases red.
- [x] 1.4 The tablet slip has room (G4).
  - Files: `static/styles.css`, `.note-page-number` (≈400). Add a `@media (min-width: 601px) and (max-width: 1024px)` rule with `display: none`. Leave the phone rule (≈2451) alone. If the freed width does not reach the textarea, check the `.note-input` flex rules (≈246-261).
  - Test first, in `responsive.spec.ts` (`test.skip(!isTablet(page), 'tablet band only')`): family-recipe-ui › Note input lives in the book › The tablet slip gives the page number's room to the textarea. On chromium, assert the page number is still shown and reads "p. N" (Page number follows the open page).
  - Red-check: on `e35a58c` the textarea is 148-164px and a 35-character note grows the slip 61 → 75px at 810px. Removing the media rule turns the case red.
- [x] 1.5 `make lint`, then the full suite on port 3002, green.

## 2. A timer for across the kitchen (G5, G6, G7)

- [x] 2.1 The pill's markup and size (G5).
  - Files: `static/chat.html` (≈28-39): split `#timer-text` into `.timer-label` and `.timer-time`, and keep `#timer-text` as their container for existing selectors.
  - `static/timer.js` `setTimerText` and `updateDisplay` (≈151-170): fill the two spans; there is no ":" text node between them. Build the label as cooking-guidance › Frontend timer execution › The pill names its step specifies.
  - `static/styles.css` `.timer-widget` (≈156-225) and the phone block (≈2278): ≥44px tall; time 26px (22px on the phone) with `tabular-nums`; label 16px (14px), ellipsised; one fixed `width` per breakpoint for every state. Keep centre-over-spine and clear of `#page-next`. If 26px reaches `#page-next` at 1080×810, use 24px there and record it.
  - Test first, in `timer.spec.ts`: family-recipe-ui › Timer widget displays as fixed speech bubble › The time is readable across the kitchen, and One width in every state (10:00, the last minute, Done, "Tap again to replace"). Keep every existing pill test green.
  - Red-check: on `e35a58c` the digits are 18px (14px on the phone) and "Simmer:5:00" has a 4px gap. The pill also widens 147 → 166px at Done (cook `timer-done-easy-to-miss`, counter `timer-small-at-distance`). Removing the fixed width turns "One width" red.
- [x] 2.2 An insistent Done (G5).
  - Files: `static/timer.js` `onTimerComplete` (≈115-130) and `playChime` (≈74). Show "Done · <label>". Repeat `playChime` and the vibration every 15s with a `setInterval`, and clear it on a tap on the pill or ✕ (`hideWidget`, `cancelTimer` ≈191), on a new timer and 300s after zero.
  - `static/styles.css`: the done state gets a `--leather` fill, cream text and a `@keyframes` pulse on `opacity`/`box-shadow` only, with `@media (prefers-reduced-motion: reduce) { animation: none }`.
  - Test first, in `timer.spec.ts`, with `page.clock`: cooking-guidance › Frontend timer execution › The chime repeats until acknowledged (oscillator starts at 0, 15, 30s; none after 300s at 600s; none after a tap), and The finished pill pulses without moving (rAF bounding box, plus `page.emulateMedia({ reducedMotion: 'reduce' })` → `animation-name: none`).
  - Red-check: on `e35a58c` 3 notes in 20s after expiry, one chime. Deleting the repeat interval turns the repeat case red. Deleting the 300s stop turns the stop case red.
- [x] 2.3 A step's duration starts its timer (G6).
  - Files: `static/recipe-display.js` (≈603): `<button type="button" class="step-duration" aria-label="Start a N minute timer for step n">N min</button>`. `step.duration_minutes` is an integer in the schema (`src/mcp/tools.rs`), so there is no range to parse.
  - `static/styles.css` `.step-duration` (≈890): reset button styles so the chip and the step's box are unchanged, and add a `::before` 44px hit area as for `.share-btn`.
  - `static/place-keeping.js` click handler (≈106): ignore clicks inside `.step-duration`, so the step mark never toggles.
  - `static/timer.js`: export `startStepTimer(stepNumber, minutes, button)`. It calls `startTimer(minutes, 'Step n', n)` when no timer runs or one is finished. While one runs, it sets `data-confirm` and shows "Tap again to replace" in `.timer-label` for 4s, and a second tap on the same button inside the window replaces the timer. Honour the animation lock.
  - Test first: a new `tests/e2e/tests/duration-timer.spec.ts`, one case per scenario of cooking-guidance › A step's duration starts its timer. Use `page.route('**/api/chat')` to assert no request, `page.clock` for the 4s window, and `expectHitArea(page, '.step-duration')`. In `layout-stability.spec.ts`, add "Starting a timer from a step's duration".
  - Red-check: on `e35a58c` tapping "4 min" sets `aria-current` and starts no timer (cook `duration-chip-no-timer`, counter `duration-chip-toggles-mark`). Removing the `data-confirm` check turns "A running timer is not replaced by one tap" red.
- [x] 2.4 The running pill leads to its step (G7).
  - Files: `static/timer.js`, a click handler on `#timer-widget` that ignores `.timer-cancel` and the done state (D7 dismiss stays). If `activeTimer.recipeId` is displayed, scroll `.prep-step[data-step=n]` into view in `#page-right`, and on the phone switch to the Method tab first through `page-tabs.js`. Otherwise open the recipe the way a contents row does (the `app.js` / `navigation.js` open path), then scroll.
  - Test first, in `timer.spec.ts`: cooking-guidance › The running pill leads to its step, all four scenarios, with `trackAnchors` on `#note-input`, `#message-input` and `#timer-widget` for the same-recipe case.
  - Red-check: on `e35a58c` tapping the pill leaves `scrollTop` 575 → 575 (cook `timer-pill-not-linked`). Removing the handler turns the cases red.
- [x] 2.5 `make lint`, then the full suite on port 3002, green.

## 3. Notes and place marks (G8, G9, G10, G11)

- [x] 3.1 The Notes thread follows the conversation (G8).
  - Files: `static/margin-notes.js` `renderThread` (≈328) and `setInFlight` (≈180). Before each re-render of an on-screen thread, record whether its container (`#page-left` in `notes` mode, `#page-right` on the phone Notes tab) is pinned (within 48px of the bottom). Afterwards scroll to the end if it was pinned, or if the update is the cook's own send.
  - `static/spread-modes.js`: entering `notes` scrolls to the newest entry. This overrides group 1.3's restored `notes` position; agree the order with group 1 when merging, as `notes` restore then newest.
  - On the phone, coexist with `safe-page-navigation` N3: show the newest entry only when an entry was added since the Notes tab was left, or on its first opening for this recipe.
  - Test first, in `margin-notes.spec.ts`: web-chat › The Notes thread follows the conversation, one case per scenario. Seed a thread longer than the page with `paceChat` sends; the "not pinned" case scrolls up 200px, then streams a reply.
  - Red-check: on `e35a58c` the latest reply is hidden after the 3rd and 4th sends (ask `notes-thread-no-autoscroll`). Removing the scroll call turns the cases red.
- [x] 3.2 Place marks you can see (G9).
  - Files: `static/styles.css`. `.prep-step[aria-current="step"]::after` (≈945-966, and the phone ≈2405) becomes a 4px `--leather` bar in the left gutter plus a tinted background. Change no padding, margin or border width. Keep it clear of the `timer-active` tag.
  - Test first, in `place-keeping.spec.ts`: cooking-guidance › The cook can keep their place in a recipe › Marking the current step (pseudo-element width 4px, colour, background differs, box unchanged) and The mark and the timer highlight coexist (bar not under the tag: compare the `::after` rect from `getComputedStyle` with the tag's rect).
  - Red-check: on `e35a58c` the mark is a 2px pencil bracket and the background is unchanged, so the case fails.
- [x] 3.3 Clear ticks only when there are ticks, with undo (G9).
  - Files: `static/place-keeping.js`, the `.clear-ticks` sync (≈73) and click (≈106). Show the control only while at least one tick exists. Clear only ticks, keeping `place.step`. Then show "Undo" for 6s, which restores the cleared set.
  - `static/styles.css` `.clear-ticks` (≈968-985, phone ≈2399): a `::before` 44px hit area, one fixed width for "clear ticks" and "Undo", and no change to the header height.
  - Test first, in `place-keeping.spec.ts`: Clearing the ticks, Clear ticks is hidden while nothing is ticked, and A clear can be undone, with `page.clock` for the 6s and `expectHitArea(page, '.clear-ticks')`. In `layout-stability.spec.ts`, add the Clear/Undo clause of "Ticking an ingredient and marking a step".
  - Red-check: on `e35a58c` the control is 60×14 (15/25 misses), shows with only a mark, and clears the mark (cook `clear-ticks-small-and-destructive`). Restoring the mark clear turns "Clearing the ticks" red.
- [x] 3.4 The send button shows when it cannot send (G10).
  - Files: `static/styles.css`, `.note-send` (≈370-399, ≈1379, phone ≈2441). Add `.note-send[aria-disabled="true"] { opacity: .45; cursor: not-allowed; }`, overriding `:hover` and `:active`. `static/chat.js` `setTurnInFlight` (≈66) already sets the attribute. Confirm it does not auto-send the follow-up.
  - Test first, in `chat.spec.ts`: web-chat › A turn keeps the slip still and the input live › The send button looks unavailable during a turn, and A follow-up typed during a turn is kept, not sent. Hold the turn open by routing `/api/chat` and fulfilling late.
  - Red-check: on `e35a58c` the style during a turn is identical to idle (ask `inflight-send-silent`).
- [x] 3.5 The ribbons are plain ribbons (G11).
  - Files: `static/chat.html` (≈59-61): empty the two `.edge-tab` buttons' text, and drop `aria-selected="true"`. Keep `role="tab"`, `aria-hidden`, `tabindex="-1"` and `data-tab`, which `contents-filters.spec.ts` counts.
  - `static/styles.css` `.edge-tab` (≈1203-1230): one colour for both, with no `active` look. `static/page-tabs.js`: stop toggling `active` and `aria-selected` on `.edge-tab`.
  - Test first, in `page-tabs.spec.ts` "desktop: the edge ribbons are inert": add family-recipe-ui › Right page edge ribbons › Ribbons render on a recipe (empty `innerText`, equal computed styles, no `active`, same rects as on `e35a58c`, measured first).
  - Red-check: on `e35a58c` the ingredients ribbon is `edge-tab active` with a different background (counter `ribbons-look-like-tabs`).
- [x] 3.6 `make lint`, then the full suite on port 3002, green. (Met on the merged branch: lint clean, 862 passed locally and on CI run 39159927535.)

## 4. Verification

- [x] 4.1 After merging groups 1-3 on `glanceable-cooking`, re-run the three explorer scripts on port 3036, each on a fresh server (see "Before you start"). Write the output to `tests/usability/runs/audit-post-steady/{cook,ask,counter}/remeasure-after.txt` and compare it with the "before" files. Record before → after in the commit body for each check:
  - cook: `sticky-hides-last-ingredients`, `left-scroll-leaks-across-modes`, `tablet-note-textarea-narrow`, `timer-pill-text-cramped`, `timer-done-easy-to-miss`, `duration-chip-no-timer`, `clear-ticks-small-and-destructive`, `timer-pill-width-jitter`
  - ask: `sticky-covers-ingredients`, `sticky-covers-contents`, `phone-open-shifts-book`, `slip-textarea-narrow`, `notes-thread-no-autoscroll`, `inflight-send-silent`
  - counter: `sticky-hides-last-ingredients`, `phone-sticky-covers-footer-nav`, `phone-book-jumps-on-open`, `narrow-note-textarea`, `timer-small-at-distance`, `duration-chip-toggles-mark`, `clear-ticks-small-and-clears-mark`, `ribbons-look-like-tabs`
  - Every check that was fixed by steady-cooking-spread must still print its fixed value. A check that prints `ERROR` usually relies on a selector this change altered (`#timer-text`'s children, `span.step-duration`, the ribbon text). Fix the check and say so, rather than reading the error as a pass.
- [x] 4.2 Revert-and-fail. Revert each line below, name the test that goes red, then restore it and confirm `git diff` is byte-identical to before:
  - the `--sticky-clearance` padding term
  - the clearance's no-shrink rule
  - the phone `.user-info` out-of-flow rule
  - the spread-mode scroll restore
  - the tablet `.note-page-number` hide
  - the pill's fixed width
  - the chime repeat interval
  - the 300s stop
  - the `data-confirm` check
  - the place-keeping `.step-duration` exclusion
  - the pill click handler
  - the thread pin check
  - clear-ticks keeping the step
  - the undo restore
  - `.note-send[aria-disabled]` opacity
  - the ribbon `active` removal
- [x] 4.3 `grep -n "test.fail\|test.fixme" tests/e2e/tests/*.spec.ts` lists nothing this change added. `make lint`, then the full suite on port 3002, green on chromium, mobile-chrome and ipad. If a case fails in a timing-looking way, re-run that spec alone and report both runs.
- [x] 4.4 `design-system.md`: update the timer pill (size, the label and time split, fixed width, the Done fill and pulse, the chime repeats), the duration buttons, the step mark and clear ticks with undo, the reply sticky's foot clearance, the dimmed send state, the plain ribbons, the tablet slip without a page number and the phone user chip.
- [x] 4.5 Hand-off to the lead: list the regions of `styles.css`, `chat.html`, `app.js` and `helpers.ts` this change edited, for the merge with `safe-page-navigation` into `cooking-ux-loop`. Archive order: steady-cooking-spread, safe-page-navigation, then this change.
- [x] 4.6 Deployment is not an implementation step. Static assets only: tag a release and purge the Cloudflare cache (CLAUDE.md). Released in v2.10.0 (e898366, 2026-10-18); the owner purged the Cloudflare cache.
