## Context

The recipe book UI currently displays one recipe at a time, loaded via chat interaction. The existing `/api/recipes` endpoint already returns recipes sorted alphabetically by title (`ORDER BY LOWER(title)`). The frontend has a `fetchAndDisplayRecipe(recipeId)` function that loads and renders a single recipe.

## Goals / Non-Goals

**Goals:**
- Add navigation arrows to browse recipes sequentially
- Maintain alphabetical ordering (already provided by API)
- Simple MVP implementation - no animations
- Arrows positioned to feel like natural page-turning controls

**Non-Goals:**
- Page turn animations (future enhancement)
- Keyboard navigation (can add later)
- Recipe search/filtering UI (chat handles this)
- Infinite scroll or lazy loading

## Decisions

### Decision 1: Fetch recipe list on each navigation

**Choice**: Fetch `/api/recipes` fresh each time the user clicks a navigation arrow

**Rationale**: Recipes can be created, updated, or deleted via chat during a session. Caching the list would cause stale data (missing new recipes, showing deleted ones). The recipe list is small and the API call is lightweight, so the latency is acceptable.

**Alternatives considered**:
- Cache on page load: Simpler but causes stale data when recipes change via chat
- SSE cache invalidation: Complex, requires backend changes to notify frontend of writes

### Decision 2: Arrow placement

**Choice**:
- "<" arrow: Top-left corner of left page (inside the page, below page number area)
- ">" arrow: Top-right corner of right page (inside the page, below page number area)

**Rationale**: Mimics natural book page-turning gesture. Arrows are visible but don't interfere with recipe content.

### Decision 3: Boundary behavior

**Choice**: Disable (grey out) arrows at list boundaries rather than hiding them

**Rationale**: Users can see that navigation exists but they're at the start/end. Hiding would make the UI feel inconsistent.

### Decision 4: Initial state

**Choice**: Don't auto-load first recipe. Wait for user to either ask chat or click an arrow.

**Rationale**: Preserves current behavior where recipe book shows placeholder until a recipe is selected. First arrow click loads the first recipe.

**Alternative**: Could auto-load first recipe on page load - easy to change later if desired.

## Risks / Trade-offs

**[Trade-off] API call on every navigation** → Acceptable latency for small recipe lists. Ensures data is always fresh after chat creates/deletes recipes.

**[Trade-off] No indication of position in list** → Could add "3 of 12" indicator later. MVP just has arrows.

**[Trade-off] Arrows always visible even with no recipes** → Disable both arrows when list is empty. Show placeholder text.
