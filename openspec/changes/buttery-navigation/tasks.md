## 1. Page Transition Foundation

- [x] 1.1 Create `static/page-transitions.js` module with exports: `animatePageTurn(direction, renderFn)`, `initSwipeGestures(container)`, `isAnimating()` — stub implementations returning immediately
- [x] 1.2 Add `perspective` to `.pages-container` in `styles.css` and add CSS classes for the page-turn overlay (`.page-turn-overlay`, positioning, backface-visibility, transform-origin variants)
- [x] 1.3 Add `@keyframes pageTurnForward` (`rotateY(0)` → `rotateY(-180deg)`) and `@keyframes pageTurnBackward` (`rotateY(0)` → `rotateY(180deg)`) with ~400ms ease-in-out duration
- [x] 1.4 Add gradient shadow pseudo-element on `.page-turn-overlay` that follows the turning edge

## 2. Page Turn Animation Logic

- [x] 2.1 Implement `animatePageTurn(direction, renderFn)` — creates overlay from current page innerHTML, calls `renderFn` to populate real pages behind it, applies the turn animation, removes overlay on `animationend`
- [x] 2.2 Add container dimension locking: read `.pages-container` computed height before animation, set as inline style, remove after `animationend`
- [x] 2.3 Add animation guard (`isAnimating` flag) — ignore navigation inputs while a turn is in progress
- [x] 2.4 Add reduced-motion / no-3D-support detection: if `prefers-reduced-motion: reduce` or `CSS.supports('transform', 'rotateY(1deg)')` is false, use a ~150ms opacity crossfade instead of rotateY

## 3. Prefetch Cache

- [x] 3.1 Add prefetch cache to `page-transitions.js`: `Map<recipeId, { data, timestamp }>` with max 5 entries, oldest-eviction
- [x] 3.2 Implement `prefetchAdjacent(currentRecipeId)` — resolves next/prev IDs from the recipe list, fetches them via `requestIdleCallback`, stores in cache
- [x] 3.3 Implement `getCachedRecipe(recipeId)` — returns cached data or null
- [x] 3.4 Add cache invalidation: export `clearPrefetchCache()`, called whenever `fetchRecipeList(true)` runs (force-refresh after chat operations)

## 4. Integrate Transitions into Navigation Flow

- [x] 4.1 Update `fetchAndDisplayRecipe` in `recipe-display.js` to check prefetch cache before fetching from API
- [x] 4.2 Update `loadNextRecipe` and `loadPrevRecipe` in `navigation.js` to call `animatePageTurn(direction, renderFn)` instead of directly calling `fetchAndDisplayRecipe`
- [x] 4.3 Wire `prefetchAdjacent()` call after each successful recipe display (at end of `fetchAndDisplayRecipe`)
- [x] 4.4 Wire `clearPrefetchCache()` into `fetchRecipeList` when `forceRefresh` is true
- [x] 4.5 Import and initialise `page-transitions.js` in `app.js`

## 5. Swipe Gesture Navigation

- [x] 5.1 Implement `initSwipeGestures(container)` with `touchstart`/`touchmove`/`touchend` listeners on `.pages-container`, only active at viewport ≤600px
- [x] 5.2 Add vertical lock-out: if vertical movement exceeds horizontal by 2x within first 30px, abort swipe and let scroll happen
- [x] 5.3 Add interactive tracking: on `touchmove`, create/update overlay and set `rotateY` proportional to horizontal finger displacement
- [x] 5.4 Add commit/cancel on `touchend`: if past 30% page width, animate overlay to 180deg and trigger navigation; otherwise animate snap-back to 0deg
- [x] 5.5 Respect navigation boundaries on swipe: no forward swipe on last recipe, backward swipe on first recipe goes to index

## 6. Testing and Polish

- [x] 6.1 Verify page turn plays correctly on desktop (forward and backward) with no layout shift
- [x] 6.2 Verify page turn plays correctly on mobile (forward and backward) with no layout shift
- [x] 6.3 Verify swipe gesture navigates forward/backward on mobile, snap-back works below threshold
- [x] 6.4 Verify prefetch cache: second navigation is instant (no skeleton flash), cache clears after chat operations
- [x] 6.5 Verify reduced-motion fallback: crossfade plays instead of page turn when preference is set
- [x] 6.6 Verify rapid click/swipe is ignored during animation (no double-navigation)
