## 1. State Management

- [x] 1.1 Add `viewMode` variable (`'index'` | `'recipe'`) to `app.js`, initialized to `'index'`
- [x] 1.2 Update `fetchAndDisplayRecipe()` to set `viewMode = 'recipe'` when displaying a recipe
- [x] 1.3 Add `showIndex()` function that sets `viewMode = 'index'`, fetches fresh recipe list, and calls `renderIndex()`

## 2. Index Rendering

- [x] 2.1 Add `renderIndex(recipes)` function that splits the recipe list in half, groups each half under letter headers, and renders clickable recipe names into left and right page content
- [x] 2.2 Handle empty state: when the recipe list is empty, render a friendly message ("Your recipe book is empty. Ask me to create a recipe!")
- [x] 2.3 Add click handlers on recipe names in the index that call `fetchAndDisplayRecipe(id)`

## 3. Navigation Logic

- [x] 3.1 Update `updateNavigationState()` to handle `viewMode === 'index'`: disable back arrow, enable forward arrow only if recipes exist
- [x] 3.2 Update `loadPrevRecipe()`: when on the first recipe (index 0), call `showIndex()` instead of doing nothing
- [x] 3.3 Update `loadNextRecipe()`: when `viewMode === 'index'`, load the first recipe
- [x] 3.4 Update `loadPrevRecipe()`: when current recipe not found in list, call `showIndex()` instead of loading first recipe

## 4. Page Load Integration

- [x] 4.1 Update `DOMContentLoaded` handler to call `showIndex()` instead of just `fetchRecipeList().then(updateNavigationState)`

## 5. Styling

- [x] 5.1 Add CSS for index letter headers (larger/bolder, consistent with Kalam font)
- [x] 5.2 Add CSS for clickable recipe names (cursor pointer, hover effect with color change or underline)
- [x] 5.3 Add CSS for index title ("Index" or similar header text on the first page)
- [x] 5.4 Ensure index content scrolls within pages (uses existing page scroll behavior)

## 6. Testing

- [x] 6.1 Verify index displays on page load with existing recipes
- [x] 6.2 Verify empty state displays when no recipes exist
- [x] 6.3 Verify clicking a recipe name navigates to that recipe
- [x] 6.4 Verify arrow-right from index loads first recipe
- [x] 6.5 Verify arrow-left from first recipe returns to index
- [x] 6.6 Verify arrow-left on index is disabled
- [x] 6.7 Verify index refreshes when navigating back (shows newly created/deleted recipes)
