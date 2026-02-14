## Why

The page-turn animation on mobile is broken: the 3D rotateY overlay causes a visible "collapse" on Android when the underlying content swaps (the browser reflows the empty page element before the new recipe renders), and the interactive swipe tracking fights with vertical scrolling. The overlay-based approach is fundamentally fragile on single-page mobile layouts — it was designed for the two-page desktop book metaphor and doesn't translate well.

## What Changes

- **Replace mobile page-turn with View Transitions API**: On mobile, use `document.startViewTransition()` for a directional slide animation instead of the 3D rotateY overlay. The browser captures a screenshot of the old state, the DOM updates, and the browser animates to the new state — eliminating the flash/collapse entirely.
- **Simplify mobile swipe gestures**: Remove the interactive overlay-tracking swipe (140+ lines). Replace with a simple swipe-direction detector that triggers navigation on touchend — the View Transition handles the visual animation.
- **Keep desktop page-turn unchanged**: The 3D page-turn overlay continues to work on desktop (two-page layout) where it looks and works correctly.
- **Crossfade fallback for unsupported browsers**: Browsers without View Transitions API support fall back to the existing crossfade transition (~150ms opacity fade).

## Capabilities

### New Capabilities

_(none — this modifies existing capabilities)_

### Modified Capabilities

- `recipe-page-transitions`: Mobile scenarios change from 3D rotateY overlay to View Transitions API slide animation. Desktop scenarios unchanged.
- `swipe-navigation`: Interactive finger-tracking overlay removed. Swipe detection simplified to direction-only trigger on touchend.

## Impact

- `static/page-transitions.js`: Major refactor — `animatePageTurn()` branches mobile/desktop, swipe gesture handler simplified, mobile overlay code removed
- `static/styles.css`: Add `::view-transition-*` CSS for mobile slide animations, scope page-turn overlay CSS to desktop-only via `@media`
- `static/navigation.js`: No structural changes (calls `animatePageTurn` which handles the branching internally)
- `static/app.js`: Minor — swipe gesture initialization may simplify
- Browser support: View Transitions API requires Chrome 111+, Safari 18+, Edge 111+. Older browsers get crossfade fallback.
