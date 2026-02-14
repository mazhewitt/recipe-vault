## 1. Photo preview interaction

- [x] 1.1 Locate the recipe photo rendering in the static UI and remove the replace-image control and any related handlers.
- [x] 1.2 Add a click handler on the recipe photo to open a full-window overlay preview using the existing photo URL.
- [x] 1.3 Implement overlay dismissal (click/escape) and ensure the preview image is constrained to the viewport.

## 2. Header navigation to index

- [x] 2.1 Make the "Recipe Book" header clickable in the recipe book UI.
- [x] 2.2 On header click, render the index view with a fresh `/api/recipes` fetch and clear the current recipe context.

## 3. Styling and validation

- [x] 3.1 Add CSS for the full-window preview overlay and image sizing to match the handwritten theme.
- [x] 3.2 Manually verify: image preview opens/closes, replace control is absent, and header click returns to index from a recipe.
