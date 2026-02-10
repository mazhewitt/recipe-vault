## Why

Some recipes include step-level timing, but the UI never surfaces the total time, which makes it harder to gauge how long a recipe takes at a glance. Showing total time alongside other optional metadata (like servings) improves planning without cluttering the layout.

## What Changes

- Compute and display a total time value in the recipe metadata area, next to difficulty, when timing data is available.
- Keep the metadata section optional behavior consistent (hide the total time element when no timing data exists).

## Capabilities

### New Capabilities
- `recipe-total-time`: Derive a total duration from available recipe timing data (step durations and/or prep/cook times) for display in the UI.

### Modified Capabilities
- `family-recipe-ui`: Extend recipe metadata display to include total time when present, with optional rendering rules.

## Impact

- Frontend recipe rendering and metadata layout (likely [static/app.js](static/app.js) and [static/styles.css](static/styles.css)).
- Possibly the recipe view model used to pass timing data to the UI if a derived total needs to be exposed.
