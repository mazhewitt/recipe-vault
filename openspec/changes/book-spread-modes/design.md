# Design — contextual left page

## Context

Three modes of use, one layout. The book currently pins the contents to the left page in every state, which is right for exactly one of the three (`recipe-display.js:749` re-renders the index after every recipe open, and `body[data-view-mode="recipe"] #page-right` at `styles.css:1747` gives the recipe the right half minus a 150px margin column).

The design that already exists in the codebase is worth preserving: **each page's outer edge carries the tab strip that controls that page.** `.contents-tabs` on the left edge (`chat.html:71`) controls the left page; `.edge-tabs` on the right edge (`chat.html:59`) controls the right page. This change does not invent a new control — it extends the left strip to offer a different set of tabs when a recipe is open.

## Decisions

### 1. Mode lives on `body[data-spread-mode]`, one source of truth

`contents` | `cook` | `notes`, mirroring the existing `body[data-view-mode]` and `#page-right[data-tab]` pattern. CSS decides what each mode means at each breakpoint; JS only sets the attribute. Below 600px every rule is scoped out, so the phone never sees a mode.

`spread-modes.js` owns the attribute and exports `setSpreadMode(mode)` / `getSpreadMode()`. It must not import `recipe-display.js` (which would close a cycle through `page-tabs.js`), so the re-render on mode change is driven by a callback registered from `app.js` — the same shape `page-tabs.js` already uses for `renderThread`.

### 2. Cook mode splits an already-rendered recipe, it does not re-fetch

`renderRecipe()` emits `.tab-panel[data-tab="ingredients"]` and `.tab-panel[data-tab="method"]` as siblings in `#page-right-content` today. Cook mode moves the ingredients panel into `#page-left-content` rather than re-rendering from the recipe object. That keeps one render path, keeps the timer's step highlight (`applyStepHighlight`) intact, and means a refresh (photo upload, `update_recipe`, difficulty backfill) needs no mode-specific branch.

The move is a DOM relocation on mode change, not a duplicate render — a second copy of the ingredients would break `applyStepHighlight`'s `querySelector` and the ingredient-scaling affordances that come later.

### 3. The note input moves; it is not duplicated

There is exactly one `<form class="note-input">` in `chat.html` and it stays that way. In `contents` and `cook` modes it keeps today's absolute position over the foot of the right page; in `notes` mode CSS repositions it to the foot of the **left** page (`right: calc(50% + 10px)` instead of `left:`). No JS moves it, no second form exists, so the focus handler, the image attachment and the SSE wiring are untouched.

### 4. Notes are tagged at turn start, not at reply time

`chat.js` captures `state.currentRecipeId` when the user sends, and every entry produced by that turn — the user note, status lines, the streaming reply, errors — is stamped with that id. Stamping at *render* time would misfile a reply that lands after the user has paged to another recipe, which is exactly the confusion this change is fixing.

`null` is the book-level thread: notes written while the contents page is open. It is a real bucket, not an absence, and it is what Notes mode shows when no recipe is open.

An entry's `recipeId` is immutable once set. If a turn creates a recipe and then displays it, the turn's notes stay on the book thread — they were written before the recipe existed. The margin note that announces the new recipe is therefore visible on the contents page, which is where the user was standing.

### 5. `Notes` leaves the right-edge strip on desktop only

With Notes promoted to a left-page mode, a `Notes` tab on the right edge would be a second way to reach a different rendering of the same thread. On desktop the right strip becomes Ingredients / Method. On the phone `.page-tabs` keeps all three, because the phone has no left page to promote anything to. `VALID_TABS` in `page-tabs.js` keeps `notes` — the value stays legal, only the desktop affordance goes.

### 6. Implicit transitions, with the tabs as the explicit override

| Trigger | Mode |
|---|---|
| Recipe opened (contents click, `display_recipe`, prev/next, swipe) | `cook` |
| Note input focused | `notes` |
| Left-edge tab clicked | as clicked |
| Back to contents (`navigation.js:123`) | `contents`, and the strip reverts to the filters |

Focus-driven switching is the one that could annoy: a user who taps the input to type "next" mid-cook loses the method page. Mitigated by making the transition reversible at zero cost — the left-edge `Cook` tab is one click away and the recipe is already rendered — and by *not* switching on focus while a timer is running for the open recipe, where the method page is load-bearing.

### 7. Page numbers and the A–Z strip are untouched

Cook mode hides the contents; it does not change it. `pageNumberFor(idx)` still derives from position in the full list, and the filter state (`sessionStorage['rv-contents-filter']`) survives a trip through cook and notes modes, so returning to Contents restores the filtered view the user left.

## Risks

- **Ingredient relocation and page-turn animation.** `page-transitions.js` crossfades `#page-right-content` and animates the spread. Moving a panel between pages during an animation must be blocked by the existing `isAnimating()` lock, as tab switching already is (`page-tabs.js:66`).
- **Tablet at 768px portrait.** The spread is narrow; ingredients-on-left may be cramped. The `ipad` Playwright project covers this and the fallback is to treat tablet portrait as phone-like (one page), which the `ipad` project can assert.
- **Scroll position.** Cook mode gives ingredients and method independent scrolls. A long ingredient list no longer pushes method down, which is the point, but `setActiveTab`'s scroll-to-header behaviour (`page-tabs.js:83`) is meaningless in cook mode and must be skipped there rather than scrolling the wrong page.

## Open questions

- Should Cook mode be *sticky* per session, so a user who prefers Contents-on-the-left gets it on the next recipe too? Proposed: no. Cook is the default every time a recipe opens; the tab is cheap. Revisit if testing says otherwise.
- Meal plans in Notes mode: does a meal plan get its own thread bucket keyed by plan id, or does it fall to the book thread? Proposed: the book thread, until meal plans are persisted (RV-107).

## Revisions during implementation

Recorded after manual testing on 2026-09-09, which found one problem and one
consequence of fixing it. The decisions above are left as written; these
supersede them where they conflict.

### R1. The note input keeps one position; focus selects nothing (supersedes 3 and 6)

Decision 6 made focusing the input select notes mode, and decision 3 gave notes
mode a different position for the input. Together they meant a click on the
input re-laid-out the book **underneath the cursor**: the slip sat at the foot
of the right page, the focus put the spread into notes mode, and the slip jumped
across the spine to the left as it was being clicked.

The slip now has one position in every mode that shows it — the foot of the left
page, in both `cook` and `notes` — and `contents` mode does not show it at all.
Nothing moves on a click, so the focus transition has no work left to do and is
gone, along with the running-timer exception that existed only to blunt it. The
left-edge Notes tab is the only way into notes mode, which is explicit and
cannot move the thing being clicked.

`timer.js`'s `isTimerRunningFor` went with it; it was added for that exception
and had no other caller.

### R2. Notes joins the strip on the contents page (follows from R1)

With the focus transition gone, notes mode had no entry point while browsing —
the strip shows the filters there and the Contents/Cook/Notes set only appears
once a recipe is open. The book-level thread would have been unreachable. The
Notes tab is therefore on the strip in every view: beside the filters while
browsing, beside Contents and Cook while a recipe is open. Contents and Cook
stay hidden while browsing, having nothing to offer there.

The input keeps its right-page position on the contents page proper, because
that state has no Contents tab to come back from.

### R3. The right-edge strip stays in cook mode (supersedes 5's second half)

Task 3.4 hid the Ingredients / Method strip in cook mode on the grounds that
both sections were already on the spread. In the book it read as a missing page.
The strip stays; in cook mode it simply does not decide what the right page
shows. A CSS guard forces the method panel visible for any tab value, because
`ingredients` now names a panel that lives on the *left* page and would
otherwise leave the right page empty.

### R4. Cook mode shows the reply as a pinned slip

Cook mode hid `#page-margin` outright. Once the input was available in cook mode
(R1), that meant a note could be written there and its answer never seen. The
reply is now pinned to the top corner of the method page as a single slip — the
treatment the contents page already gives it — rather than restoring a 150px
column that is empty most of the time.
