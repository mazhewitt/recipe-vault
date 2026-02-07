## Why

When the recipe book web app loads, the right-side recipe book panel shows an empty placeholder ("Ask me to find or create a recipe..."). This wastes the most prominent UI element and gives no indication of what recipes already exist. Users must either chat to find recipes or blindly click navigation arrows. Replacing the empty state with an alphabetical recipe index makes the book feel alive on arrival and gives users immediate access to browse their collection.

## What Changes

- On page load, the recipe book displays an alphabetical index of all recipes instead of the placeholder
- The index is rendered as "page zero" of the book — the table of contents
- Left page shows the first half of recipes (alphabetically), right page shows the second half
- Each page scrolls independently if the list is long (consistent with existing page scroll behavior)
- Clicking a recipe name in the index navigates directly to that recipe
- Arrow navigation treats the index as the first page: arrow-left from the first recipe returns to the index, arrow-left from the index is disabled
- The index always fetches fresh from `/api/recipes` (no caching) so newly created/deleted recipes appear immediately
- When zero recipes exist, the index shows a friendly empty message

## Capabilities

### New Capabilities
- `recipe-book-index`: The table-of-contents view that displays all recipes alphabetically as the default state of the recipe book, with clickable navigation to individual recipes

### Modified Capabilities
- `recipe-browsing`: Navigation logic changes to treat the index as "page zero" — arrow-left from the first recipe returns to the index instead of being disabled
- `family-recipe-ui`: The empty/placeholder state is replaced by the index view; minor styling additions for the index layout (letter headers, clickable recipe names)

## Impact

- **Frontend JS** (`static/app.js`): New index rendering function, updated navigation state machine to include index as page zero, click handlers for recipe names
- **Frontend HTML** (`static/chat.html`): Minor markup changes if needed for index container
- **Frontend CSS** (`static/styles.css`): Index-specific styles (letter headers, clickable recipe list items, table-of-contents aesthetic)
- **Backend**: No changes needed — `/api/recipes` already returns the alphabetically sorted list with titles and IDs
