## 1. View Transitions CSS

- [x] 1.1 Add `view-transition-name: page-content` to `#page-left-content` inside the `@media (max-width: 600px)` block in `styles.css`
- [x] 1.2 Add `::view-transition-old(page-content)` and `::view-transition-new(page-content)` CSS rules for forward/backward slide animations, controlled by `html[data-nav-direction]` attribute
- [x] 1.3 Add `@keyframes slide-out-left`, `slide-in-right`, `slide-out-right`, `slide-in-left` in the mobile media query
- [x] 1.4 Add `prefers-reduced-motion` override that disables slide animations for View Transitions (use crossfade/instant instead)

## 2. Mobile View Transition Path in page-transitions.js

- [x] 2.1 Add a `viewTransitionNavigate(direction, renderFn)` function that sets `data-nav-direction` on `<html>`, calls `document.startViewTransition()` with the renderFn callback, and cleans up the attribute after the transition finishes
- [x] 2.2 Modify `animatePageTurn()` to branch: if `isMobile()` and `document.startViewTransition` exists, call `viewTransitionNavigate()`; if `isMobile()` without View Transitions support, call existing `crossfadeTransition()`; otherwise call existing `pageTurnTransition()` (desktop unchanged)
- [x] 2.3 Remove the height-locking logic from the mobile View Transition path (not needed — the browser handles layout stability)

## 3. Simplify Swipe Gestures

- [x] 3.1 Rewrite `initSwipeGestures()` to a simplified version: track `touchstart` position, detect direction on `touchmove` (keep existing scroll-vs-swipe discrimination), and on `touchend` trigger `loadNextRecipe()`/`loadPrevRecipe()` if horizontal distance exceeds 30% threshold
- [x] 3.2 Remove the interactive overlay creation, finger-tracking `curlTransform` mapping, `renderSwipeTarget()`, `completeSwipeTurn()`, and `snapBackSwipe()` functions (all replaced by the simplified swipe + View Transition)
- [x] 3.3 Remove the `swipe-tracking` CSS class and associated styles from `styles.css`

## 4. Scope Desktop-Only Styles

- [x] 4.1 Wrap the `.page-turn-overlay` keyframe animations (`pageTurnForward`, `pageTurnBackward`, `highlightSweep`) and related overlay styles in `@media (min-width: 601px)` so they don't apply on mobile

## 5. Verification

- [ ] 5.1 Test desktop page-turn animation still works unchanged (forward/backward navigation with overlay) — manual browser test
- [ ] 5.2 Test mobile forward/backward navigation uses slide animation (no 3D overlay, no collapse flash) — manual browser test
- [ ] 5.3 Test mobile swipe left/right triggers navigation with slide animation — manual browser test
- [ ] 5.4 Test mobile swipe cancels below 30% threshold (no navigation occurs) — manual browser test
- [ ] 5.5 Test vertical scrolling on mobile is not intercepted by swipe handler — manual browser test
- [ ] 5.6 Test fallback: disable View Transitions (or test in older browser) — crossfade should work — manual browser test
- [ ] 5.7 Test reduced motion preference disables slide animation on mobile — manual browser test
