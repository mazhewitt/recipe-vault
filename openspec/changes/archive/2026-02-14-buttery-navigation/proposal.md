## Why

Recipe navigation (prev/next) on mobile is visually jarring — the current recipe vanishes, skeleton loaders flash, and the book container visibly resizes before the new recipe appears. This makes the app feel broken rather than like flipping through a cookbook. On desktop it's passable but still abrupt. The experience should feel like smoothly turning pages in a real book.

## What Changes

- **Add page turn animation**: A CSS 3D page-turn effect (perspective + rotateY transform on the page edge) that mimics physically flipping a page in a book. The current page lifts and folds over to reveal the new recipe underneath — reinforcing the cookbook metaphor and masking the content swap naturally.
- **Stabilise book container dimensions during navigation**: Lock the `.recipe-book` / `.pages-container` height during transitions to prevent the "shrink" caused by content reflow when innerHTML is cleared.
- **Add swipe gesture navigation on mobile**: Interpret horizontal swipe gestures (touchstart/touchmove/touchend) as prev/next navigation, wired to the same transition animations. Currently mobile only has small edge tap targets.
- **Prefetch adjacent recipes**: After displaying a recipe, background-fetch the next and previous recipes so navigation can render instantly from cache rather than hitting the network every time.
- **Preserve skeleton loader as graceful fallback**: If a recipe isn't prefetched (e.g. cold start, list boundary), the transition animation still plays and the skeleton shows inside the incoming page rather than replacing the current view abruptly.

## Capabilities

### New Capabilities
- `recipe-page-transitions`: CSS 3D page-turn animation system (perspective + rotateY transforms) for navigating between recipe views, including container dimension stabilisation during content swaps. Degrades gracefully to a simple crossfade on browsers/devices that don't support 3D transforms or `prefers-reduced-motion`.
- `swipe-navigation`: Touch gesture detection for horizontal swipe-to-navigate on mobile, integrated with the transition system.
- `recipe-prefetch`: Background prefetching of adjacent recipes (next/prev) after displaying a recipe, with a simple cache to enable instant rendering on navigation.

### Modified Capabilities
- `recipe-browsing`: Navigation flow changes — `fetchAndDisplayRecipe` needs to check the prefetch cache before fetching, and coordinate with the transition system instead of immediately swapping innerHTML. `showRecipeLoading` needs to work within the transition rather than replacing the current view.

## Impact

- **Frontend JS** (`navigation.js`, `recipe-display.js`, `app.js`): New transition orchestration, swipe handler, prefetch cache, modified render flow.
- **Frontend CSS** (`styles.css`): 3D page-turn keyframes/transforms, `perspective` on the book container, transition classes, container dimension locking during navigation. Crossfade fallback for `prefers-reduced-motion`.
- **HTML** (`chat.html`): Possible minor structural additions (wrapper elements for transition targets).
- **No backend changes**: All changes are client-side. The existing `/api/recipes/:id` endpoint is sufficient.
- **No breaking changes**: The navigation API surface (prev/next buttons, edge taps) remains the same; swipe and transitions are additive.
