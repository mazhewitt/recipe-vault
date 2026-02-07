## Context

The recipe book index was recently updated to be responsive, but this introduced several regressions: duplicated letter headers on desktop and inconsistent re-rendering on orientation change. Additionally, the lack of automated GUI tests and a mock LLM response for the "list" action makes the feature fragile.

## Goals / Non-Goals

**Goals:**
- Fix index rendering to ensure cohesive grouping and prevent header duplication.
- Ensure `showRecipeLoading` correctly handles mobile single-page layout.
- Guarantee that the index always displays fresh data by using `showIndex()` in responsive listeners.
- Add E2E tests for the index feature on both desktop and mobile (using existing LLM mock infrastructure).

**Non-Goals:**
- Redesigning the index aesthetic.
- Adding search or filter functionality.

## Decisions

### Decision 1: Robust Grouping Logic
**Choice:** Compute the alphabetical groups for the *entire* recipe list first, then distribute these groups across pages.
**Rationale:** The previous logic split the flat recipe list by count and then grouped each half. This caused headers to repeat if a letter's recipes were split across the midpoint. Grouping first ensures each letter group is treated as a unit.

### Decision 2: Single-Page Aware Loading State
**Choice:** Modify `showRecipeLoading()` to check `isMobile()` and only show the left page skeleton if true.
**Rationale:** On mobile, the right page is hidden (`display: none`). Showing a loading skeleton on a hidden page is wasteful and can cause layout shifts when the content finally arrives.

### Decision 3: Use `showIndex()` for Responsive Transitions
**Choice:** When the viewport crosses the 600px boundary, call `showIndex()` instead of manually re-fetching and re-rendering.
**Rationale:** `showIndex()` is the established entry point for the index view. It handles state management (`viewMode = 'index'`), cache invalidation (`fetchRecipeList(true)`), and navigation UI updates in one call.

### Decision 4: Use Existing Mock LLM Implementation
**Choice:** Leverage the existing `LlmProvider::mock()` implementation in `src/ai/llm.rs` which already handles "list" queries (lines 164-171) and returns `list_recipes` tool calls.
**Rationale:** The mock provider is already complete and E2E tests already use it via `MOCK_LLM=true` environment variable. No changes needed — just use it in the new index tests.

## Risks / Trade-offs

- **[Risk] Large index on one page (Mobile)** → Mitigation: Ensure the single page is scrollable (already implemented in CSS).
- **[Trade-off] Performance of grouping first** → Rationale: The recipe list is small (typically < 100 recipes), so grouping in memory is negligible.
