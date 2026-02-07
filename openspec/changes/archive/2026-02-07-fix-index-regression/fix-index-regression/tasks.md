## 1. Index Rendering Fixes

- [x] 1.1 Refactor `renderIndex` in `static/app.js` to group all recipes first, then intelligently distribute complete letter groups across pages to prevent header duplication
- [x] 1.2 Update `showRecipeLoading` in `static/app.js` to check `isMobile()` and only render skeleton to `rightContent` when false
- [x] 1.3 Update `setupResponsiveListeners` in `static/app.js` line 136 to call `showIndex()` instead of `fetchRecipeList().then(renderIndex)` to ensure fresh data

## 2. E2E Testing

- [x] 2.1 Create `tests/e2e/tests/index.spec.ts` with test for desktop index rendering (verify two-column split, letter headers not duplicated)
- [x] 2.2 Add test for mobile index rendering (single column with all recipes)
- [x] 2.3 Add test for clicking recipe name in index navigates to recipe view
- [x] 2.4 Add test for forward arrow from index loads first recipe
- [x] 2.5 Add test for empty state rendering when no recipes exist
- [x] 2.6 Add test for index refresh after orientation change (viewport crosses 600px boundary)
- [x] 2.7 Verify all tests pass across chromium, mobile-chrome, and ipad profiles
