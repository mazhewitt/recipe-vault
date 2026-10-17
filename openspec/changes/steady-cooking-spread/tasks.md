## How to work through this

Groups run in order; each is one implementer session and ends with the whole suite green. Group 1 writes the layout-stability spec first, and runs it red. Each later group removes the `test.fail` annotation from the cases its change fixes. Playwright errors when a `test.fail` case passes, so an annotation cannot outlive its fix.

The order differs from design.md's decision numbers in one place. D2 (right page fixed) comes after D3 (reply sticky), because the right page can only keep one width across modes once the margin column has left it, and D3 is what moves it.

e2e facts:
- `make test-e2e` builds the release binary and runs Playwright on three projects: chromium (1280x720), mobile-chrome (Pixel 5, 393x851) and ipad (810x1080).
- The web server is a singleton on 127.0.0.1:3001 and is reused if already running. Run `lsof -ti:3001 | xargs kill` before every run, and never run the suite from two agents at once.
- To run one spec file: `cargo build --release && cd tests/e2e && MOCK_LLM=true DATABASE_URL='sqlite::memory:' ANTHROPIC_API_KEY=mock-key DEV_USER_EMAIL=test@example.com npx playwright test <file>`.
- Mock LLM keywords (`src/ai/llm.rs`): "timer" starts a 0.1-minute timer named "Mock timer" on step 2; "halve" or "update" calls `update_recipe` with `servings: 2`; "list" calls `list_recipes`; "show" or "display" calls `display_recipe`; "meal" + "plan" calls `display_meal_plan`. Anything else gets a short reply.
- Breakpoint-inapplicable cases use `test.skip(isPhone(page), …)`, never a bare `return` (see `.scratch/e2e-breakpoint-guard-conventions/`).

Spec references are written as `capability › Requirement › Scenario`.

## 1. Layout-stability harness, written red (`tests/e2e/tests/helpers.ts`, `tests/e2e/tests/layout-stability.spec.ts`, `tests/usability/`)

- [x] 1.1 Confirm that the audit harness in `tests/usability/` reproduces its baseline before anything changes: `tests/usability/run-all.sh pre-steady-spread`. Diff it against `tests/usability/baseline-2026-10-17/`; differences may appear only in the README's "Known noise" lines. The harness uses ports 3011-3015, never 3001, so it can run beside the e2e suite but not beside another audit run.
  - Serves design.md Verification and the "Before / after" table in `audit-summary.md`.
- [x] 1.2 Add `trackAnchors(page, selectors, action)` to `helpers.ts`.
  - It starts a `requestAnimationFrame` sampler in the page that records each selector's `getBoundingClientRect()` and displayed state (non-zero size, not `display: none`, not `visibility: hidden`) on every frame.
  - It then runs `action` and stops 500ms after the last mutation under `.book-container` (watched by a `MutationObserver`, with a 15s cap).
  - It returns per-anchor maximum deviation in x, y, width and height, plus a count of hidden frames.
  - Also add `expectAnchorsStill(result, tolerance = 1)`, whose failure message names the anchor and the delta.
  - Also add `ANCHORS(page)`, the list from family-recipe-ui › Nothing on the page moves unless the cook acted on it, with the mid step M = ceil(steps ÷ 2).
- [x] 1.3 Add `expectHitArea(page, selector)` to `helpers.ts`. For a 5x5 grid over the 44x44px square centred on the control, `document.elementFromPoint` must return the control or a descendant at every grid point inside the viewport (family-recipe-ui › Every control the cook taps has a 44px hit area). Groups 3, 6 and 7 use it.
- [x] 1.4 Add a `createCookingRecipe(page)` fixture to `helpers.ts`.
  - At least 12 ingredients and 9 steps, each step at least two lines long at 1280px, so that the method overflows the right page on every project.
  - Step 2 long enough that the current `.timer-active` padding re-wraps it at every project width.
  - `difficulty` set, so no backfill refresh lands mid-test.
- [x] 1.5 Write `layout-stability.spec.ts` with one test per scenario of family-recipe-ui › Nothing on the page moves unless the cook acted on it:
  - **Opening a recipe:** click an entry on the contents and track `#note-input` and `#message-input`.
  - **Switching spread mode:** Cook → Notes → Contents → Cook. `test.skip(isPhone(page), 'no spread modes at ≤600px')`.
  - **Sending a note:** hold the turn open by routing `**/api/chat` through `route.fetch()` and fulfilling 1.5s later. Track from Enter to the first chunk.
  - **A reply arriving:** fulfil `/api/chat` with a hand-built SSE body whose reply is about 40 lines long, so it reaches the sticky's cap. Copy the SSE body format from margin-notes.spec.ts's "an interrupted stream…" test. Track from the first chunk to `done` + 500ms.
  - **Refreshing the recipe:** scroll `#page-right` so the mid step is in view (on the phone, `openTab(page, 'method')` first), then send "halve it".
  - **A timer starting, ticking and finishing:** send "start a timer" and track through expiry, about 7s.
  - **Ticking an ingredient and marking a step:**
    - Click the centre of the third `.ingredient-item`, then the mid step.
    - On the phone, tap the text centre and never within 60px of the page edge, where `.mobile-edge-nav` lies until safe-page-navigation N1 lands.
    - Also assert `data-ticked="true"` and `aria-current="step"`, so the case is red until the feature exists rather than passing because nothing happened.
- [x] 1.6 Run the spec red on all three projects. Under this task, record each case's failing anchor and delta per project.
  - Annotate each case with `test.fail(<the projects where it failed>, 'fixed in group N (Dx)')`.
  - A case that already passes on a project stays unannotated there and guards against regression from now on.
  - Expected red: opening (D1, wide projects), switching (D2/D3), sending (D4), reply (D3/D4), refreshing (D5), timer (D8), ticking (D10).
  - Recorded red on 9f28329 (deltas in px; all three projects unless named):
    - opening: chromium note-input/message-input dx=590, hidden 3 frames; ipad dx=385, hidden 3 frames; mobile-chrome message-input dwidth=5.5. `failOn(all, group 2 D1)`.
    - switching: chromium recipe-title dwidth=162 dheight=43, mid-step-5 dy=535 dwidth=162; ipad mid-step-5 dy=350; mobile-chrome skipped. `failOn(chromium, ipad, group 4 D2)`.
    - sending: note-input dy=dheight=28 (mobile-chrome 26); message-input dy=1.4 on chromium and ipad. Group 3 (D4).
    - reply: note-input dy=dheight=28 (mobile-chrome 26). Group 3 (D3, D4).
    - refreshing: recipe-title and mid-step-5 dy=252 (ipad 382, mobile-chrome 689), hidden 1 frame; note-input dy=28; message-input dwidth 4-80. Group 5 (D5).
    - timer: mid-step-5 dy=23 (ipad 69, mobile-chrome 79); note-input dy=28; pill drifts 3-4px between ticks. Group 6 (D8).
    - ticking: no anchor moved on the ingredient tap; red because `data-ticked` is never set. Group 8 (D10).
- [x] 1.7 `make lint`, then `make test-e2e` green.

## 2. The slip has one home; the right edge is a ribbon (D1, D11)

- [x] 2.1 `static/styles.css`: move the base `.note-input` rule (≈246-261) to the foot of the left page (`left: 10px; right: calc(50% + 10px)`). Delete the per-mode mirror (≈1959-1963) and the `recipe`/`meal` + `contents` hide (≈1973-1976). Leave the phone block alone.
  - book-spread-modes › The note input has one home › The note input keeps one position, Contents mode keeps the input
  - book-spread-modes › Left page is contextual › No recipe open, Recipe opened
  - book-spread-modes › Meal plans keep the contents spread › Meal plan displayed
  - family-recipe-ui › Main layout displays the recipe book alone › Default desktop layout, Narrow viewport stacks components (the input half)
  - family-recipe-ui › Note input lives in the book › Desktop note input
- [x] 2.2 `static/styles.css`: move the 72px bottom padding (`.page` ≈588, ≈1982-1985) from the right page to the left page's scroll area. Size it from a `--slip-clearance` custom property: the slip's height plus its bottom offset.
  - book-spread-modes › The note input has one home › The left page's last line clears the input
- [x] 2.3 `static/recipe-display.js` `showRecipeError` (≈43): confirm that "Recipe not found" (empty book) and "Failed to load recipe" (5xx) both leave `.note-input` displayed on the left. Leave the 404 fall-through to the first recipe alone: safe-page-navigation N5 owns it.
  - book-spread-modes › The note input has one home › A failed load keeps the input
- [x] 2.4 Make the right-edge strip a ribbon.
  - `static/chat.html`: give each `.edge-tab` `aria-hidden="true"` and `tabindex="-1"`. Above 600px a spread mode always applies, so static attributes are enough, and the phone hides `.edge-tabs` outright.
  - `static/styles.css` (≈1040-1069): add `pointer-events: none` and drop the hover, `.active` and pulled-out styling.
  - Keep `role="tab"`, which `contents-filters.spec.ts:128` counts.
  - family-recipe-ui › Right page edge ribbons (all)
  - book-spread-modes › Cook mode splits the recipe across the spread › Right-edge tabs stay on the edge in cook mode
  - book-spread-modes › Mode changes leave the right page alone › The ribbons stay inert in every mode
- [x] 2.5 Rewrite the e2e assertions of the old contract:
  - `spread-modes.spec.ts`:
    - "contents mode hides the slip, and the Notes tab brings it back" becomes "contents mode keeps the slip where it was": same box, ±1px, in cook, contents and notes.
    - "the contents page keeps its slip and gains a Notes tab": the slip is on the left page with the same box as after opening a recipe.
    - "the right-edge strip stays on the edge in cook mode and offers no Notes tab": assert the ribbon attributes, computed `pointer-events`, `elementFromPoint`, and that a `page.mouse.click` at a ribbon changes nothing.
  - `responsive.spec.ts` "desktop shows the edge tabs, and the slip sits at the foot of the left page": the slip is visible in contents mode; drop the ribbon `active` class assertion.
  - `page-tabs.spec.ts` "desktop: the edge tabs scroll the right page to the section" becomes "desktop: the edge ribbons are inert", per the Migration of family-recipe-ui REMOVED "Right page edge tabs".
  - `page-tabs.spec.ts:330` and any other wide-viewport `openTab(page, 'ingredients'|'method')` caller: the ribbon cannot be clicked any more. Remove those calls, since both sections are on the spread in cook mode.
- [x] 2.6 New cases in `spread-modes.spec.ts`:
  - A 500 on `GET /api/recipes/:id` (via `page.route`) leaves the slip displayed on the left.
  - The left page's last line clears the slip, for the contents, the ingredients and the thread.
  - In `meal-plan-display.spec.ts` "chat message triggers meal plan display via mock LLM", assert the slip is displayed at the same box as on the contents.
- [x] 2.7 `layout-stability.spec.ts`: remove `test.fail` from "Opening a recipe".
- [x] 2.8 `make lint`, then `make test-e2e` green.

## 3. The reply has a home, and a turn keeps the slip still (D3, D4)

The largest group. Checkpoint with a green run of `margin-notes.spec.ts` after 3.4, before starting on the turn.

- [x] 3.1 `static/chat.html`: move `<aside id="page-margin" aria-live="polite">` out of `#page-right`, beside the slip (for example as the sibling just before `form.note-input` in `.book-container`), keeping its id. Remove the `#loading` row from the form.
  - family-recipe-ui › Note input lives in the book › Existing input ids are preserved
- [x] 3.2 `static/styles.css`: restyle `#page-margin` as the sticky.
  - Absolutely positioned with its bottom edge 0-8px above the slip. Above 600px its left and right edges are those of the left page's column; at ≤600px it sits directly above the input bar.
  - `--color-sticky` paper with Kalam in `--color-biro`.
  - `max-height: 40%` of the page it sits on, with `overflow-y: auto`.
  - Not displayed when empty, in `body[data-spread-mode="notes"]`, or while the phone's Notes tab is active.
  - Remove every right-page margin layout: the 150px grid column (≈1747), the cook-mode corner pin (≈1899-1906), the ≤1024px collapse (≈2044-2048), the phone in-flow margin (≈2175-2236) and the contents-page pin (≈1787-1794).
  - Remove the `.loading` row styles (≈275, ≈446-457).
  - web-chat › The latest reply is a sticky note above the input › Above the input on the wide book, Above the input bar on the phone, It looks like a sticky note, Its height is capped, Not shown beside the full thread, Showing it moves nothing
  - web-chat › Notes and replies in the book › Responsive layout with artifact
  - family-recipe-ui › Main layout displays the recipe book alone › Narrow viewport stacks components
- [x] 3.3 `static/margin-notes.js`:
  - `visibleNotes` returns at most one entry: the latest reply or error of `threadForDisplayedRecipe()`, or the transient in-flight line while a turn runs.
  - Keep a per-thread dismissed note id, keyed by recipe id with `null` for the book thread. A newer reply clears it.
  - Render a `.note-dismiss` button (`aria-label="Dismiss note"`) inside the sticky.
  - Use one look in every view: drop the index-only `.sticky-note` class split.
  - Export `setInFlight(text | null)` for the transient line. Have `renderThread` append that line as the last entry of an on-screen `.notes-thread`, without storing it.
  - web-chat › Notes and replies in the book › Reply renders on the sticky, The sticky shows only the latest reply, Reply on the contents page renders as a sticky note
  - web-chat › The latest reply is a sticky note above the input › It can be dismissed, A dismissed reply stays dismissed, The next turn replaces it
  - web-chat › A turn keeps the slip still and the input live › In-flight line while the thread is open
- [x] 3.4 `static/chat.js`:
  - Delete the `Using tool:` status notes (≈237, ≈299), the `Using … ` loading text (≈236, ≈298) and the `Timer set:` notes (≈253-262, ≈290-296).
  - Add an exported pure `statusLabelFor(tool)` with the design D4 table. Check the actual tool names the `search` MCP server (duckduckgo-mcp 2.2.0) exposes; the `fetch`/`search` substring rule should cover them.
  - Replace `setLoading` with `setInFlight('Thinking…')` on send, `setInFlight(statusLabelFor(tool))` on `tool_use`, and `setInFlight(null)` once the first chunk starts the streaming reply, and on `done` or `error`.
  - web-chat › Status lines speak the cook's language (both)
  - web-chat › A turn keeps the slip still and the input live › One in-flight line
  - web-chat › Notes and replies in the book › Display tool use, Display streaming response, Handle errors gracefully, Timer start is confirmed by the pill
  - web-chat › Notes are scoped to the recipe they were written under › Note is stamped at turn start
- [x] 3.5 `static/chat.js`:
  - Never set `input.disabled`, and leave focus where it is.
  - Keep a `turnInFlight` flag: Enter and form submit are no-ops while it is set, and `#send-button` carries `aria-disabled="true"`.
  - Clear the flag on `done`, on `error` and on a failed fetch.
  - web-chat › A turn keeps the slip still and the input live › The textarea stays live, A second send waits for the turn, The slip does not change height
  - family-recipe-ui › Note input lives in the book › Sending a note
- [x] 3.6 `static/app.js` textarea autosize (≈272-279): cap the height at three lines (three times the computed line-height plus vertical padding and borders) and scroll beyond that. Replace the CSS `max-height: 140px` (≈287-293) to match.
  - family-recipe-ui › Note input lives in the book › The textarea grows to three lines
- [x] 3.7 Rewrite the e2e assertions of the old contract:
  - `margin-notes.spec.ts`:
    - "reply renders as a margin note with a recipe open": sticky geometry above the slip.
    - "four replies leave three notes visible" becomes "four replies leave one note on the sticky".
    - "reply on the contents page renders one sticky note": above the slip on the left page; dismissible.
    - "margin re-projects when the view mode changes": no `Using tool` line; one note per view.
    - "an error on the contents page is shown as a sticky note": `data-kind="error"` in leather red.
    - "tablet layout renders the margin beneath the page content" becomes "tablet: the reply sits on the sticky above the slip".
    - "a streaming sticky on the contents page carries the streaming state".
    - "tool_use renders a status line" becomes "tool_use shows a cook-language in-flight line and stores nothing".
    - "halving a recipe…": one reply on the sticky.
    - "a forward page turn does not cover the margin notes" becomes "the reply sticky keeps its box through a page turn".
    - "adding a note does not restart the fade-in…" becomes "a streaming reply's element is reused across chunks, so its fade-in plays once".
    - "an interrupted stream leaves a streaming note…": adapt to one note.
  - `chat.spec.ts` "the "list" reply names the seeded recipe": the in-flight line reads "Looking through the book…", then the reply. Use a delayed route to observe it.
  - `notes-scoping.spec.ts`: no status entries in `threadEntries`. Margin assertions become sticky assertions.
  - `timer.spec.ts` "chat "start a timer" via the mock LLM…": no "Timer set" anywhere; "Setting a timer…" is observed with a delayed route.
  - `page-tabs.spec.ts` "phone: Notes shows the whole thread instead of the margin" and "the contents sticky note survives a visit to the Notes tab": sticky above the input bar, hidden while Notes is active, back afterwards.
  - `responsive.spec.ts` "tablet widths collapse the margin beneath the page content": rewritten like the margin-notes tablet case.
  - Run `image-paste.spec.ts`, `image-upload.spec.ts` and `xss-protection.spec.ts` unchanged; fix only what the `#loading` removal breaks.
- [x] 3.8 New cases, in `margin-notes.spec.ts` or a new `reply-sticky.spec.ts`:
  - Sticky geometry, wide and phone; no intersection with `#page-right`.
  - The 40% cap with internal scroll (long SSE reply).
  - Dismiss with `expectHitArea('#page-margin .note-dismiss')`; the reply stays dismissed across a recipe switch and a mode switch, and a new reply shows again.
  - Hidden in notes mode.
  - In-flight sequence "Thinking…" → label → reply, using a delayed route.
  - In-flight line as the last entry of the notes-mode thread.
  - No plumbing text in `#page-margin`, any `.notes-thread` or `.note-input` after "list", "timer" and "halve" turns.
  - Textarea not disabled and focused during and after a turn.
  - A second Enter makes no second `POST /api/chat` (count requests).
  - `aria-disabled` on send while a turn runs.
  - Three-line textarea cap.
  - `statusLabelFor` table via `page.evaluate`.
- [x] 3.9 `layout-stability.spec.ts`: remove `test.fail` from "Sending a note" and "A reply arriving".
- [x] 3.10 `make lint`, then `make test-e2e` green.

## 4. The right page stays put across modes (D2)

- [x] 4.1 `static/app.js` `renderSpread` (≈551-588) and `restoreIngredientsPanel` (≈497-511): in `notes` and `contents` modes, park the ingredients panel off-screen instead of re-inserting it before the method. Hold the node in a module variable or a hidden holder. `cook` puts the same node back on the left page. At ≤600px it still goes back into `#page-right-content` for the phone tabs.
  - book-spread-modes › Mode changes leave the right page alone (all)
  - book-spread-modes › Cook mode splits the recipe across the spread › Ingredients and method are both visible
  - book-spread-modes › Contents mode is reachable while a recipe is open › Returning the contents to the left page
  - book-spread-modes › Notes mode gives the conversation the left page › Conversation occupies the left page
  - family-recipe-ui › Recipe book displays as open two-page spread with leather cover › Left page shows ingredients, Right page shows preparation steps
- [x] 4.2 `static/styles.css` (≈1915-1922): force the method panel visible on the right page in every spread mode, not only `cook`. Confirm `#page-right-content`'s width is the same in all three modes.
- [x] 4.3 Rewrite the e2e assertions of the old contract:
  - `spread-modes.spec.ts`:
    - "the Contents tab brings the contents back beside the open recipe": the right page keeps title and method, with no ingredients panel and an unchanged box.
    - "notes mode gives the conversation the left page and takes the input with it": no ingredients on the right.
    - "a contents render still in flight cannot take the ingredients off the spread", "going back to the contents does not overwrite a mode chosen while the list loads" and "narrowing past 600px puts the contents back on the page the phone shows": re-check them.
  - `responsive.spec.ts` "desktop shows the edge tabs…": contents mode no longer shows "test ingredient" on the right.
  - Every `useContentsMode` caller that expects ingredients on the right page: `contents-filters.spec.ts:296,312`, `navigation.spec.ts:28,46`, `recipe-display.spec.ts:36,80`, `page-tabs.spec.ts:148,208,329`, `margin-notes.spec.ts`, `ui-improvements.spec.ts:143`.
- [x] 4.4 New cases in `spread-modes.spec.ts`:
  - Switching modes does not touch the right page: the boxes of `.recipe-title`, `.recipe-meta-line` and each `.prep-step`, plus `#page-right.scrollTop`, are equal after each switch.
  - The ingredients are relocated, never duplicated.
- [x] 4.5 `layout-stability.spec.ts`: remove `test.fail` from "Switching spread mode".
- [x] 4.6 `make lint`, then `make test-e2e` green.

## 5. Refreshing the recipe on the page keeps everything in place (D5)

- [ ] 5.1 `static/recipe-display.js` `fetchAndDisplayRecipe` (≈720-735): when `isRefresh`, skip `showRecipeLoading()`. Save `#page-left.scrollTop`, `#page-right.scrollTop` and the active phone tab before `renderRecipe`, and restore them after it, including after `renderSpread` relocates the ingredients panel.
  - family-recipe-ui › Refreshing the open recipe keeps the reader's place › No skeleton on a refresh, Scroll positions are restored, The phone keeps its tab and its place, Opening a different recipe still shows the skeleton
  - book-spread-modes › Cook mode splits the recipe across the spread › Recipe refresh preserves the mode
  - web-chat › Recipe Artifact Event Handling › Parse recipe artifact event
  - web-chat › Notes and replies in the book › Display recipe artifact
- [ ] 5.2 Route the other two refreshes through the same in-place path: `refreshDifficultyIfPending` (≈72-96), and the photo upload re-render in `static/app.js` (≈393-394).
- [ ] 5.3 `static/recipe-display.js` meta line (≈555-625): always emit `.meta-difficulty`, empty when the difficulty is unknown. `static/styles.css`: give it a fixed width that fits the label plus five dots.
  - family-recipe-ui › Recipe metadata displays with icons › The difficulty slot is reserved, Total time is omitted when unavailable
- [ ] 5.4 `static/styles.css`, ≤600px block (≈2077-2082): set `.app-container { width: 100%; }`.
  - family-recipe-ui › Refreshing the open recipe keeps the reader's place › The phone book keeps its width
  - family-recipe-ui › Main layout displays the recipe book alone › Phone layout
- [ ] 5.5 Rewrite the e2e assertions of the old contract:
  - `margin-notes.spec.ts` "halving a recipe re-renders the page…": add no-skeleton and scroll checks.
  - `spread-modes.spec.ts` "a recipe refresh keeps cook mode and the ingredients on the left page": add `scrollTop`.
  - `page-tabs.spec.ts` "a re-render keeps the open tab and refills the thread": add scroll.
  - `contents-page.spec.ts` "meta line formats hours and omits missing values": the line now holds an empty `.meta-difficulty`.
- [ ] 5.6 New cases, in a new `refresh-in-place.spec.ts`:
  - A `MutationObserver` records any `.skeleton` insertion during each trigger:
    - `update_recipe` ("halve it");
    - a photo upload through the add-photo file input (as `contents-page.spec.ts` "entry shows a polaroid thumbnail after a photo upload" does);
    - a late difficulty, by routing the first `GET /api/recipes/:id` to return `difficulty: null` and the poll to return 3. Do not rely on the backend backfill, which races: see `.scratch/recipe-create-spawns-two-racing-writers/`.
  - The phone `.app-container` width on every frame.
  - The skeleton still shows for a different, uncached recipe (delayed route).
  - The difficulty slot keeps the meta line's box when the value lands.
- [ ] 5.7 `layout-stability.spec.ts`: remove `test.fail` from "Refreshing the recipe".
- [ ] 5.8 `make lint`, then `make test-e2e` green.

## 6. A kitchen timer (D6, D7, D8)

- [ ] 6.1 `static/styles.css` timer block (≈148-240):
  - `.timer-widget` at the top centre (`left: 50%; transform: translateX(-50%)`), overhanging the cover's top edge as now.
  - The phone block (≈2116-2133) stays top right of the frame's header bar.
  - `.timer-cancel` gets a 44x44 `::before` hit area; the visual is unchanged.
  - family-recipe-ui › Timer widget displays as fixed speech bubble › Timer renders correctly, Timer does not overlap the user pill, Timer does not overlap the page arrows or the header, Close control is large enough, Compact pill on phone
- [ ] 6.2 `static/timer.js` and `static/chat.html`:
  - Split `#timer-text` into a label span and a time span. The time gets `font-variant-numeric: tabular-nums` and a `ch`-based `min-width`.
  - `#timer-text` keeps the full readable text for tests.
  - `#timer-widget` gets `data-state="running" | "done"`.
  - family-recipe-ui › Timer widget displays as fixed speech bubble › Pill width holds steady while counting
  - cooking-guidance › Frontend timer execution › Timer countdown display
- [ ] 6.3 `static/timer.js` `onTimerComplete` (≈43-64):
  - The finished state is "Done — <label>" in the leather red. Remove the 3s auto-hide (≈58-62). A click anywhere on the pill hides it.
  - Add `playChime()`: three oscillator notes through Web Audio, with no asset.
  - Call `navigator.vibrate?.([200, 100, 200])`.
  - Keep the `Notification`.
  - Add a one-time capture listener for `pointerdown` and `keydown` that creates or resumes the `AudioContext`, with every audio call in `try`/`catch`.
  - `startTimer` replaces a finished pill.
  - Leave `static/app.js:701-704` (the permission request on load) as it is.
  - cooking-guidance › Frontend timer execution › Timer completion notification, The finished state stays until tapped, Audio is unlocked by the first gesture, Single active timer, Timer manual cancellation
  - family-recipe-ui › Timer widget displays as fixed speech bubble › Pill is hidden when no timer runs
- [ ] 6.4 `static/styles.css` `.prep-step.timer-active` (≈217-240):
  - Draw the highlight as a background band plus an inset `box-shadow`, with no margin or padding change.
  - Draw the clock mark and the "timer running" tag absolutely in the left gutter. Pick pseudo-elements that leave one free for group 8's step mark (for example `::before` for the tag and a background image for the clock), or use a child element.
  - cooking-guidance › Frontend timer execution › Step is highlighted while the timer runs
- [ ] 6.5 Rewrite the e2e assertions of the old contract in `timer.spec.ts`:
  - "pill sits on the book cover and highlights the step":
    - Top centre within 1px of the spine on wide projects, and the header bar's top right on the phone.
    - No intersection with `#page-prev`, `#page-next`, `#recipe-book-header` or `.user-info`.
    - `expectHitArea('.timer-cancel')` replaces the 28px check.
  - "replacing a timer moves the highlight and completion clears it": "Done — Done" text, still shown after the old 3s (use `page.clock` to fast-forward 60s, or a real 4s wait if the clock stalls page turns), and a click hides it.
- [ ] 6.6 New cases in `timer.spec.ts`:
  - Step 2's box is identical with and without `.timer-active`, and step 3 does not move.
  - The pill's box is steady across 10 ticks.
  - With the timer running, clicking `#page-next` turns the page.
  - A `page.addInitScript` stub `AudioContext` records three `OscillatorNode.start` calls at completion, and a `navigator.vibrate` spy receives `[200, 100, 200]`.
  - With `AudioContext` deleted, completion still shows "Done — …" and no `pageerror` fires.
- [ ] 6.7 `layout-stability.spec.ts`: remove `test.fail` from "A timer starting, ticking and finishing".
- [ ] 6.8 `make lint`, then `make test-e2e` green.

## 7. Readable and tappable from the counter (D9)

- [ ] 7.1 `static/styles.css`:
  - Above 600px: `.ingredient-item` 18px in cook mode, and `.prep-step .step-text` 18px in every spread mode (design.md open question 2).
  - At ≤600px: 17px for both.
  - `.step-duration` 15px everywhere.
  - Line-height at least 1.6. The contents and Notes keep their sizes.
  - family-recipe-ui › Recipe text is sized for reading from the counter (all)
  - family-recipe-ui › Recipe book displays as open two-page spread with leather cover › Phone shows one page
- [ ] 7.2 `static/styles.css`: give each tapped control a transparent `::before` hit area with negative inset.
  - The controls: `.contents-tab` (filters and spread tabs; extend outward over the leather, not over the text), `.page-nav`, `.share-btn`, `.add-photo-btn`, `.note-send`, `.clipboard-button`, `.footer-prev` and `.footer-next`.
  - Make send and attach 44px at every breakpoint (≈319-323, ≈358-362).
  - Each parent needs `position: relative`; no ancestor's `overflow: hidden` may clip the `::before`.
  - family-recipe-ui › Every control the cook taps has a 44px hit area (all)
- [ ] 7.3 `static/recipe-display.js` `renderRecipe` title row (≈629-669):
  - Move `.share-btn` and `.add-photo-btn` to the end of `.recipe-meta-line`, as 44px icon buttons.
  - Float the polaroid right inside the title block so that the title wraps by words around it.
  - Re-check the phone's `padding-right: 40px` on the title row (≈2414-2421).
  - Re-anchor the share toast (`static/app.js` ≈434-437, `styles.css` ≈738-751) to the button. The rest of the share flow is `scratch:share-flow`.
  - Confirm the delegated share and photo handlers in `app.js` still bind.
  - family-recipe-ui › Recipe book displays as open two-page spread with leather cover › The title takes the width of the page
  - family-recipe-ui › Recipe metadata displays with icons › Share and photo end the meta line, Time values display with clock icons
- [ ] 7.4 `static/styles.css`, phone block (≈2138-2147): hide `.user-info` unless `body[data-view-mode="index"]`.
  - web-chat › Logout UI › Logout button displayed, Logout stays off the phone's cooking screens
- [ ] 7.5 Rewrite the e2e assertions of the old contract:
  - `contents-page.spec.ts` "serif body, red step numbers and a single meta line": add sizes and the new meta order.
  - `contents-filters.spec.ts` "…chips follow the difficulty dots": still holds; share and photo come after the chips.
  - `ui-improvements.spec.ts` "should not show photo upload/delete controls": the polaroid is still in `.recipe-polaroid` on the right page.
  - `image-upload.spec.ts` and `contents-page.spec.ts` "entry shows a polaroid thumbnail after a photo upload": `.add-photo-btn` has moved.
  - `responsive.spec.ts`: the phone user chip is visible on the contents and hidden on a recipe.
- [ ] 7.6 New cases, in a new `counter-readability.spec.ts`:
  - `expectHitArea` for every control in 7.2 that is displayed at each project.
  - Computed font sizes at each project.
  - "Granny's Beef Lasagne" with a photo (upload `RED_DOT_JPEG` as `ui-improvements.spec.ts` does) renders in at most two lines at each project.
  - Share and photo are the last two meta items, with 44px boxes.
- [ ] 7.7 `make lint`, then `make test-e2e` green, with `layout-stability.spec.ts` still green after the size changes.

## 8. Keeping your place (D10)

- [ ] 8.0 Add `specs/frontend-modules/spec.md` (MODIFIED, following the current `openspec/specs/frontend-modules/spec.md`) so the module list includes `place-keeping.js` and its responsibility (lead answer Q5). Re-run `openspec validate steady-cooking-spread --strict`.
- [ ] 8.1 New `static/place-keeping.js`, initialised from `app.js`:
  - `applyPlace(recipeId)` is called after every `renderRecipe`, refreshes included.
  - One delegated `click` listener on `#page-left-content` and `#page-right-content` handles `.ingredient-item` and `.prep-step`. It ignores clicks inside buttons and links, and ignores everything while `isAnimating()`.
  - State lives in `sessionStorage['rv-place:<id>']` as `{ ticked: [index…], step: n | null }`, every access in `try`/`catch`.
  - A `.clear-ticks` control sits in the ingredients `.section-header`.
  - Never use `touchstart`.
  - `static/recipe-display.js` `renderIngredients` (≈496-531): give each `.ingredient-item` a stable `data-index` if it has none.
  - cooking-guidance › The cook can keep their place in a recipe (all)
- [ ] 8.2 `static/styles.css`:
  - `.ingredient-item[data-ticked="true"]`: line-through, faded, and a pencil tick drawn absolutely in the margin.
  - `.prep-step[aria-current="step"]`: a pencil bracket drawn absolutely in the left margin, on a pseudo-element group 6 left free.
  - Neither may change the box.
  - Give `.clear-ticks` a line-height that cannot grow the header.
- [ ] 8.3 Wake lock, in `place-keeping.js` or a small `wake-lock` section of it:
  - Acquire on recipe and meal-plan display: at the end of `fetchAndDisplayRecipe` and in the meal-plan display path.
  - Keep it while paging.
  - Release in `Navigation.showIndex`.
  - Re-acquire on `visibilitychange` to visible.
  - Feature-detect, and swallow rejections.
  - cooking-guidance › The screen stays awake while cooking (all)
- [ ] 8.4 `place-keeping.js` is a new module. frontend-modules › ES Module Structure › Module files exist lists every module. See design.md open question 5: the lead decides whether this change adds a frontend-modules delta.
- [ ] 8.5 New cases, in a new `place-keeping.spec.ts`:
  - Tick and untick, with the box unchanged.
  - One step mark, cleared by tapping it again and moved by tapping another step.
  - The mark and the timer highlight coexist (`startTimer(1, 'x', 2)` plus a click on step 2).
  - Persistence across next and previous, and across reload plus reopen.
  - Ticks are per recipe.
  - Clear ticks: the control appears, the header keeps its height, the ticks and the mark go, and the storage key is removed.
  - A touch drag that starts on an item ticks nothing. Use CDP `Input.dispatchTouchEvent`, as `drag()` in `tests/usability/remeasure/cook.cjs` does, on mobile-chrome and ipad.
  - A click during a page turn is ignored: click next, then click an item at once.
  - The phone tabs work too.
- [ ] 8.6 New wake-lock cases in `place-keeping.spec.ts`:
  - Use a `page.addInitScript` stub of `navigator.wakeLock` that counts requests and releases.
  - One request on open, no new request on next, a release on the header return.
  - Another request after dispatching `visibilitychange` with `document.visibilityState` stubbed to `visible`.
  - With `navigator.wakeLock` deleted, no `pageerror` and no console error.
- [ ] 8.7 `layout-stability.spec.ts`: remove `test.fail` from "Ticking an ingredient and marking a step".
- [ ] 8.8 `make lint`, then `make test-e2e` green.

## 9. Verification and documentation

- [ ] 9.1 `grep -n "test.fail\|test.fixme" tests/e2e/tests/layout-stability.spec.ts` returns nothing. Every case runs on every project, except "Switching spread mode" on the phone, which is skipped with a reason.
- [ ] 9.2 Revert-and-fail, as in book-spread-modes task 9.5. Revert each line below, name the test that goes red, then restore it and confirm the tree is byte-identical:
  - the contents-mode slip hide
  - ribbon `pointer-events`
  - the sticky's position
  - `statusLabelFor`
  - `input.disabled`
  - the refresh skeleton
  - `.app-container` width
  - the timer auto-hide
  - `.timer-active` padding
  - one `::before` hit area
  - the place-keeping click handler
  - the wake-lock request
- [ ] 9.3 `make lint`, then `lsof -ti:3001 | xargs kill`, then `make test-e2e` green on chromium, mobile-chrome and ipad. One agent owns the suite.
- [ ] 9.4 Run `tests/usability/run-all.sh after-steady-spread`. It diffs against `baseline-2026-10-17/`, and its output goes to the gitignored `tests/usability/runs/after-steady-spread/`. Fill the "after" column of `audit-summary.md` "Before / after":
  - Rows covered by D1-D11 get the new number.
  - Rows covered by N1-N8 get `n/a (safe-page-navigation N…)`.
  - Rows covered by `scratch:` get `n/a (scratch:<slug>)`.
  - A check that prints `ERROR` usually relies on a selector this change renamed or removed (`#loading`, `.sticky-note`, the right-page margin column, the 28px `.timer-cancel`). Fix the check in `tests/usability/remeasure/`, record that in the table, and do not read the old number as a pass.
- [ ] 9.5 `design-system.md`: update every place that describes the old layout:
  - the Spread Modes table (≈181-185)
  - the breakpoint table (≈158-159)
  - the right-page grid paragraph (≈241)
  - z-index rows (≈249-252)
  - the tablet (≈270-276) and phone (≈325, ≈332) margin rows
  - the type tables (≈95-118)
  - the timer pill position
  - Also add a section on the reply sticky, the in-flight line, ribbons, hit areas and place keeping.
- [ ] 9.6 `planned-ideas/ui-v2-journal/README.md`: note that the interaction model's "keep the last two or three notes visible" (≈120) became one sticky above the input, and that timers now chime and persist.
- [ ] 9.7 Hand-off to `safe-page-navigation`:
  - Its spec deltas must be written against this change's versions of family-recipe-ui "Phone page tabs" and "Recipe book displays as open two-page spread with leather cover", and web-chat "Recipe Artifact Event Handling".
  - Archive this change first.
  - Its N1 removes `.mobile-edge-nav`, after which `layout-stability.spec.ts` and `place-keeping.spec.ts` can tap anywhere on a phone line.
- [ ] 9.8 Deployment is not an implementation step. This change touches static assets only: tag a release and purge the Cloudflare cache (CLAUDE.md).
