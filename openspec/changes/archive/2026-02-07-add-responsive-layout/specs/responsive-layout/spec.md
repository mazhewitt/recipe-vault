## ADDED Requirements

### Requirement: Viewport uses device width

The HTML viewport meta tag SHALL use `width=device-width, initial-scale=1.0` to enable responsive rendering on all devices.

#### Scenario: Viewport meta tag is correct

- **WHEN** the chat page HTML is loaded
- **THEN** the viewport meta tag specifies `width=device-width, initial-scale=1.0` instead of a hardcoded width

### Requirement: Three responsive breakpoints define layout modes

The layout SHALL adapt across three breakpoints: desktop (>1024px), tablet (601–1024px), and mobile (≤600px).

#### Scenario: Desktop layout above 1024px

- **WHEN** the viewport width is greater than 1024px
- **THEN** the notepad and recipe book display side by side (desktop layout)

#### Scenario: Tablet layout between 601px and 1024px

- **WHEN** the viewport width is between 601px and 1024px
- **THEN** the layout stacks vertically with the recipe book on top and the chat below

#### Scenario: Mobile layout at 600px or below

- **WHEN** the viewport width is 600px or less
- **THEN** only one view is visible at a time (recipe book or chat), controlled by a tab bar

### Requirement: Mobile tab bar provides view switching

A bottom tab bar SHALL be displayed on mobile viewports (≤600px) to switch between the recipe book and chat views.

#### Scenario: Tab bar visible on mobile only

- **WHEN** the viewport width is 600px or less
- **THEN** a fixed bottom tab bar is visible with "Book" and "Chat" tabs
- **AND** the tab bar is hidden on viewports wider than 600px

#### Scenario: Default tab is Book

- **WHEN** the page loads on a mobile viewport
- **THEN** the "Book" tab is active and the recipe book view is visible

#### Scenario: Switching to Chat tab

- **WHEN** the user taps the "Chat" tab
- **THEN** the chat/notepad view becomes visible and the recipe book is hidden
- **AND** the "Chat" tab shows as active

#### Scenario: Switching to Book tab

- **WHEN** the user taps the "Book" tab
- **THEN** the recipe book view becomes visible and the chat is hidden
- **AND** the "Book" tab shows as active

### Requirement: Mobile recipe renders as single scrollable page

On mobile viewports (≤600px), recipes SHALL render in a single scrollable page instead of a two-page spread.

#### Scenario: Single page recipe on mobile

- **WHEN** a recipe is displayed on a mobile viewport
- **THEN** the recipe title, ingredients, metadata, and preparation steps render in one continuous scrollable page
- **AND** the right page is hidden

#### Scenario: Two-page spread on tablet and desktop

- **WHEN** a recipe is displayed on a viewport wider than 600px
- **THEN** the recipe renders in the standard two-page spread (left: ingredients, right: preparation)

### Requirement: Mobile index renders as single column

On mobile viewports (≤600px), the recipe index SHALL render as a single scrollable column instead of splitting across two pages.

#### Scenario: Single column index on mobile

- **WHEN** the index is displayed on a mobile viewport
- **THEN** all recipes render in a single alphabetically-ordered column on one page
- **AND** the right page is hidden

#### Scenario: Two-column index on tablet and desktop

- **WHEN** the index is displayed on a viewport wider than 600px
- **THEN** the index splits across left and right pages as normal

### Requirement: Touch targets meet minimum size on touch devices

All interactive elements SHALL have a minimum tap target size of 44px x 44px on tablet and mobile viewports.

#### Scenario: Navigation arrows are touch-friendly

- **WHEN** the viewport is 1024px or less
- **THEN** the navigation arrow buttons are at least 44px x 44px

#### Scenario: Index recipe items are tappable

- **WHEN** the index is displayed on a viewport 1024px or less
- **THEN** each recipe name has at least 44px of vertical tap area (via padding)

### Requirement: Visual effects are simplified on mobile

Heavy visual effects SHALL be reduced or removed on mobile viewports (≤600px) for performance.

#### Scenario: SVG noise texture disabled on mobile

- **WHEN** the viewport is 600px or less
- **THEN** the body background SVG noise texture overlay is not rendered

#### Scenario: Leather texture filter disabled on mobile

- **WHEN** the viewport is 600px or less
- **THEN** the book cover SVG turbulence texture is not rendered (the leather gradient alone is used)

#### Scenario: Shadow complexity reduced on mobile

- **WHEN** the viewport is 600px or less
- **THEN** box-shadow values use fewer layers and lighter opacity compared to desktop

### Requirement: Layout adapts to orientation changes

The layout SHALL respond to device orientation changes without requiring a page reload.

#### Scenario: iPad rotates from portrait to landscape

- **WHEN** an iPad rotates from portrait (768px wide) to landscape (~1024px wide)
- **THEN** the layout transitions from tablet stacked mode to desktop side-by-side mode (or remains in tablet mode if landscape width is ≤1024px)

#### Scenario: Phone rotates from portrait to landscape

- **WHEN** a phone rotates from portrait (~375px) to landscape (~667px)
- **THEN** the layout transitions appropriately between mobile and tablet modes based on the new width
