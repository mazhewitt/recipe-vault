## Why

Currently, users can only view recipes by asking the chat AI to display them. There's no way to browse through recipes directly in the recipe book UI. Adding simple navigation arrows lets users flip through their recipe collection alphabetically without chat interaction.

## What Changes

- Add recipe list state to frontend (alphabetically sorted by name)
- Add "<" navigation arrow at top-left of left page to go to previous recipe
- Add ">" navigation arrow at top-right of right page to go to next recipe
- Fetch and cache recipe list on page load for navigation
- Disable/hide arrows at list boundaries (no previous on first, no next on last)

## Capabilities

### New Capabilities

- `recipe-browsing`: Navigation controls and state management for browsing through recipes sequentially in alphabetical order

### Modified Capabilities

- `family-recipe-ui`: Adding navigation arrow elements to the recipe book pages

## Impact

- **Frontend**: New JavaScript state for recipe list and current index; new arrow elements in HTML; CSS for arrow styling and positioning
- **API**: May need to ensure `/api/recipes` returns recipes in alphabetical order (or sort client-side)
- **UX**: Users can now browse recipes without chat; complements existing chat-based recipe discovery
