## Context

The recipe vault uses a book metaphor with page-turn animations for recipe navigation. On desktop, this works well — two pages side by side with a 3D rotateY overlay simulating a physical page turn. On mobile, the layout collapses to a single page, but the same overlay-based animation machinery runs: it creates a temporary div, copies the old HTML into it, positions it absolutely, animates it with rotateY, and renders new content underneath in parallel. This causes visible layout collapse on Android (the underlying page element briefly shows empty/skeleton content before the new recipe renders) and the interactive swipe tracking (finger-following overlay rotation) conflicts with vertical scrolling.

The codebase is vanilla JS with ES modules — no frameworks. The relevant files are `page-transitions.js` (~500 lines), `navigation.js` (~140 lines), `styles.css` (page-turn overlay CSS ~120 lines), and `app.js` (initialization).

## Goals / Non-Goals

**Goals:**
- Eliminate the Android "collapse" flash during mobile recipe navigation
- Replace the mobile page-turn with a clean directional slide using the View Transitions API
- Simplify the mobile swipe gesture to a direction-detect-and-trigger pattern
- Keep the desktop 3D page-turn experience unchanged
- Provide a graceful fallback for browsers without View Transitions support

**Non-Goals:**
- Redesigning the desktop page-turn animation
- Changing the navigation model (index → recipe → recipe → index)
- Adding new navigation gestures (e.g., pull-to-refresh, pinch)
- Modifying the prefetch cache system (it works fine and benefits both paths)

## Decisions

### Decision 1: Use View Transitions API for mobile transitions

**Choice**: `document.startViewTransition()` with CSS `::view-transition-*` pseudo-elements

**Rationale**: The View Transitions API solves the exact problem — it captures a visual screenshot of the old state before DOM mutation, then crossfades/animates to the new state. The browser holds the old screenshot visible until the new state is painted, which eliminates the flash-of-empty-content entirely. No overlay divs, no height locking, no parallel render timing.

**Alternatives considered**:
- *Shadow DOM encapsulation*: Would prevent the flash by isolating rendering, but adds architectural complexity and doesn't simplify the animation code.
- *Double-buffered offscreen rendering*: Render new content in a hidden container, then swap. Manual version of what View Transitions does natively.
- *CSS-only slide with `translateX`*: Would need two sibling containers and manual swap logic — reinventing View Transitions poorly.

### Decision 2: Directional slide animation (not crossfade) on mobile

**Choice**: Slide-left for forward navigation, slide-right for backward. Controlled via a `data-nav-direction` attribute on `<html>` that the CSS `::view-transition-*` rules reference.

**Rationale**: Directional movement communicates "next" and "previous" spatially, matching the mental model of browsing through a book. A crossfade would work but feels directionless.

**Implementation**:
```css
html[data-nav-direction="forward"]::view-transition-old(page-content) {
    animation: slide-out-left 250ms ease-out;
}
html[data-nav-direction="forward"]::view-transition-new(page-content) {
    animation: slide-in-right 250ms ease-out;
}
/* Reverse for backward */
```

The `page-left-content` element gets `view-transition-name: page-content` on mobile only.

### Decision 3: Simplify swipe to direction-detect-only

**Choice**: Keep touch event listeners but remove the interactive overlay tracking. On `touchend`, if horizontal distance > 30% of page width, trigger navigation. The View Transition handles the visual feedback.

**Rationale**: The current 140-line swipe handler creates an overlay, tracks finger position in real-time mapping to rotateY, renders content behind the overlay at 20% progress, and handles snap-back. All of this is replaced by ~30 lines: detect direction, check threshold, call `loadNextRecipe`/`loadPrevRecipe`. The View Transition provides the animation.

**Trade-off**: No finger-following animation during the swipe itself — the visual feedback happens on release. This matches how most mobile apps handle swipe navigation (e.g., iOS app switcher, Android gesture nav).

### Decision 4: Feature detection branching in `animatePageTurn`

**Choice**: `animatePageTurn()` becomes the branching point:
```
if mobile + View Transitions → startViewTransition path
if mobile + no VT support   → existing crossfade fallback
if desktop                  → existing pageTurnTransition (unchanged)
```

**Rationale**: This is the single function that `navigation.js` calls. Branching here means navigation.js, app.js, and recipe-display.js need zero structural changes. The mobile View Transition path doesn't need the height-locking or overlay creation that the desktop path uses.

### Decision 5: Scope page-turn overlay CSS to desktop

**Choice**: Wrap the `.page-turn-overlay` animation keyframes and related styles in `@media (min-width: 601px)` so they don't apply on mobile. Add the `::view-transition-*` CSS in a `@media (max-width: 600px)` block.

**Rationale**: Clean separation — mobile and desktop never load each other's transition styles. The existing 600px breakpoint is already the mobile/desktop threshold throughout the CSS.

## Risks / Trade-offs

**[Risk] View Transitions API not available on older mobile browsers** → Fallback to the existing crossfade transition. Feature detection via `'startViewTransition' in document`. Crossfade is already tested and working (it's the current reduced-motion path).

**[Risk] View Transition blocks on slow network fetch** → The transition captures old state, then waits for the callback to finish before animating. If `fetchAndDisplayRecipe` takes seconds (uncached, slow network), the old screenshot freezes on screen. Mitigation: the prefetch cache means adjacent recipes are usually pre-loaded, so the DOM update is synchronous in the common case. For cache misses, the 250ms slide animation covers most fetch latency.

**[Trade-off] No finger-tracking animation during swipe** → Users don't see the page follow their finger. This is a deliberate simplification — the current finger-tracking is the source of the scroll-conflict bugs and the Android flash. The quick slide on release is a better UX trade-off than a buggy interactive animation.

**[Trade-off] Two animation code paths (mobile vs desktop)** → Increases branching in `animatePageTurn`. Mitigated by the clean `isMobile()` split at the top of the function, keeping each path self-contained.
