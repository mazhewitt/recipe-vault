## Why

The recipe index becomes hard to navigate as the number of recipes grows, especially when users want to jump quickly to a specific starting letter. Adding a clickable A–Z index improves findability and makes the index faster to use across desktop and mobile layouts.

## What Changes

- Add a clickable alphabetical navigation bar at the top of the recipe index view.
- Enable letter-based jump navigation so selecting a letter scrolls the index to that letter’s section.
- The index should be as small as is clickable with little extra padding
- Ensure letters with no matching recipes are visibly inactive and do not trigger jumps.
- Preserve current index grouping and page split behavior while adding jump targets for each rendered letter section.
- Ensure the alphabet navigation remains usable in all responsive layouts (wide two-panel and narrow stacked).

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `recipe-book-index`: Add requirements for a top-of-index clickable alphabet and letter jump/scroll behavior.
- `family-recipe-ui`: Add requirements ensuring the alphabet navigation is readable and operable across responsive breakpoints.

## Impact

- Affected frontend modules in `static/` that render and navigate the index (notably index rendering, navigation, and styles).
- No API contract changes expected.
- No database or migration changes expected.