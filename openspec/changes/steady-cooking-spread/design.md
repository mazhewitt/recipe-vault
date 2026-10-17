## Context

Evidence for every claim here is in the audit output:
- `audit/all-findings.json`: 98 findings, each with probe numbers, screenshots and file:line causes.
- The five `remeasure.cjs` scripts, which re-run the measurements.

Both live under the session scratchpad and are summarised in `audit-summary.md`, next to this file. The probe samples `getBoundingClientRect` of about 20 anchors on every animation frame during and after an interaction, and also collects `PerformanceObserver('layout-shift')` entries. A "jump" below means an anchor's rect changed without the cook asking for that element to change.

book-spread-modes R1 (manual testing, 2026-09-09) set the principle that a control must not move under the cursor. It applied the principle to one transition: focusing the input. This change applies it to all of them.

## Decisions

### D1. The slip lives at the foot of the left page, always (extends R1, supersedes R2's last paragraph)

R1 put the slip at the foot of the left page in `cook` and `notes`, hid it in `contents` mode with a recipe open, and left it on the right page on the contents page proper. That set produced the three slip jumps the audit measured: contents→recipe (385-590px), recipe→contents mode (hidden), and meal plan (hidden).

Every state above 600px now puts the slip at the foot of the left page: the contents page, the three modes, a meal plan, and the fallback after a failed load. It is never hidden. The left page's scroll area gets matching bottom padding, so its last line is never under the slip. Padding at the bottom moves nothing above it.

R2's reason for the right-page position ("that state has no Contents tab to come back from") was about getting the slip back after hiding it. With the slip never hidden, the reason is gone.

### D2. With a recipe open, the right page is fixed: title, meta, method

Today the right page shows the method only in `cook`, and the whole recipe (ingredients first) in `notes` and `contents`. The method being read therefore drops 195-600px on every mode switch.

From now on, while a recipe is open above 600px:
- The right page holds title, meta and method in every mode.
- The left page holds ingredients (`cook`), the conversation (`notes`) or the contents (`contents`).
- A mode switch changes the left page only.

The ingredients panel is still relocated rather than duplicated (book-spread-modes decision 2). It simply stays out of the right page in `notes` and `contents` too.

In those two modes the ingredients are not on screen. That is accepted: the Cook tab is one tap away and restores them, and the right page never moved.

### D3. The latest reply is a sticky note above the slip (supersedes R4)

R4 pinned the cook-mode reply to the top corner of the method page. In practice the reply has no background there, is printed over the title, is clipped, and blocks share and photo. That is the audit's only blocker.

The reply now appears as a single sticky note directly above the slip, inside the same left-page column:
- It is note-paper styled, in the Journal 2.0 vocabulary: blue handwriting on a yellow sticky.
- Its height is capped at 40% of the page, with internal scroll.
- It has a 44px ✕.
- It is absolutely positioned, so it overlays the foot of the left page and never moves layout.
- It shows the latest assistant reply of the current recipe's thread (the notes-scoping rules are unchanged).

Rules for when it is shown:
- It appears when a reply starts streaming. It is replaced by the next turn and removed by ✕.
- A dismissed reply stays dismissed for that recipe until a new reply arrives.
- In `notes` mode the sticky is not shown, because the full thread is on the same page directly above the slip.

On the phone the same element sits directly above the input bar as an overlay, so the reply is where the cook is looking. The old below-the-recipe margin column on the phone goes. The Notes tab still holds the full thread.

`#page-margin` keeps its id, because it is the region the e2e suite and `margin-notes.js` write into. It is restyled as this sticky and moved in the DOM into the slip's column. It stops being a right-page column.

### D4. Status and "Thinking…" render in the sticky's slot, in cook language

The loading row currently sits inside the slip and grows it by 28px. Status lines are separate notes ("Using tool: start_timer"). Instead:
- While a turn runs, the sticky slot shows one line: "Thinking…", then a friendly label per tool, then the reply text as it streams.
- The tool labels: `start_timer` "Setting a timer…", `display_recipe` "Opening the recipe…", `update_recipe` "Updating the recipe…", `create_recipe` "Writing it into the book…", `list_recipes` / `get_recipe` "Looking through the book…", `display_meal_plan` "Laying out the meal…", web fetch and search "Looking it up…", anything else "Working on it…".
- Status lines are no longer stored as thread entries, so they no longer use up the three-note margin budget.
- The slip itself never changes height while a turn runs.
- The textarea stays enabled and keeps focus. Send and Enter are inert until the turn ends, so a turn cannot be double-sent.
- The textarea grows to at most three lines and then scrolls.

### D5. Refreshing the recipe on the page keeps everything in place

`renderRecipe(…, { isRefresh })` already exists. On a refresh of the recipe already displayed:
- No skeleton.
- The scroll positions of both pages and the active phone tab are saved before the swap and restored after it.
- `.app-container` gets `width: 100%` at ≤600px, so the book cannot change width when its content changes.
- The difficulty dots get a reserved, fixed-width slot in the meta line, so they can arrive late without reflowing it.

### D6. The timer pill is clipped to the top centre of the book

The top-right corner is claimed by both the timer pill (family-recipe-ui "Timer widget…") and the forward arrow (family-recipe-ui "Right page displays forward navigation arrow"), and the audit measured the collision.

The pill moves to the top edge of the book, centred over the spine. It can never meet a page arrow or the user chip, and it sits where the eye already goes.
- On the phone it stays in the book's header bar, top right, which has no arrow.
- The user chip leaves the phone's cooking screens (D9).
- The ✕ becomes a 44x44 target.
- The pill's width is fixed per state (`ch`-based minimum plus tabular numerals), so it stops wobbling on every tick.

### D7. Timer completion is persistent and audible

At zero:
- The pill switches to "Done — <label>" in the leather red and stays until tapped.
- A three-note chime plays through Web Audio, generated from an oscillator so there is no asset to load.
- `navigator.vibrate([200,100,200])` fires where it exists.
- The existing `Notification` is still shown when permission was granted.

The step highlight is removed at zero, as the spec already says. This satisfies the existing cooking-guidance scenario "plays completion alert", which the code never implemented.

The `AudioContext` is created or resumed on the first user gesture in the page (any tap or keypress). Browsers refuse audio otherwise. If audio is unavailable, completion still shows visually.

### D8. The step highlight is drawn without changing the step's box

The current `.timer-active` style adds padding, a border and a label line, which makes the step 23px taller. The highlight becomes:
- a background band and an inset box-shadow, plus a left-margin clock mark;
- an absolutely positioned "timer running" tag in the step's left gutter, so it adds no line.

A step's `getBoundingClientRect()` must be identical with and without the highlight.

### D9. Readable and tappable from the counter

**Text.** In cook mode (and on the phone recipe page):
- Ingredient and step text: 18px on tablet and desktop, 17px on the phone.
- Durations: 15px.
- Line-height stays generous.
- The contents page and Notes keep their sizes.

**Hit areas.** Every control the cook taps gets a hit area of at least 44x44px, using a transparent `::before` where the visual should stay small, so the leather edge tabs keep their look:
- spread tabs and edge tabs
- page arrows
- share and photo
- timer ✕, send, attach
- the reply ✕
- the phone footer links

**Title row.**
- Share and photo move out of the title row to the end of the meta line, as 44px icon buttons.
- The polaroid floats right of the title, and the title takes the rest of the width.
- Long titles wrap by words, not one word per line.

**The user chip** (email · Logout) on the phone shows only on the contents page. While cooking it is 70px of chrome, and its Logout sat 16-23px above the timer ✕. Tablet and desktop keep it above the book.

### D10. Keeping your place

- **Wake lock.** `navigator.wakeLock.request('screen')` is held while a recipe or meal plan is displayed. It is released on the contents page, re-acquired on `visibilitychange` back to visible, and silently skipped where it is unsupported.
- **Ingredient ticks.** Tapping an ingredient line toggles a tick: struck through, faded, and a small pencil tick in the margin. Line height and width are unchanged.
- **Current step.** Tapping a method step marks it as "you are here": a pencil bracket in the left margin, with no size change. Only one step at a time; tapping it again clears it. This is separate from the timer highlight and can coexist with it.
- **Memory.** Both are held per recipe id in `sessionStorage` (`rv-place:<id>`). They survive reload and paging away and back, and are cleared by a "Clear ticks" link in the ingredients header when any are set.
- **Taps, not touches.** Ticks and marks use `click`, never `touchstart`, so a scroll that starts on a line does not tick it.
- **Inert while turning.** Both are ignored while a page-turn animation runs.

### D11. The right-edge strip is a ribbon in cook mode (amends R3)

R3 keeps the strip so the book does not look as if it has a missing page. In cook mode its buttons now:
- get `aria-hidden="true"` and `tabindex="-1"`;
- get `pointer-events: none` and lose their hover and pressed styling.

It reads as bookmark ribbons, not controls. In `notes` and `contents` modes the right page is fixed too (D2), so the strip is a ribbon there as well. It is a functioning tablist only when no spread mode applies, which today means never above 600px. The phone's `.page-tabs` are unaffected.

## Risks

- **Existing e2e assertions encode the old positions.** These are rewritten to the new contract, not deleted. Each rewritten assertion states the new rule:
  - `spread-modes.spec.ts`: the slip's position per mode, whole recipe on the right in notes.
  - `margin-notes.spec.ts`: the margin column, the three-note budget including status lines.
  - `timer.spec.ts`: the pill corner, "Done" disappearing.
  - `ui-improvements.spec.ts`
- **Tablet portrait width.** At 810px each page is about 360px. 18px Libre Baskerville gives about 34 characters per line in the method, which is acceptable for a recipe; the audit's screenshots show the method page 30-70% empty.
- **Web Audio autoplay rules.** Covered by unlocking on the first gesture (D7). The visual "Done" never depends on audio.
- **Wake lock on iOS Safari.** Supported since iOS 16.4. Older devices simply sleep as before.

## Verification

- Unit-level behaviour stays in Playwright, as the repo has no JS unit layer.
- A new `layout-stability.spec.ts` runs at each project (chromium, mobile-chrome, ipad) and asserts zero movement of the anchors that must not move:
  - slip and textarea
  - right page content top
  - a mid-method step
  - the next arrow
  - the timer pill

  It covers: opening a recipe, each spread-mode switch, sending a note, a reply arriving, `update_recipe`, timer start, tick and expiry, ticking an ingredient and marking a step. The tolerance is 1px.
- The audit's five `remeasure.cjs` scripts are re-run before and after, and the before/after table goes in `audit-summary.md`.

## Open questions for the lead

The spec deltas assume the reading given after each question. Tasks reference these questions by number.

1. **When is the sticky shown (D3)?**
   - D3 says the sticky "appears when a reply starts streaming" and also that it "shows the latest assistant reply of the current recipe's thread". The specs read it as a projection of the displayed thread: returning to a recipe shows that recipe's latest reply again, unless it was dismissed.
   - D3 does not name the contents page. The specs make the contents-page sticky the same element above the slip, which also fixes `sticky-covers-contents`.
   - Errors also show on the sticky, in leather red, as they did in the margin.
2. **Text size in notes and contents modes (D9 against D2).** D9 sets 18px "in cook mode". But D2 keeps the right page identical in every mode, and the Verification requires a mid-method step not to move on a mode switch. The specs therefore make `.step-text` 18px in every spread mode while a recipe is open. Ingredients are only on screen in cook mode anyway.
3. **A turn that opens another page (D3 against unchanged notes scoping).**
   - Ask "show me…" from the contents: the reply is filed on the book thread, so the sticky on the opened recipe stays empty and the reply streams where it cannot be seen. "Plan a meal" from a recipe is the same in reverse. This is `reply-filed-out-of-sight`.
   - The specs follow "notes-scoping rules are unchanged", and filed the finding as `scratch:notes-thread-gaps`. The transient in-flight line is not a thread entry, so it stays visible throughout.
   - Suggested: show the in-flight turn's streaming reply on the sticky whichever page is displayed, while still filing it under the turn's recipe.
4. **The in-flight line in notes mode (D3 against D4).** D4 puts "Thinking…" and the tool labels in the sticky's slot, but D3 hides the sticky in `notes` mode. The specs show the in-flight line as the last, unstored entry of the visible `.notes-thread` instead, and do the same on the phone's Notes tab.
5. **`place-keeping.js` and frontend-modules (D10).** frontend-modules "ES Module Structure › Module files exist" lists every module, so the new module makes it stale. The brief limited the deltas to four capabilities. A frontend-modules delta, and an entry in the proposal's capability list, would be needed. Not added.
6. **Edge tabs in the hit-area list (D9 against D11).** D9 lists the edge tabs among the 44px targets. D11 makes them inert ribbons (`pointer-events: none`) in every state above 600px. The specs exempt them while they take no input.

## Answers from the lead (2026-10-17)

- **Q1:** agreed. The sticky shows the displayed recipe's latest reply unless it has been dismissed. The contents page uses the same element, and errors show there too.
- **Q2:** agreed. The method is 18px in every mode, so a mode switch cannot reflow it (D2 wins over D9's wording).
- **Q3:** filed. That is correct.
- **Q4:** agreed. In notes mode the in-flight line is the last, unstored entry of the visible thread.
- **Q5:** add a `frontend-modules` delta for `place-keeping.js` in group 8 (task 8.0).
- **Q6:** agreed. The ribbons are exempt from the 44px rule because they are not controls.

Archive this change before `safe-page-navigation`. Its family-recipe-ui deltas only ADD requirements, apart from the photo preview, which this change does not touch.
