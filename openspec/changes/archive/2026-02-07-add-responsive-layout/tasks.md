## 1. Viewport & Foundation

- [x] 1.1 Change viewport meta tag in `chat.html` from `width=1200` to `width=device-width, initial-scale=1.0`
- [x] 1.2 Remove `min-width: 700px` from `.book-container` in `styles.css` (let it be fluid)
- [x] 1.3 Remove fixed `width: 380px` from `.notepad-container` — replace with `max-width: 380px; width: 100%` for desktop, `width: 100%` for smaller screens

## 2. Tablet Layout (601–1024px)

- [x] 2.1 Replace the existing `@media (max-width: 1000px)` breakpoint with `@media (max-width: 1024px)` for the tablet layout
- [x] 2.2 Set `.app-container` to `flex-direction: column` in the tablet media query
- [x] 2.3 Use CSS `order: -1` on `.book-container` to place recipe book above notepad in the stacked layout
- [x] 2.4 Set recipe book height to approximately 55vh and notepad to approximately 40vh in the tablet layout
- [x] 2.5 Reduce body padding to `20px` in the tablet media query
- [x] 2.6 Reduce component gap from 40px to 24px in the tablet layout
- [x] 2.7 Adjust `.user-info` positioning for tablet (smaller top/right offsets)

## 3. Mobile Layout (≤600px)

- [x] 3.1 Add `@media (max-width: 600px)` media query for mobile styles
- [x] 3.2 Set body padding to `0` for edge-to-edge layout on mobile
- [x] 3.3 Hide `.section-label` elements on mobile (labels move to tab bar)
- [x] 3.4 Make `.notepad-container` and `.book-container` full height but hidden by default
- [x] 3.5 Show only the active view based on `data-active-tab` attribute on `.app-container`
- [x] 3.6 Style `.notepad-paper` with `border-radius: 0` on mobile for edge-to-edge appearance
- [x] 3.7 Reduce notepad internal padding for mobile (header and content areas)

## 4. Mobile Tab Bar

- [x] 4.1 Add `.mobile-tab-bar` HTML element to `chat.html` with "Book" and "Chat" tab buttons
- [x] 4.2 Style the tab bar as fixed bottom bar with paper-aged background and border-top
- [x] 4.3 Style active tab with leather color and bottom indicator
- [x] 4.4 Hide the tab bar on viewports wider than 600px using media query
- [x] 4.5 Add JS tab switching: set `data-active-tab` attribute on `.app-container` when tabs are clicked
- [x] 4.6 Set default active tab to "book" on page load when on mobile
- [x] 4.7 Ensure tab bar doesn't obstruct input or behaves correctly when virtual keyboard is visible (e.g., hide or adjust position on focus)

## 5. Mobile Book View — Single Page

- [x] 5.1 Hide `.page-right` on mobile via CSS media query
- [x] 5.2 Make `.page-left` full width (remove border-radius split, remove right-side shadow)
- [x] 5.3 Reduce book cover border thickness to 4px on mobile
- [x] 5.4 Hide the book spine shadow (`.book-cover::after`) on mobile
- [x] 5.5 Reduce page padding from `20px 28px` to `16px` on mobile

## 6. Mobile Recipe Rendering

- [x] 6.1 Add `isMobile()` helper function in `app.js` using `window.matchMedia('(max-width: 600px)')`
- [x] 6.2 Modify `displayRecipe()` to render full recipe (ingredients + preparation + metadata) into `page-left-content` when `isMobile()` is true, leaving `page-right-content` empty
- [x] 6.3 Modify `renderIndex()` to render all recipes as a single column in `page-left-content` when `isMobile()` is true, leaving `page-right-content` empty

## 7. Touch Targets

- [x] 7.1 Increase `.page-nav` size to at least 44px x 44px in the tablet/mobile media queries
- [x] 7.2 Increase padding on `.index-recipe-item` to ensure 44px minimum tap height on tablet/mobile

## 8. Performance — Simplify Mobile Visuals

- [x] 8.1 Disable `body` SVG noise texture background on mobile (use solid gradient only)
- [x] 8.2 Disable `.book-cover::before` leather SVG texture on mobile
- [x] 8.3 Reduce box-shadow complexity on mobile (fewer shadow layers, lighter values)

## 9. Orientation & Resize Handling

- [x] 9.1 Add `matchMedia` listener in `app.js` to re-render recipe/index when crossing the 600px boundary (e.g., phone orientation change)
- [x] 9.2 Ensure tab bar visibility toggles correctly when resizing across the 600px boundary

## 10. Responsive User Info

- [x] 10.1 Restyle `.user-info` for mobile — smaller font, tighter padding, adjusted positioning
- [x] 10.2 Adjust `.timer-widget` positioning for mobile — smaller, no speech bubble tail

## 11. Testing & Verification

- [x] 11.1 Add Mobile Chrome and Tablet (iPad) profiles to `playwright.config.ts`
- [x] 11.2 Add E2E test for mobile tab switching behavior
- [x] 11.3 Add E2E test for single-page recipe rendering on mobile viewports
- [x] 11.4 Verify layout on desktop after all changes to ensure no regressions
