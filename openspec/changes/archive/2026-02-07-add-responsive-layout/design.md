## Context

The Recipe Vault UI is currently desktop-only with a hardcoded `width=1200` viewport meta tag. The layout uses a fixed 380px notepad and a min-width 700px recipe book side by side. There is a single media query at 1000px that stacks them vertically, but it doesn't rethink the UX for smaller screens—the two-page book spread remains and is unreadable below ~700px.

The app serves a family audience who will access it from iPads in the kitchen and phones on the go. The design system document (`design-system.md`) has been created to guide the responsive strategy.

Current files involved: `static/chat.html` (HTML structure + viewport meta), `static/styles.css` (all styles including one breakpoint), `static/app.js` (rendering logic for recipe display, index, and navigation).

## Goals / Non-Goals

**Goals:**
- Make the app usable and attractive on iPad (portrait and landscape) and mobile phones
- Preserve the handwritten cookbook aesthetic across all screen sizes
- Recipe book is primary content on all layouts — never hidden behind the chat
- Touch-friendly interaction with adequate tap targets (44px minimum)
- Performance acceptable on mobile (reduce heavy SVG texture rendering)

**Non-Goals:**
- Native app or PWA features (offline, home screen install)
- Swipe gestures for recipe navigation (nice-to-have, not required for initial implementation)
- Responsive backend changes — this is purely frontend
- Redesigning the desktop layout — it stays as-is

## Decisions

### Decision 1: Three breakpoints with distinct layout modes

**Choice:** Desktop (>1024px), Tablet (601–1024px), Mobile (≤600px)

**Rationale:** The two-page book spread needs ~600px minimum to be readable (two pages at ~280px each plus padding and cover). Below 600px, a single-page view is necessary. The 601–1024px range covers iPad portrait (768px) and iPad landscape (~1024px), both of which can comfortably fit a two-page spread.

**Alternative considered:** Two breakpoints (desktop + mobile at 768px). Rejected because iPad portrait at 768px can still show the two-page spread and shouldn't lose it.

### Decision 2: Tablet layout — stacked with recipe book on top

**Choice:** `flex-direction: column` with recipe book first (using CSS `order` or DOM reordering), chat below.

**Rationale:** The user specified recipe book should be on top. The recipe book is the primary content — users visit to browse and read recipes, with chat as a supporting tool. Putting the book first ensures it's visible without scrolling.

**Implementation:** Use CSS `order: -1` on `.book-container` within the tablet media query rather than changing DOM order, to avoid JavaScript changes and keep desktop layout unaffected.

### Decision 3: Mobile layout — tab switching with bottom tab bar

**Choice:** New HTML element `.mobile-tab-bar` with two tabs ("Book" and "Chat"), hidden on desktop/tablet via media query. Only one view visible at a time on mobile.

**Rationale:** At ≤600px, neither component can share vertical space meaningfully. A tab-based approach gives each view full screen height. The bottom tab bar is the standard mobile navigation pattern.

**Alternative considered:** Slide-over panel where recipe slides up over chat. Rejected because it makes both views feel secondary and the gesture model is less discoverable.

**Implementation:** CSS-based visibility toggling. JS adds/removes a class on `.app-container` (e.g., `data-active-tab="book"` or `data-active-tab="chat"`). The tab bar buttons switch this attribute. Default tab on load: "book" (shows recipe index).

### Decision 4: Mobile recipe view — single scrollable page

**Choice:** On mobile, render the full recipe (title, ingredients, metadata, preparation steps) in a single scrollable page instead of splitting across left/right pages.

**Rationale:** Two 150px pages are unreadable. A single page at ~340px (screen width minus padding) provides comfortable reading.

**Implementation:** Add a `renderRecipeMobile(recipe)` function in `app.js` that renders the full recipe into `page-left-content` and hides `page-right`. Use a CSS media query to hide `.page-right` and make `.page-left` full width on mobile. The navigation arrows still work the same way (prev/next recipe).

### Decision 5: Mobile index — single column

**Choice:** Render the index as a single scrollable column on mobile instead of splitting across two pages.

**Implementation:** Add a `renderIndexMobile(recipes)` function or modify `renderIndex()` to detect mobile and render into a single page. Same approach as Decision 4 — hide right page, use full width left page.

### Decision 6: Screen size detection — CSS media queries + JS matchMedia

**Choice:** Use CSS media queries for layout/visibility changes. Use `window.matchMedia('(max-width: 600px)')` in JS to branch rendering logic (single-page vs two-page recipe rendering).

**Rationale:** CSS handles the visual layout efficiently. JS needs to know whether to render single-page or two-page because the HTML structure differs. Using `matchMedia` with a listener handles orientation changes and resize.

**Alternative considered:** Purely CSS (hide right page, widen left page). Partially viable for index but not for recipe content — the server returns recipe data that `displayRecipe()` splits into left/right pages. The JS rendering path needs to change.

### Decision 7: Viewport meta tag change

**Choice:** Change `<meta name="viewport" content="width=1200, initial-scale=1.0">` to `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.

**Rationale:** This is the fundamental blocker. Without this change, mobile browsers render the page at 1200px and scale down. All responsive CSS depends on this change.

### Decision 8: Simplify visual effects on mobile

**Choice:** On mobile, disable the SVG noise texture on the body background, disable the leather texture SVG filter on the book cover, and reduce shadow complexity.

**Rationale:** SVG filters (feTurbulence) are computationally expensive on mobile GPUs. The wood grain repeating gradient is lightweight and can stay. The leather cover gradient alone looks fine without the filter overlay.

## Risks / Trade-offs

- **[Risk] Existing desktop layout breaks** → Mitigated by adding new media queries below existing styles; desktop styles remain the default. Test desktop after changes.
- **[Risk] Tab bar conflicts with keyboard on mobile** → When the chat input is focused, the keyboard pushes content up. The tab bar may overlap. → Mitigate by hiding tab bar when input is focused, or use `position: sticky` instead of `fixed`.
- **[Risk] Recipe rendering fork (mobile vs desktop) increases maintenance** → Mitigated by keeping the fork minimal — same data, just different HTML assembly in one function. Consider a `isMobile()` check at the top of `displayRecipe`.
- **[Trade-off] No swipe gestures** → Users must tap arrows to navigate. This is simpler and avoids gesture conflicts with page scrolling. Can be added later.
- **[Trade-off] DOM order stays the same** → Using CSS `order` for tablet layout instead of changing DOM order. Screen readers will see notepad first, recipe second. Acceptable since both are landmarks.

## Open Questions

- Should the mobile book view retain the leather cover border (thin 4px) or go borderless for maximum content area?
- Should the tab bar use text labels, icons, or both?
