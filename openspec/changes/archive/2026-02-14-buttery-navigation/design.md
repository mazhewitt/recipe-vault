## Context

The recipe book is a two-page spread on desktop (`.page-left` for ingredients, `.page-right` for preparation) and a single page on mobile (`.page-right` is `display: none !important`). Navigation triggers `fetchAndDisplayRecipe()` which immediately clears `innerHTML` via `showRecipeLoading()`, shows skeleton loaders, fetches JSON from `/api/recipes/:id`, then renders new HTML into the page containers. There are no transitions — the content swap is instant and causes visible reflow (the "shrink").

The book has a leather-textured cover (`.book-cover`) with a center spine shadow (`.book-cover::after`), page binding shadows (`.page-left::after`, `.page-right::before`), and edge navigation zones on mobile. All rendering is client-side JS from JSON responses. No HTMX is used for recipe display.

## Goals / Non-Goals

**Goals:**
- Page turn animation that feels like flipping a physical cookbook page
- Zero layout shift during navigation — book container stays perfectly stable
- Swipe-to-navigate on mobile with interactive finger tracking (page follows the touch)
- Near-instant navigation via prefetching adjacent recipes
- Works on desktop (two-page spread) and mobile (single page)

**Non-Goals:**
- Changing the backend API or adding SSR for recipes
- Multi-page turn (flipping through several recipes at once)
- Drag-based page curl that deforms the page with a realistic paper bend (too complex for CSS; would require canvas/WebGL)
- Changing the index view or its transitions (index → recipe transition stays as-is for now)

## Decisions

### 1. Page turn via rotateY overlay with backface-visibility: hidden

**Approach:** When navigating, create a temporary overlay element that captures the old page content. Render the new recipe content into the real page elements behind it. Animate the overlay with a `rotateY` transform to simulate a page turning on its hinge (the spine). At 90deg the overlay becomes invisible (`backface-visibility: hidden`) and the new content is revealed.

- **Forward (next):** Overlay covers the right page (desktop) or full page (mobile). `transform-origin: left center` (hinge at the spine). Animates `rotateY(0)` → `rotateY(-180deg)`.
- **Backward (prev):** Overlay covers the left page (desktop) or full page (mobile). `transform-origin: right center`. Animates `rotateY(0)` → `rotateY(180deg)`.

A gradient shadow follows the turning edge to add depth.

**Why this over alternatives:**
- *Crossfade/slide:* Doesn't reinforce the book metaphor. A page turn is more thematic.
- *Canvas/WebGL page curl:* Realistic paper bending is complex, heavy, and hard to make accessible. The rotateY approach is pure CSS (GPU-accelerated), lightweight, and still looks like a page turn.
- *Cloning entire DOM for overlay:* We just need visual continuity during the turn. Cloning the `innerHTML` of the page content into the overlay is sufficient — no need to preserve event listeners on the departing content.

**Duration:** ~400ms with `ease-in-out`. Fast enough to not feel sluggish, slow enough to read as a page turn.

### 2. Container dimension locking during transitions

**Approach:** Before starting a transition, read the computed height of `.pages-container` and explicitly set it as an inline style (`height: Xpx`). After the transition completes and new content is rendered, remove the inline height to let flexbox resume. This prevents the "shrink" caused by clearing innerHTML.

**Why not min-height in CSS?** Content lengths vary wildly between recipes. A fixed `min-height` either wastes space (too tall) or doesn't prevent the shrink (too short). Capturing the actual computed height at transition start is precise.

### 3. Interactive swipe tracking on mobile (finger-following page turn)

**Approach:** On `touchstart`, begin tracking. On `touchmove`, update the overlay's `rotateY` transform proportionally to horizontal finger displacement (map finger X delta to a 0-180deg range). On `touchend`, if past a commit threshold (30% of page width), animate to completion and load the new recipe. Otherwise, animate back to 0deg (snap-back).

This gives the "buttery" feel — the page physically follows the user's finger rather than reacting after the fact.

**Thresholds:**
- Minimum horizontal distance to begin tracking: 10px (prevents accidental triggers on vertical scroll)
- Commit threshold: 30% of page width (complete the turn)
- Cancel threshold: < 30% (snap back)
- Vertical lock-out: if vertical movement exceeds horizontal by 2x in the first 30px, treat as a scroll, not a swipe

**Why not simpler threshold-based swipe?** Detecting direction only on touchend (flick detection) feels like a button press, not a page turn. Interactive tracking is what makes it feel physical and "buttery."

### 4. Prefetch cache — simple Map with LRU-style eviction

**Approach:** After displaying a recipe, identify the next and previous recipe IDs from the cached recipe list, and `fetch()` them in the background. Store results in a `Map<recipeId, { data, timestamp }>`.

- **Max cache size:** 5 entries (current + 2 ahead + 2 behind). Evict oldest entries when exceeded.
- **Invalidation:** Clear cache when `fetchRecipeList(true)` is called (force refresh, which happens after chat operations that may create/modify recipes).
- **On navigation:** Check cache first. If hit, render immediately with transition. If miss, show skeleton inside the incoming page (behind the turning overlay) and fetch normally.

**Why not Service Worker cache?** Overkill for this use case. The prefetch is purely for navigation smoothness — a simple in-memory Map is sufficient, has zero setup, and is cleared naturally on page reload.

### 5. New JS module `page-transitions.js`

All transition orchestration, overlay management, and swipe handling lives in a new module rather than being spread across `navigation.js` and `recipe-display.js`.

- Exports: `animatePageTurn(direction, newContentFn)`, `initSwipeGestures(container)`, `prefetchAdjacent()`
- `navigation.js` calls `animatePageTurn('forward', () => renderRecipe(data))` instead of directly calling `fetchAndDisplayRecipe`
- `recipe-display.js` exports its render functions as before, but `fetchAndDisplayRecipe` is updated to coordinate with the transition system

**Why a new module?** Transition logic (overlay creation, animation lifecycle, swipe gesture state machine) is distinct from navigation logic (which recipe to show) and display logic (how to render a recipe). Mixing them would make all three files harder to follow.

### 6. Reduced-motion and graceful degradation

- `@media (prefers-reduced-motion: reduce)`: Replace page-turn with an instant crossfade (opacity 1→0, swap, 0→1 over ~150ms). No rotateY.
- No 3D transform support (checked via `CSS.supports('transform', 'rotateY(1deg)')`): Same crossfade fallback.
- Prefetch and swipe gestures still work regardless — only the visual animation changes.

## Risks / Trade-offs

- **Overlay content may not perfectly match** if CSS layout depends on parent dimensions differently than the real pages. → Mitigation: Style the overlay to match page dimensions exactly using `getBoundingClientRect()`. Keep overlay content simple (cloned innerHTML, same padding/font styles).

- **Swipe conflicts with page scrolling** on tall recipes that need vertical scroll. → Mitigation: Vertical lock-out heuristic (if first 30px of movement is mostly vertical, treat as scroll). Additionally, only track horizontal swipes that start near the page edges (left/right 25% zones), leaving the center for scrolling.

- **Prefetch wastes bandwidth** if user doesn't navigate. → Mitigation: Only prefetch 1 ahead and 1 behind (not 2). Use `requestIdleCallback` so prefetch doesn't compete with rendering. Recipes are small JSON payloads (~2-5KB) so the cost is negligible.

- **Animation jank on low-end mobile devices** from 3D transforms. → Mitigation: `will-change: transform` on the overlay, `transform: translateZ(0)` to force GPU compositing. The overlay is a single flat element (no nested 3D), keeping compositor cost low. The reduced-motion fallback also serves as a performance escape hatch.

## Open Questions

- Should the swipe initiation zone cover the entire page or only the edges (left/right 25%)? Full-page feels more natural but may conflict with recipe content interactions (e.g., tapping timer durations, photo interactions). Starting with edge zones and expanding if it feels too restrictive.
