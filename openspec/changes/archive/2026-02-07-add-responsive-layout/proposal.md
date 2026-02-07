## Why

The Recipe Vault UI is currently desktop-only (hardcoded `width=1200` viewport). Users accessing the app on iPad or mobile phones see a scaled-down desktop view that is difficult to read and interact with. The app needs a responsive layout that adapts to tablet and phone screens while preserving the handwritten cookbook aesthetic.

## What Changes

- **Fix viewport meta tag** to use `width=device-width` instead of hardcoded `width=1200`
- **Add tablet layout (601-1024px)**: Stack recipe book on top, chat below, preserving two-page book spread
- **Add mobile layout (≤600px)**: Tab-switching between recipe book and chat views, single-page book instead of two-page spread, bottom tab bar for navigation
- **Add mobile tab bar component**: Fixed bottom bar with "Book" and "Chat" tabs
- **Adapt recipe rendering for single-page mobile view**: Full recipe in one scrollable page instead of split across left/right pages
- **Adapt index rendering for mobile**: Single scrollable column instead of two-page split
- **Increase touch targets**: Navigation arrows and interactive elements sized to minimum 44px on touch devices
- **Simplify visual effects on mobile**: Reduce/remove heavy SVG textures and shadow layers for performance

## Capabilities

### New Capabilities
- `responsive-layout`: Defines the responsive breakpoints, layout modes (desktop side-by-side, tablet stacked, mobile tabbed), and the mobile tab bar component

### Modified Capabilities
- `family-recipe-ui`: Main layout requirements change from desktop-only to responsive with three layout modes. Book and notepad dimensions become fluid. Mobile hides section labels.
- `recipe-book-index`: Index split across two pages changes to single-column on mobile
- `recipe-browsing`: Navigation arrow sizing increases on touch devices. No behavioral changes.

## Impact

- **`static/chat.html`**: Viewport meta change, add mobile tab bar HTML, potentially reorder DOM for recipe-book-first on tablet
- **`static/styles.css`**: New media queries for tablet (≤1024px) and mobile (≤600px), mobile tab bar styles, single-page book styles, touch target sizing
- **`static/app.js`**: Mobile tab switching logic, single-page recipe rendering for mobile, resize/orientation change handling, index single-column rendering on mobile
- **No backend changes**: This is entirely a frontend change
- **No API changes**: Same data, different presentation
