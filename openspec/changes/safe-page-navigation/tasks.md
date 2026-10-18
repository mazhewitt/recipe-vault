## Before you start

This change is implemented **after `steady-cooking-spread`**, on the same branch (`cooking-ux-loop`). The two changes share `styles.css` and `recipe-display.js`, and steady-cooking-spread moves code. File and line references in `design.md` (for example `styles.css:2425-2486`, `page-transitions.js:397-423`, `navigation.js:70/97`, `app.js:49`) were taken before it, so re-grep each one before editing.

E2e facts that apply to every group:
- `make test-e2e` builds the release binary and runs the three Playwright projects: `chromium` (1280x720), `mobile-chrome` (Pixel 5, 393x851, touch), `ipad` (810x1080, touch, Chromium).
- A single spec runs with `cd tests/e2e && npx playwright test tests/<file>.spec.ts`.
- Port 3001 is a singleton. Kill a stale server first (`lsof -tiTCP:3001 -sTCP:LISTEN | xargs kill`), and never run two suites at once, from this session or another agent.
- Guard a breakpoint-specific test with `test.skip(!isPhone(page), …)` or `test.skip(!isTablet(page), …)` from `helpers.ts`. Never use a bare `return`, which reports a pass, and never the `isMobile` fixture, which is true for `ipad` too (`.scratch/e2e-breakpoint-guard-conventions/`).
- Only tests of the resize handler itself may call `setViewportSize` (group 8).
- Seed recipes with an explicit `difficulty`. The prefetch cache serves only recipes whose difficulty is assessed (`fetchAndDisplayRecipe` checks `cached.difficulty != null`).
- There is no JS unit layer, so unit-level checks are `page.evaluate()` assertions.

Each group ends with a gate. A group is done when its gate is green.

## 1. Baseline

- [x] 1.1 Confirm `steady-cooking-spread`'s tasks are complete on this branch and `make lint` and `make test-e2e` are green. Record the pass/skip counts here.
  - Recorded from steady-cooking-spread's own verification on this exact commit (e35a58c), not re-run: `make lint` clean; `make test-e2e` 476 passed, 85 skipped, 0 failed, 0 flaky. Its open tasks are 9.7 (this hand-off) and 9.8 (deployment), neither an implementation step.
- [x] 1.2 Capture "before" numbers on the post-steady build: `tests/usability/run-all.sh before-safe-nav find manage cook`. Use a `PORT_BASE` that avoids 3001. Group 10 compares against this run, not against the 2026-10-17 baseline, because steady-cooking-spread has already moved some numbers.
  - Not re-run: steady-cooking-spread's verification already ran `run-all.sh after-steady-spread` on this exact build (e35a58c). Its `find.txt`, `manage.txt` and `cook.txt` were copied to `tests/usability/runs/before-safe-nav/` and are the "before" numbers (the runs directory is git-ignored, so the copies are local only).

## 2. A swipe must be unmistakably sideways (design N2)

Files: `static/page-transitions.js` (`initSwipeGestures`), `tests/e2e/tests/helpers.ts`, new `tests/e2e/tests/swipe-navigation.spec.ts`.
Satisfies: `swipe-navigation` "Swipe gesture triggers recipe navigation on mobile" (all scenarios) and "Swipe does not conflict with vertical scrolling" (all scenarios).

- [ ] 2.1 Lock rule: the direction stays undecided until `max(|dx|, |dy|) ≥ 30`. At that moment the gesture is horizontal only if `|dx| > 2·|dy|`; otherwise set `tracking = false` for the rest of the gesture. This replaces the 10px lock and `absDy < absDx * 2`.
- [ ] 2.2 Call `preventDefault()` only after a horizontal lock, and only when `e.cancelable`. Before the lock, never call it.
- [ ] 2.3 Release rule: navigate only if, measured from `touchstart`, `|dx| ≥ 0.3 × .pages-container width` **and** `|dy| < |dx| / 2`.
- [ ] 2.4 Momentum: record `performance.now()` on every `scroll` of `#page-left` and `#page-right`. `scroll` does not bubble, so use one capture-phase passive listener on `.pages-container`. A `touchstart` less than 300ms after the last one is ignored for the whole gesture.
- [ ] 2.5 Keep what exists: touches that start on `.recipe-photo` are ignored, the `isMobile()` gate stays, and so does the `animating` check.
- [ ] 2.6 `helpers.ts`: add `touchGesture(page, x0, y0, path)` and `line(n, dx, dy)`. They drive real touches through CDP `Input.dispatchTouchEvent`, as `tests/usability/remeasure/find.cjs` `gesture()` does. Every project runs Chromium, so CDP is available everywhere.
- [ ] 2.7 Tests in `swipe-navigation.spec.ts`. The phone cases are guarded `test.skip(!isPhone(page))`. Seed at least three recipes and open the middle one.
  - Swipe left and swipe right navigate. Assert the new title, and that `html[data-nav-direction]` was observed with the right value (MutationObserver installed before the swipe).
  - A 25% swipe does nothing.
  - The 31° drift does nothing: start at (255, 600), `line(12, -130, -220)`, on the Method tab.
  - Wobble-then-scroll does nothing.
  - Locked horizontal, then drift to dx = -160, dy = -90: no navigation.
  - A tap-sized move (under 30px) does nothing.
  - Momentum: set `#page-right.scrollTop`, swipe within 100ms, and expect no turn. Wait 400ms, swipe again, and expect a turn.
  - Swipe left on the contents opens the first recipe of the full list while a filter is active.
  - Swipe right on the first recipe returns to the contents.
  - Swipe left on the last recipe does nothing.
  - On `ipad` (`test.skip(!isTablet(page))`), a 300px swipe does nothing.
- [ ] 2.8 Red-check: revert 2.1, 2.3 and 2.4 one at a time and confirm the diagonal, drift and momentum tests go red. Restore each revert.
- [ ] 2.9 Gate: `make lint`, `npx playwright test tests/swipe-navigation.spec.ts` (all projects), `make test-e2e`.

## 3. Gutter chevrons replace the invisible edge zones (design N1)

Files: `static/chat.html`, `static/styles.css`, `static/app.js`, `static/navigation.js`. In `styles.css` that means the `.mobile-edge-nav` block, the phone `.recipe-title-row { padding-right: 40px }` rule, the `.mobile-edge-nav` z-index comments, and the phone `.pages-container` margin. In `app.js`, `setupMobileEdgeNavigation` and its call. In `navigation.js`, `updateNavigationState` and the click binding.
Satisfies: `swipe-navigation` "Taps on the page never turn it" (all scenarios); `family-recipe-ui` "Phone gutter chevrons turn the page" (all scenarios).

- [ ] 3.1 Delete both `.mobile-edge-nav` elements, their CSS block and `setupMobileEdgeNavigation`, and remove the `prevEdge`/`nextEdge` handling from `updateNavigationState`.
- [ ] 3.2 Add `<button type="button" id="gutter-prev" class="gutter-chevron prev" aria-label="Previous recipe">` and `#gutter-next` ("Next recipe") at the right-hand end of the phone `.page-tabs` row, after the Notes tab (lead decision Q3; see design.md "Answers from the lead"). They are hidden above 600px and on the contents and meal plans. Reuse the `.edge-chevron` SVGs.
- [ ] 3.3 CSS: hide the chevrons above 600px and whenever `body[data-view-mode]` is not `recipe`. At 600px or narrower in recipe view, position them absolutely in the leather frame at the page's vertical centre, each 44x44.
  - The frame is 4px wide today (`.pages-container { margin: 40px 4px 4px }`), and the page has 16px of padding. A 44px box that ends before `#page-right-content` therefore needs a side frame of at least 28px.
  - Keep that frame width the same on the contents page and the recipe page, so opening a recipe does not resize the paper (steady-cooking-spread's rule).
  - See design Open question 3: if the lead decides differently, follow that.
- [ ] 3.4 `navigation.js`: bind the chevrons next to `initFooterNav` (one guarded binding) to `loadPrevRecipe`/`loadNextRecipe`, ignoring clicks on a disabled chevron. In `updateNavigationState`, set their `disabled` property exactly as for `.footer-prev`/`.footer-next`: previous is enabled on the first recipe and returns to the contents; next is disabled on the last recipe.
- [ ] 3.5 Remove the phone `.recipe-title-row { padding-right: 40px }` rule if steady-cooking-spread has not already replaced the title row. Its only reason was the edge overlay.
- [ ] 3.6 Update the e2e specs that drive the old zones (grep `mobile-edge` under `tests/e2e/tests` again first):
  - `navigation.spec.ts` and `index.spec.ts` `getNavSelectors`: use `#gutter-prev`/`#gutter-next` on the phone, and assert with `toBeDisabled()`/`toBeEnabled()` instead of `toHaveClass(/disabled/)`. On the contents page the phone chevrons are hidden, so the "disabled on the index" assertions become `toBeHidden()` there.
  - `contents-page.spec.ts:135`: use `#gutter-prev` on the phone.
  - `contents-filters.spec.ts:238` taps `#mobile-edge-next` on the contents page. On the phone, use `touchGesture` from group 2 (swipe left) instead, since the chevrons are hidden on the contents page.
- [ ] 3.7 New `tests/e2e/tests/phone-navigation.spec.ts`:
  - No `.mobile-edge-nav`, `#mobile-edge-prev` or `#mobile-edge-next` exists, on every project.
  - Phone:
    - The chevrons are visible `<button>`s, at least 44x44, and centred within 22px of `#page-right`'s vertical centre.
    - At `#page-right` scrolled to top, middle and bottom, neither chevron overlaps `#page-right-content` horizontally, and `elementFromPoint` sampled on a 20px grid over the visible content returns content descendants (allow `#page-margin` where the reply sticky overlays the foot of the page).
    - Tapping the chevrons turns forward and backward, with `data-nav-direction` observed.
    - On the first recipe, previous returns to the contents. On the last recipe, next is visible, disabled and inert.
    - The chevrons are hidden on the contents page and on a meal plan.
    - Tapping the 3rd `.ingredient-qty` 6px inside its left edge keeps the recipe.
    - Tapping the 3rd row's `.index-page-number` opens that row's `data-recipe-id`.
  - `chromium` and `ipad`: the chevrons are hidden.
- [ ] 3.8 Red-check: put the old 60px overlay back and confirm the overlap, the quantity-tap and the page-number tests go red.
- [ ] 3.9 Gate: `make lint`, `npx playwright test tests/phone-navigation.spec.ts tests/navigation.spec.ts tests/index.spec.ts tests/contents-page.spec.ts tests/contents-filters.spec.ts`, `make test-e2e`.

## 4. Each phone tab keeps its own scroll position (design N3)

Files: `static/page-tabs.js`, and `static/recipe-display.js` for the reset on opening a recipe.
Satisfies: `family-recipe-ui` "Phone tabs keep their own scroll position" (all scenarios).

- [ ] 4.1 On the phone, inside `setActiveTab`'s `apply`, record `#page-right.scrollTop` under the outgoing tab before switching. After the new panel is displayed, set the incoming tab's stored value, defaulting to 0. The element that scrolls is `#page-right` (`.page { overflow-y: auto }`), not `#page-right-content` as design N3 says; see design Open question 4.
- [ ] 4.2 Export `resetTabScroll()` and call it on the non-refresh path of `fetchAndDisplayRecipe`, next to `setActiveTab('ingredients', { force: true })`, so a newly opened recipe starts every tab at 0. Revisiting a recipe is a new open and also starts at 0.
- [ ] 4.3 Leave refreshes alone. Steady-cooking-spread D5 already keeps the active tab and scroll positions across a refresh, so the forced `setActiveTab` a refresh makes must not reset the map.
- [ ] 4.4 Tests in `page-tabs.spec.ts` (phone only):
  - A round trip Method → Ingredients → Method keeps `.prep-step[data-step="7"]` within 1px of where it was.
  - Ingredients at 120 and Method at 400 are restored independently.
  - Opening the next recipe starts both Ingredients and Method at `scrollTop` 0.
- [ ] 4.5 Red-check: drop the restore and confirm the round-trip test goes red.
- [ ] 4.6 Gate: `make lint`, `npx playwright test tests/page-tabs.spec.ts`, `make test-e2e`.

## 5. The photo preview works on touch (design N7)

Files: `static/app.js` (the photo handlers in `setupNavigationButtons`).
Satisfies: `family-recipe-ui` "Recipe photo opens full-window preview on click" (all scenarios).

- [ ] 5.1 Delete the `touchstart`/`touchend` photo handlers on `.pages-container`.
- [ ] 5.2 Open the preview on any `click` on `.recipe-photo`, and drop the `e.pointerType === 'mouse'` condition. A tap's click has `pointerType` `touch`, and older iOS Safari click events carry no `pointerType` at all, so that condition is why a tap never opens the preview today.
- [ ] 5.3 Dismissal stays click-only on the overlay (`recipe-display.js` `setupOverlayDismissal`), plus Escape. Keep swipe's `.recipe-photo` exclusion in `page-transitions.js`.
- [ ] 5.4 Tests in `ui-improvements.spec.ts`, on the touch projects only (`test.skip(!isPhone(page) && !isTablet(page))`). Use `locator.tap()`, not `click()`: Playwright's `click()` sends mouse events even on a touch project, which is why the existing test never caught this.
  - Tap the photo: the overlay is `visible`, and still `visible` 500ms later.
  - Tap the overlay: it closes and stays closed 500ms later.
  - A 40px `touchGesture` that starts on the photo opens nothing.
  - The existing click and Escape tests stay as they are.
- [ ] 5.5 Red-check: restore the `touchend` opener and confirm the "still visible 500ms later" test goes red.
- [ ] 5.6 Gate: `make lint`, `npx playwright test tests/ui-improvements.spec.ts`, `make test-e2e`.

## 6. Page turns use the list already held; a refresh keeps the prefetch (design N4)

Files: `static/app.js` (`fetchRecipeList`), `static/page-transitions.js` (new `prunePrefetchCache(ids)`), `static/navigation.js` (`loadNextRecipe`, `loadPrevRecipe`), `static/recipe-display.js` (`fetchAndDisplayRecipe`), `static/chat.js` (turn-end refresh).
Satisfies:
- `recipe-browsing`: "Recipe list is fetched fresh on navigation" (REMOVED), "Navigation uses the recipe list already held" (all scenarios) and "Current recipe ID is tracked".
- `recipe-prefetch`: "Prefetch cache serves navigation requests" (all scenarios) and "Prefetch cache is invalidated on recipe list changes" (all scenarios).
- `recipe-book-index` "Index displays on page load" → "Index fetches fresh data", for page load and the Contents spread tab. The return to the contents lands in group 7.

- [ ] 6.1 `fetchRecipeList(forceRefresh)` stops calling `clearPrefetchCache()`. After a successful response it calls `PageTransitions.prunePrefetchCache(list.map(r => r.id))`, which deletes only entries whose id is no longer listed.
- [ ] 6.2 `loadNextRecipe`/`loadPrevRecipe`: use `await state.fetchRecipeList()`, the held list, which goes to the network only when nothing is held yet. Nothing awaited before `animatePageTurn` may make a request.
- [ ] 6.3 `fetchAndDisplayRecipe`:
  - Check the cache before `showRecipeLoading()`, and show the skeleton only on a miss.
  - Replace the unconditional `fetchRecipeList(true)` after every render (`// Refresh recipe list to include newly created recipes`) with a refresh only when the displayed id is not in the held list. When it does refresh, recompute the page number and the navigation state from the new list.
  - Keep the contents-mode column re-render, drawn from the held list, so the `current` highlight still follows the page (`navigation.spec.ts` "next arrow navigates to next recipe").
- [ ] 6.4 `chat.js`: note `tool_use` events whose tool is `create_recipe` or `delete_recipe` during a turn. On that turn's `done`, refresh the list once and call `state.updateNavigationState()`. If the contents are on screen, re-render them (`state.renderContents()`). `handleRecipeArtifact` keeps its `clearPrefetchCache()`, as the `web-chat` spec requires.
- [ ] 6.5 `renderContents` still refreshes the list each time the contents are shown (the Contents spread tab, filter taps). Because of 6.1 that no longer empties the cache. `refreshDifficultyIfPending`'s refresh likewise stops emptying it.
- [ ] 6.6 Tests in a new `tests/e2e/tests/page-turn-cache.spec.ts`, run on all projects with the next control per viewport (`#page-next`, `.footer-next` or `#gutter-next`). Add a `helpers.ts` `recordRequests(page)` that classifies `/api/recipes` as list and `/api/recipes/:id` as recipe. Before each turn, wait for the prefetch: poll `(await import('/static/page-transitions.js')).getCachedRecipe(nextId)`.
  - A turn makes no list request between the tap and 500ms after `isAnimating()` is false.
  - A cached turn makes no request for the next recipe, and no `.skeleton` is inserted (MutationObserver on `#page-right-content`).
  - With `/api/recipes*` responses delayed 300ms (`page.route`), the next title appears in under 300ms.
  - `fetchRecipeList(true)` keeps both cached neighbours.
  - A cached recipe deleted through the API, followed by `fetchRecipeList(true)`, gives `getCachedRecipe(id) === null` while the other neighbour stays cached.
  - The Contents spread tab (above 600px) and a page load each make exactly one list request.
  - A recipe created through the API after load and then opened refreshes the list once, and `#note-page-number` is correct.
  - A chat turn whose stream contains `tool_use` `delete_recipe` refreshes the list once at `done`. The mock LLM never calls `delete_recipe`, so route `**/api/chat` to a canned SSE body, as `margin-notes.spec.ts:147` does.
- [ ] 6.7 Re-run the specs that hold `/api/recipes` open or count its requests: `spread-modes.spec.ts` "a contents render still in flight…", which must still see a list request from the Contents tab, and anything that seeds recipes after load and then pages to them.
- [ ] 6.8 Red-check: restore the forced refetch in `loadNextRecipe`, and separately the `clearPrefetchCache()` in `fetchRecipeList`. Confirm the no-list-request and keeps-neighbours tests go red.
- [ ] 6.9 Gate: `make lint`, `npx playwright test tests/page-turn-cache.spec.ts tests/navigation.spec.ts tests/spread-modes.spec.ts`, `make test-e2e`.

## 7. Back to the contents is one clean page turn; the header hit area (design N8)

Files:
- `static/navigation.js` (`showIndex` and the header path)
- `static/app.js` (the header listener in `setupNavigationButtons`; `renderContents` split into a synchronous draw from the held list and a refresh that redraws only on change)
- `static/styles.css` (`.section-label`, `#recipe-book-header` on desktop and in the phone block)

Satisfies: `recipe-book-index` "Recipe Book header navigates to index" (all scenarios except the URL clause, which lands in group 9), and "Index displays on page load" → "Index fetches fresh data" (the return to the contents).

- [ ] 7.1 The header click runs `animatePageTurn('backward', () => showIndex())` while a recipe or meal plan is open. On the contents it does nothing: no turn and no request.
- [ ] 7.2 `showIndex` draws the contents synchronously from the held list, inside the render function and in the same task as the spread-mode change. No frame can then show the left page emptied with the recipe re-flowed on the right.
  - After the turn resolves, refresh the list once. Re-render in place only if the ids, titles, order, tags or photos differ, under the existing `spreadGeneration` guard.
  - After steady-cooking-spread D2, re-check what `restoreIngredientsPanel` still does on this path.
- [ ] 7.3 "Previous" from the first recipe (`loadPrevRecipe` → `showIndex` inside a turn) gets the same synchronous draw.
- [ ] 7.4 Header hit area:
  - Desktop: `#recipe-book-header` is `display: block; width: fit-content; margin-inline: auto`, with horizontal padding of at most 22px per side and `min-height: 44px` (vertically centred text).
  - Phone: the same cap and `min-height: 44px`, kept clear of `.page-tabs` and `#page-right-content`. The leather strip is 40px tall and the tabs start about 60px down.
  - At every width, keep the box clear of `#timer-widget`: steady-cooking-spread centres the pill over the spine at the book's top edge, and requires that it never overlap `#recipe-book-header`.
  - The hover style stays.
- [ ] 7.5 Update `spread-modes.spec.ts` "going back to the contents does not overwrite a mode chosen while the list loads". The header now holds the animation lock for the turn. Hold the list refresh with `page.route`, click the header, wait for `isAnimating()` to be false, choose Notes, then release, and keep the assertion that the late refresh cannot overwrite notes mode. Re-run the specs that click `#recipe-book-header` and act straight after (`margin-notes`, `notes-scoping`, `page-tabs`, `responsive`, `ui-improvements`, `contents-filters`). Where they act inside the turn, wait for the lock rather than sleeping.
- [ ] 7.6 New tests, in `ui-improvements.spec.ts` beside the existing header test:
  - Above 600px, `.page-turn-overlay.turn-backward` is observed. On the phone, `html[data-nav-direction="backward"]` is observed.
  - A requestAnimationFrame sampler, with `/api/recipes` delayed 400ms, finds the left page never empty and the right page never holding the ingredients panel, and `.index-title` is present by 150ms.
  - Exactly one list request is made after the turn.
  - A header click on the contents gives no overlay and no request.
  - Hit box: at least 44 tall and at most text width + 44 wide (a `Range` over the header's contents), on every project.
  - A click 60px right of the text keeps the recipe open.
- [ ] 7.7 Red-check: route the header back to the un-animated `showIndex` that awaits the list, and confirm the frame-sampler test goes red. Restore the full-width label and confirm the wood-click test goes red.
- [ ] 7.8 Gate: `make lint`, `npx playwright test tests/ui-improvements.spec.ts tests/spread-modes.spec.ts tests/responsive.spec.ts`, `make test-e2e`.

## 8. Crossing 600px keeps the view (design N6)

Files: `static/app.js` (`setupOrientationChangeHandler`), `static/page-tabs.js` (the per-tab positions from group 4).
Satisfies: `family-recipe-ui` "Crossing the phone breakpoint keeps the view" (all scenarios).

- [ ] 8.1 Replace the `window` `resize` listener with `matchMedia('(max-width: 600px)').addEventListener('change', …)`. A resize that stays in one band does nothing at all.
- [ ] 8.2 Keep the last `#page-right`/`#page-left` `scrollTop` per band, updated on `scroll`. The `change` event fires after the new layout applies, by which time the browser may already have clamped the positions, so reading them in the handler is too late.
- [ ] 8.3 With a recipe open:
  - Crossing above 600px: `setSpreadMode('cook', { force: true })`, which moves the ingredients to the left page, then restore the wide-band `#page-right.scrollTop`.
  - Crossing to 600px or narrower: the ingredients panel goes back to the right page (`renderSpread` with `effectiveSpreadMode()` already does this). Show the tab in `#page-right[data-tab]` at its stored per-tab position.
- [ ] 8.4 With the contents shown: re-render once for the new layout (`renderContents`; its list refresh is allowed, since this is the contents being shown).
- [ ] 8.5 With a meal plan shown: keep it. `spread-modes.js` already refuses `cook` over a meal.
- [ ] 8.6 The `.note-input` being visible after a crossing relies on steady-cooking-spread D1. Assert it; do not re-implement it.
- [ ] 8.7 Tests in a new `tests/e2e/tests/breakpoint.spec.ts`. These test the resize handler itself, so `setViewportSize` is allowed here.
  - `mobile-chrome`: Method tab at 390x844 → 844x390 keeps the recipe, with `cook`, the ingredients on the left and `.note-input` visible. The Method tab scrolled to S comes back to S after a round trip.
  - `chromium`: 1280x800 with `#page-right.scrollTop` 200 → 500x800 → 1280x800 gives 200 ±1 and `cook`. 1280 → 500 keeps the recipe, with one ingredients panel, inside `#page-right-content`.
  - `chromium`: 20 resizes between 900 and 1090px on the contents give 0 list requests and the same `.index-recipe-item` nodes (tag one with a JS property before resizing).
  - `mobile-chrome`: contents with `#page-left.scrollTop` 300, height 844 → 500, keeps 300 ±1 with 0 list requests.
  - `index.spec.ts` "index refreshes on orientation change" and `spread-modes.spec.ts` "narrowing past 600px…" stay green unchanged.
- [ ] 8.8 Red-check: restore the `resize` listener and confirm the in-band and keyboard tests go red.
- [ ] 8.9 Gate: `make lint`, `npx playwright test tests/breakpoint.spec.ts tests/index.spec.ts tests/spread-modes.spec.ts`, `make test-e2e`.

## 9. The open recipe lives in the URL (design N5)

Files:
- `static/navigation.js`: the history writer, the `popstate` handler and the start-up restore. Navigation owns moving between recipes and the contents (`frontend-modules` "Navigation module responsibility"). A new module would need a `frontend-modules` delta, so do not add one.
- `static/recipe-display.js`: reports successful opens and refreshes through a shared-state hook, because importing `navigation.js` would close a cycle. Also the 404 path.
- `static/app.js`: the start-up branch, seeding `viewMode` before first paint, and wiring the hook.
- `static/meal-plan-display.js`, `static/chat.js`, `static/styles.css`.

Satisfies: `recipe-url-state` (all requirements and scenarios); `recipe-book-index` "Index displays on page load" → "Page load with a recipe in the URL"; the URL clause of "Recipe Book header navigates to index".

- [ ] 9.1 History writer in `navigation.js`: `history.pushState({ recipeId, seq }, '', recipeId ? '?recipe=' + encodeURIComponent(recipeId) : location.pathname)`, and the `replaceState` equivalent. `seq` increases with every push, and `popstate` reads it to pick the direction.
- [ ] 9.2 Call sites:
  - A successful open of a different recipe pushes. That covers the contents row, previous/next, a swipe, a chevron and a `recipe_artifact`.
  - A refresh of the same recipe replaces the entry or leaves it alone.
  - `showIndex` from the header or from previous-from-first pushes the bare path.
  - `renderMealPlan` replaces with the bare path.
  - Opens and returns driven by `popstate` write nothing.
  - A failed (non-404) open writes nothing.
- [ ] 9.3 Start-up: `app.js` currently seeds `body[data-view-mode]="index"` at module evaluation, so read `?recipe=` before that.
  - If present: seed `viewMode` as `recipe`, show the skeleton, never call `renderIndex`, `replaceState({ recipeId, seq: 0 })`, and open the recipe with no push.
  - Otherwise: start as today, plus `replaceState({ recipeId: null, seq: 0 })`.
- [ ] 9.4 `popstate`:
  - The direction is `backward` if the new entry's `seq` is lower than the current one, otherwise `forward`.
  - An entry with a `recipeId` gets `animatePageTurn(direction, open that recipe without writing history)`. An entry without one gets the same with `showIndex`.
  - If `isAnimating()`, keep only the latest `popstate` and apply it when the turn ends.
- [ ] 9.5 404: remove the fall-through to `list[0]` in `fetchAndDisplayRecipe`.
  - For opens from the URL, `popstate`, a contents row or previous/next: refresh the list, show the contents and render `.missing-recipe-notice` (`role="status"`, `--color-sticky` background, the exact text "That recipe isn't in the book any more"). Write the bare path: `replaceState` for start-up and `popstate`, a push for the others.
  - Remove the notice when the next page is shown.
  - For a `recipe_artifact` open, keep `web-chat`'s "Recipe not found" on the right page. `chat.js` marks the call so `fetchAndDisplayRecipe` can tell. See design Open question 8.
- [ ] 9.6 E2e reload audit. Once opens push `?recipe=`, a `page.reload()` after an open restores the recipe instead of showing the contents.
  - Change the `openBook` helpers in `contents-page.spec.ts` and `contents-filters.spec.ts` to `page.goto('/chat')`.
  - Review the other `page.reload()` calls (20 today; grep) and keep `reload()` only where restoring the open recipe is the point.
  - Check `responsive.spec.ts` and `ui-improvements.spec.ts` header tests for any history assumption.
- [ ] 9.7 Tests in a new `tests/e2e/tests/url-state.spec.ts`, every scenario of `recipe-url-state`:
  - Push on a contents click, a turn and a `recipe_artifact` (mock "show a recipe").
  - Replace on a photo upload (`history.length` unchanged).
  - Push bare on return, with nothing written on a non-404 failure (`page.route` → 500).
  - Reload restores the recipe, in `cook` above 600px and on Ingredients on the phone.
  - No flash of the contents, via `page.addInitScript` installing a MutationObserver that records any `.index-title` or `body[data-view-mode="index"]` before `.recipe-title` appears.
  - The `current` highlight after a reload and return.
  - `page.request.get('/chat?recipe=<id>')` returns 200.
  - Back and Forward give recipe and contents with the turn direction observed (`.page-turn-overlay.turn-*` above 600px, `data-nav-direction` on the phone) and `history.length` unchanged.
  - Back pressed inside a held turn (`animatePageTurn` with a slow render, as `spread-modes.spec.ts` does) settles on the entry's page.
  - An unknown id on load, a recipe deleted before Back, and a row whose recipe was deleted (not cached) each show the contents with the notice and an empty `location.search`. The notice goes away on the next open.
  - A meal plan replaces the entry, and a reload after it shows the contents.
  - A `/share/<token>` page loads no `/static/app.js` and keeps its URL.
- [ ] 9.8 Red-check: drop the `popstate` listener, the start-up restore and the 404 branch one at a time, and confirm the matching tests go red.
- [ ] 9.9 Gate: `make lint`, `npx playwright test tests/url-state.spec.ts tests/contents-page.spec.ts tests/contents-filters.spec.ts tests/ui-improvements.spec.ts`, `make test-e2e`.

## 10. Verification and hand-off

- [ ] 10.1 `make lint` clean.
- [ ] 10.2 `make test-e2e` green on `chromium`, `mobile-chrome` and `ipad`, after killing any stale 3001 server and with no other suite running. Record the pass/skip counts here.
- [ ] 10.3 Record the red-checks from 2.8, 3.8, 4.5, 5.5, 6.8, 7.7, 8.8 and 9.8 here: each revert, and the tests that went red.
- [ ] 10.4 The remeasure scripts read the removed overlay, so make those checks report the hit element without assuming `#mobile-edge-*` exists:
  - `find.cjs`: `phone-edge-zone-steals-contents-taps`, `phone-edge-zones-cover-recipe-text`
  - `manage.cjs`: `phone-edge-strip-over-content`
  - `cook.cjs`: `phone-edge-nav-covers-content`
- [ ] 10.5 Re-run `tests/usability/run-all.sh after-safe-nav find manage cook` with a `PORT_BASE` away from 3001, and record the before (1.2) and after lines for these ids here. Expected after:
  - Find journey:
    - `phone-edge-zone-steals-contents-taps`: the hit is the row, and it opens Granny's Beef Lasagne.
    - `phone-edge-zones-cover-recipe-text`: 0 step numbers under a navigation control.
    - `phone-diagonal-scroll-turns-page`: all three gestures "stayed".
    - `header-return-intermediate-frame`: `leftEmpty=false`, `recipeWithIngredientsOnRight=false`.
    - `next-waits-for-list-and-ignores-prefetch`: no `list` and no `recipe` request, and the new recipe arrives in under 300ms.
    - `no-history-reload-loses-recipe`: `history.length` grows by one, the URL carries `?recipe=`, and after reload `viewMode=recipe`.
    - `tablet-no-swipe`: unchanged, as a non-goal.
  - Manage journey:
    - `phone-edge-strip-over-content`: the hit is the quantity, and it stays on the Lasagne.
    - `header-full-width-hit-zone`: the hit is at most label + 44 wide and at least 44 tall.
    - `phone-rotate-landscape-loses-input`: `spread=cook`, the note input is shown, and the ingredients are on the left page.
    - `resize-refetch-storm`: 0.
    - `breakpoint-resets-scroll`: 200 → (any) → 200, mode `cook`.
  - Cook journey:
    - `touch-photo-preview-closes-instantly`: `visibleAfter500ms=true` on tablet and phone.
    - `phone-tab-switch-loses-place`: moved 0px (±1).
    - `phone-edge-nav-covers-content` and `phone-diagonal-scroll-swallowed`: clear.
- [ ] 10.6 File the tablet-swipe non-goal from proposal.md as a `.scratch/` issue (`Status: needs-triage`), unless the lead already has.
- [ ] 10.7 Update `design-system.md` for the gutter chevrons and the header's hit area.
- [ ] 10.8 Deployment, not an implementation step. Tag the release and purge the Cloudflare cache. Then confirm `/chat?recipe=<id>` is not cached at the edge (`cf-cache-status` is `DYNAMIC` or `BYPASS`) and that a reload of it opens the recipe (design Risks).
