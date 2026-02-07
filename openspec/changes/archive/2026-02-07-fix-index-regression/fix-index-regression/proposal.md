## Why

The recipe book index feature has regressions following the responsive layout update (e.g., duplicated headers, inconsistent rendering on mobile). Furthermore, the lack of automated GUI tests and dedicated mock LLM responses for the index makes it difficult to verify behavior and prevent future regressions. This change ensures the index is robust, responsive, and fully tested.

## What Changes

- **Fix `renderIndex` logic**: Ensure recipes are correctly grouped and split across pages without duplicating letter headers.
- **Responsive Loading State**: Update `showRecipeLoading` to respect the mobile single-page layout (hide the right page skeleton).
- **Correct State Integration**: Update `setupResponsiveListeners` to use `showIndex()` instead of partial re-rendering, ensuring the index always displays fresh data as per spec.
- **Add Index E2E Tests**: Implement a new Playwright test suite specifically for the recipe book index (initial load, navigation, empty state, and responsive behavior). Note: LLM mocking already exists and supports "list" queries.

## Capabilities

### Modified Capabilities
- `recipe-book-index`: Fix rendering logic and state management integration.
- `browser-testing`: Add E2E coverage for the index view.

## Impact

- `static/app.js`: Refactored `renderIndex`, `showRecipeLoading`, and resize handlers.
- `tests/e2e/tests/index.spec.ts`: New E2E test suite.
- No backend changes: LLM mock provider already supports "list" queries via existing `src/ai/llm.rs` implementation.
