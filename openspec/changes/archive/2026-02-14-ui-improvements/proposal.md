## Why

The recipe book UI needs simpler, more intuitive image and navigation interactions so users can quickly view photos and return to the index without extra controls.

## What Changes

- Remove the replace-image control from the recipe photo UI.
- Clicking a recipe photo opens a larger, full-window preview that fits within the viewport.
- Clicking the "Recipe Book" header navigates back to the recipe index view.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `family-recipe-ui`: Update recipe photo interactions to remove replace controls and add full-window preview on click.
- `recipe-book-index`: Add navigation to index when the Recipe Book header is clicked.

## Impact

- Frontend UI behavior and styling for recipe photos and header navigation.
- Likely changes in static assets handling recipe display and navigation logic.
