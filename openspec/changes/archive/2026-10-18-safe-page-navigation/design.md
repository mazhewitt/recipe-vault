## Context

The evidence comes from the 2026-10-17 audit. See `steady-cooking-spread/design.md` → Context, and its `audit-summary.md`. The "find" and "manage" explorers own most of these findings, and their `remeasure.cjs` scripts re-run each measurement. Implement this change **after** `steady-cooking-spread`, on the same branch. They share `styles.css` and `recipe-display.js`, but touch different sections of each.

## Decisions

### N1. Remove the phone's full-height edge zones; add gutter chevrons

`.mobile-edge-nav` (`styles.css:2425-2486`, `chat.html`, `app.js:464-469`) goes. Two `<button>` chevrons take its place:
- They are positioned in the leather frame outside the paper, at mid-height of the page, each with a 44x44 hit area.
- They do not overlap `#page-right-content` at any scroll position, which a test asserts with `elementFromPoint` sampling over the page text.
- On the contents page both are hidden, because the contents has no "next".
- On the first recipe "previous" is disabled but visible, as the arrows are today.

The footer links ("‹ previous recipe · p. N · next recipe ›") and the swipe remain. Three ways to turn a page is already plenty. The difference now is that none of them is invisible or lies over the text.

### N2. Swipe test (`page-transitions.js:397-423`)

- **Lock:** the direction is undecided until `max(|dx|, |dy|) ≥ 30px`. It is horizontal only if `|dx| > 2·|dy|` at that moment. Otherwise the gesture is a scroll for the rest of its life.
- **Release:** a page turn needs the overall `|dx| ≥ 30%` of the page width *and* the overall `|dy| < |dx| / 2`.
- **Momentum:** a touch that starts within 300ms of the page's last `scroll` event is never a swipe. That catches the thumb that lands on a page still coasting.
- The `swipe-navigation` spec's "within the first 30px" wording already intends this. Its ratio is tightened from "vertical if dy > 2dx" to "horizontal only if dx > 2dy", which closes the 27°-63° band where the two rules overlap.

### N3. Per-tab scroll on the phone

`page-tabs.js` stores `#page-right-content.scrollTop` per tab value on the way out and restores it on the way in. A fresh recipe starts every tab at 0.

### N4. Turns use the cached list and the prefetch

- `navigation.js` `loadNextRecipe` / `loadPrevRecipe` stop calling `fetchRecipeList({ force: true })`. They use the in-memory list.
- The list is refreshed when the contents are shown, after a `recipe_artifact` for an id not in the list, and after a create or delete through the UI.
- `fetchRecipeList` no longer clears the prefetch cache. It drops entries only for ids no longer in the list.
- If the next recipe is in the prefetch cache, the turn starts immediately, renders without a skeleton and fires no request. A test asserts no `GET /api/recipes` (list) during a turn.

### N5. URL state: `?recipe=<id>` (new capability `recipe-url-state`)

- Opening a recipe from the contents, a link, `display_recipe` or prev/next calls `history.pushState({ recipeId }, '', '?recipe=<id>')`. Returning to the contents pushes the bare path.
- Replacing the same recipe (a refresh) uses `replaceState`.
- **On load**, if `?recipe=` is present, the book opens straight to that recipe in the right mode for the width, with no flash of the contents.
- **On `popstate`:** the recipe in the state is shown with the page-turn animation in the direction of travel; no state means the contents.
- **Unknown id** (deleted elsewhere): the contents show with a one-line sticky ("That recipe isn't in the book any more"), and the URL is replaced with the bare path. This replaces the current silent fall-through to the first recipe.
- **Meal plans stay out of the URL** (not persisted, RV-107). Showing one replaces the state with the bare path.
- **`/share/<token>` is untouched.**

### N6. Breakpoint crossing keeps the view

On a `matchMedia('(max-width: 600px)')` change with a recipe open:
- The recipe stays, and its scroll positions are restored.
- Above 600px the spread mode becomes `cook`.
- The slip is visible in every case (`steady-cooking-spread` D1).

The contents page re-renders on a breakpoint change only, not on every `resize` event. That fixes the resize refetch storm, and the keyboard opening no longer resets the contents scroll.

### N7. Photo preview on touch

The preview toggles on `click` only. The `touchend` handler goes, so the synthesised click that follows the touch can no longer close what the touch opened. Tapping the overlay closes it; tapping the polaroid opens it.

### N8. "Recipe Book" back to the contents is one page turn

The header return goes through `animatePageTurn` with the cached list rendered into the incoming pages before the turn starts, as prev/next do. No frame shows a blank left page.

The header's hit area shrinks to the label itself plus 44px of padding. Today it is the full width of the wood above the book, so a tap on bare wood also leaves the recipe.

## Risks

- **e2e specs driving `.mobile-edge-nav`** (`navigation.spec.ts`, `responsive.spec.ts`, `viewport-contract.spec.ts`) move to the footer links or the new chevrons. The swipe e2e tests gain the diagonal and momentum cases.
- **History entries pile up while paging through many recipes.** That is accepted: Back walks back through them, which is what a reader expects of a book.
- **Cloudflare cache.** The `?recipe=` query string must not create a cache variant of `/chat`. `/chat` is dynamic (the email is substituted) and not cached today. Verify after deploy.

## Open questions for the lead

Raised while writing the spec deltas and tasks. The decisions above are left unchanged. Each item says what the specs assume until the lead answers.

1. **N1, "previous" on the first recipe.** N1 says it is "disabled but visible, as the arrows are today". Today it is enabled on the first recipe and returns to the contents:
   - `navigation.js` `updateNavigationState`: "back arrow always enabled" in recipe view;
   - `recipe-browsing` "Back arrow from first recipe returns to index";
   - `swipe-navigation` "Swipe respects navigation boundaries".

   Only the contents page has "previous" disabled. The specs keep today's rule: previous enabled on the first recipe; next disabled but visible on the last.
2. **N1, "the contents has no next".** It does: the contents are page zero (`recipe-book-index` "Index is page zero"), and `#page-next` is enabled there above 600px.
   - The specs still hide both chevrons on the contents page, as N1 says. On the phone the way forward from the contents is a row tap or a swipe left.
   - They also hide the chevrons on a meal plan, which has no recipe to page from and no footer links.
   - `contents-filters.spec.ts:238` taps `#mobile-edge-next` on the contents page and moves to a swipe.
3. **N1, chevron geometry on the phone.** The leather side frame is 4px (`.pages-container { margin: 40px 4px 4px }`), and the page has 16px of padding.
   - A 44px box that ends before `#page-right-content` needs a side frame of at least 28px.
   - That narrows the paper from about 382px to 334px, and the text column from about 350px to 302px, roughly 14% on a 390px phone.
   - The spec only forbids horizontal overlap with `#page-right-content`. It leaves the frame width to the implementer, the same on the contents and the recipe page.
   - steady-cooking-spread's `family-recipe-ui` "Phone layout" still says "a thin leather frame". 28px arguably still qualifies, but it is a visible change to the phone look.
   - Decide whether that cost is acceptable, or the chevrons should live elsewhere (the 40px top strip, the footer).
4. **N3 names the wrong scroll element.** On the phone `#page-right` scrolls: `.page { overflow-y: auto }`, and at 1024px and narrower in recipe view `#page-right-content` is `height: auto`. The e2e suite already reads `#page-right.scrollTop`. The specs use `#page-right`.
5. **N4, "after a create or delete through the UI".** The UI has neither; recipes are created and deleted by the chat tools.
   - A create already arrives as a `recipe_artifact` for an id not in the list.
   - A delete arrives only as a `tool_use` event.
   - The specs refresh the list when a chat turn whose stream included `create_recipe` or `delete_recipe` ends.

   Should `update_recipe` be included too? A rename re-orders the alphabetical list, so until the contents are shown the neighbours and page numbers would be stale.
6. **N4 implies two code changes it does not name.**
   - `fetchAndDisplayRecipe` force-refreshes the list after every render (`recipe-display.js` "Refresh recipe list to include newly created recipes"). Unless that becomes conditional, the "no list request during a turn" test cannot pass. The specs refresh only when the displayed id is not in the held list.
   - It also shows the skeleton before checking the cache, so a cache hit still flashed one.

   Minor: `fetchRecipeList` takes a positional boolean (`fetchRecipeList(true)`), not `{ force: true }`.
7. **N4 contradicts a main spec the proposal did not list.** `recipe-browsing` "Recipe list is fetched fresh on navigation" says every arrow click fetches the list. This change REMOVES it, ADDS "Navigation uses the recipe list already held", and MODIFIES "Current recipe ID is tracked" ("freshly-fetched list" becomes "held list"). `proposal.md`'s Modified Capabilities now lists `recipe-browsing`, and its `family-recipe-ui` line names the per-tab scroll and the breakpoint crossing.
8. **N5, unknown id versus `web-chat`.** `web-chat` "Recipe fetch error handling" says a 404 from a `recipe_artifact` shows "Recipe not found" on the right page. The fall-through to the first recipe that N5 replaces is shared by every route.
   - The specs apply "contents plus the sticky note" to the URL on load, Back/Forward, contents rows and previous/next.
   - They leave `recipe_artifact` on `web-chat`'s message.

   Unify (that needs a `web-chat` delta), or keep the split? The sticky note is specified as `.missing-recipe-notice` with `role="status"`, removed when the next page is shown.
9. **Reload and the spread mode.** `proposal.md` says reload restores "the recipe (and the spread mode)". N5 says "in the right mode for the width". The mode is not persisted anywhere today. The specs follow N5: `cook` above 600px, Ingredients on the phone. If the reader's own mode should survive a reload, it would have to go into `history.state`.
10. **N5, the direction of travel on `popstate`.** The specs read it as history direction: Back plays a backward turn and Forward a forward turn, using a sequence number kept in `history.state`. A `popstate` that arrives while a turn holds the animation lock cannot be ignored, because the URL has already changed. The specs apply it when the turn ends.
11. **N6 resets the reader's mode.** "Above 600px the spread mode becomes cook" means a reader in `notes` mode who narrows and widens again comes back in `cook`. `app.js` `setupOrientationChangeHandler` deliberately preserves the mode across that round trip today. The specs follow N6.
12. **N8, "the label itself plus 44px of padding".** The specs read this as no more than 44px wider than the label's text (22px each side) and at least 44px tall. The other reading, 44px on every side, would give about a 166x74 box on desktop.
13. **N8 against N4.** N8 draws the contents from the held list; N4 refreshes the list when the contents are shown. The specs do both: they draw from the held list inside the turn, make one `GET /api/recipes` after it, and re-render in place only if the list changed.
14. **The Risks list of e2e specs.** The specs that drive `.mobile-edge-nav` are:
    - `navigation.spec.ts`
    - `index.spec.ts` (`getNavSelectors`)
    - `contents-page.spec.ts:135`
    - `contents-filters.spec.ts:238`

    `responsive.spec.ts` and `viewport-contract.spec.ts` do not touch it. There are no swipe e2e tests today, so the diagonal and momentum cases are new; tasks group 2 writes them with CDP touch input, as `tests/usability/remeasure/find.cjs` does.


## Answers from the lead (2026-10-17)

Where the specs already assumed an answer, that answer stands, except as noted below.
- **Q1:** keep today's behaviour. "Previous" on the first recipe stays enabled and returns to the contents.
- **Q2:** yes. Hide the chevrons on the contents and on meal plans.
- **Q3:** the chevrons go at the right-hand end of the phone `.page-tabs` row, as two 44px buttons. They do not go in the frame: 14% of the paper's width is too much to give up, and the tab row has room (spec amended).
- **Q4:** use `#page-right`.
- **Q5:** chat turns stand in for the UI, and `update_recipe` counts too, because a rename re-orders the list (spec amended).
- **Q6:** agreed. Make those changes; they are implementation detail.
- **Q7:** fine.
- **Q8:** keep the split.
- **Q9:** follow N5. A reload opens in `cook`.
- **Q10:** agreed.
- **Q11:** keep today's behaviour. Above 600px the reader's last chosen mode returns, or `cook` if they never chose one (spec amended).
- **Q12, Q13:** agreed.
- **Q14:** noted. The tasks name the right specs.
