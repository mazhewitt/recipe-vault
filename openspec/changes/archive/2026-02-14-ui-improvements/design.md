## Context

The recipe book UI lives in static frontend assets, with recipe display, photo rendering, and navigation handled in JavaScript and styled via the shared CSS. The current recipe view includes photo affordances and a header that labels the book but does not act as navigation.

## Goals / Non-Goals

**Goals:**
- Remove the replace-image control from the recipe photo UI.
- Provide a full-window photo preview that fits within the viewport when a recipe image is clicked.
- Make the "Recipe Book" header clickable to return to the index view.

**Non-Goals:**
- Change backend photo upload, storage, or API behavior.
- Alter recipe navigation arrow behavior or index ordering.
- Introduce new dependencies or frameworks.

## Decisions

- Implement the photo preview as a lightweight overlay modal in the existing DOM, reusing the current recipe photo URL and applying `max-width`/`max-height` constraints so the image fits within the viewport.
- Remove the replace-image UI elements and any associated event handlers from the recipe photo rendering path to keep the photo view-only in the recipe display.
- Treat the "Recipe Book" header as a navigation control that triggers the same index-rendering flow as the back arrow from the first recipe, including clearing current recipe context and forcing a fresh index fetch.

## Risks / Trade-offs

- [Overlay blocks interactions unexpectedly] -> Ensure the overlay closes on click/escape and restores focus to the recipe view.
- [Large images overflow on small screens] -> Constrain the preview with viewport-based sizing and center alignment.
- [Header click conflicts with existing layout] -> Make the header clickable without altering its visual design or spacing.

## Migration Plan

- Deploy updated static assets (HTML/JS/CSS) to production.
- Rollback by restoring previous static asset versions if UI regressions appear.

## Open Questions

- Should the overlay close on click anywhere or only on a dedicated close control?
- Should the header click be enabled when already on the index view (no-op) or always re-fetch?
