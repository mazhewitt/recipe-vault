## Context

The recipe book panel currently shows a placeholder ("Ask me to find or create a recipe...") on page load. The app already fetches the full recipe list via `GET /api/recipes` on DOMContentLoaded (for navigation state), but doesn't use it visually. The list is returned alphabetically sorted by `LOWER(title)` with each entry containing `id` and `title` (among other fields). Navigation uses `currentRecipeId` as state — when `null`, no recipe is displayed.

## Goals / Non-Goals

**Goals:**
- Display an alphabetical recipe index as the default view ("page zero") of the recipe book
- Integrate seamlessly with existing arrow navigation — index is the page before the first recipe
- Keep the index always fresh (no caching)
- Allow clicking a recipe name to jump directly to that recipe

**Non-Goals:**
- Multi-page/paginated index (pages scroll instead — consistent with existing behavior)
- Backend API changes (existing `/api/recipes` provides everything needed)
- Search/filter functionality within the index
- Changing how chat-triggered recipe display works (still goes directly to the recipe)

## Decisions

### State model: introduce a "view mode" concept

**Decision**: Add a `viewMode` variable (`'index'` | `'recipe'`) alongside the existing `currentRecipeId`.

**Rationale**: Currently `currentRecipeId === null` means "show placeholder." We repurpose this: on load and when navigating back, `viewMode = 'index'` shows the index. When viewing a recipe, `viewMode = 'recipe'`. This is cleaner than overloading `currentRecipeId` with a sentinel value like `'index'`.

**Alternative considered**: Using `currentRecipeId = null` to mean "show index" (no new variable). Rejected because `null` already means "no recipe selected" in multiple places, and changing its semantics would be fragile.

### Index layout: split alphabetically across two pages

**Decision**: Left page gets the first half of recipes, right page gets the second half, both grouped under letter headers (A, B, C...).

**Rationale**: This mirrors a real cookbook's table of contents. Splitting by count (not by letter) ensures roughly balanced pages. Each page scrolls independently, which is already how long recipe content works.

**Alternative considered**: Single-page list with the right page empty or showing decorative content. Rejected because it wastes half the book and feels unbalanced.

### Navigation: index as page zero

**Decision**: The arrow navigation sequence is: `Index → Recipe 1 → Recipe 2 → ... → Recipe N`. Arrow-left from Recipe 1 returns to the index. Arrow-left on the index is disabled. Arrow-right on the index goes to Recipe 1.

**Rationale**: Natural book metaphor — table of contents is the first page. No extra UI elements needed.

**State transitions**:
```
                    ◀ disabled
            ┌──────────────┐
            │    INDEX     │
            │ viewMode=    │
            │  'index'     │
            └──────┬───────┘
                   │ ▶ (or click recipe)
                   ▼
            ┌──────────────┐
     ◀ to   │   RECIPE     │  ▶ to
     index  │ viewMode=    │  next
     ←──────│  'recipe'    │──────→
            │ currentId=X  │
            └──────────────┘
```

### Index fetching: always fresh, reuse existing endpoint

**Decision**: `renderIndex()` calls `fetchRecipeList(true)` (force refresh) every time the index is shown. No separate cache for the index.

**Rationale**: The `/api/recipes` endpoint is lightweight (returns only recipe metadata, no joins for ingredients/steps). Force-refreshing ensures the index reflects recipes created or deleted via chat. The existing `fetchRecipeList` function with `forceRefresh=true` already handles this.

### Chat-triggered display: bypasses index

**Decision**: When the chat SSE emits a `recipe_artifact` event, it still calls `fetchAndDisplayRecipe()` directly, setting `viewMode = 'recipe'`. The user can arrow-left back to the index from there.

**Rationale**: No change needed to the chat flow. The index is the default/home state, not a gate.

## Risks / Trade-offs

**[Large recipe collections may feel cluttered]** → The index scrolls within each page, matching existing behavior for long content. Letter headers help scannability. For truly large collections (100+), a search feature would help, but that's out of scope.

**[Index flash on every return]** → Since the index always fetches fresh, there's a brief moment between showing the index and having data. Mitigate by rendering optimistically from the cached list while the fresh fetch happens in the background, then re-rendering if the list changed.

**[Breaking existing navigation expectations]** → Users accustomed to the current arrow behavior (arrows do nothing from placeholder) will now find arrows functional from the index. This is strictly an improvement — no negative impact expected.
