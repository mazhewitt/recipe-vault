## Context

The Recipe Vault web UI is currently a functional but visually plain chat interface with a side panel for recipe display. All HTML, CSS, and JavaScript are embedded as string constants in `src/handlers/ui.rs`. The UI uses system fonts, a blue/gray color scheme, and standard form elements.

The user has provided:
- A comprehensive design system document (`design-system.md`) specifying colors, typography, components, and CSS
- A working HTML mockup (`recipe-app-mockup-v3.html`) demonstrating the target aesthetic

Key constraints:
- Must maintain the embedded HTML/CSS pattern in Rust (no build tooling changes)
- API contracts remain unchanged - only visual layer changes
- Recipe data model unchanged - must work with existing JSON structure
- User prioritizes "smooth and pleasant" over "snappy" - favor polish over performance

## Goals / Non-Goals

**Goals:**
- Transform the UI to a warm, family recipe book aesthetic
- Implement the notepad (chat) + recipe book (two-page) layout
- Provide smooth scrolling within both components that maintains the physical metaphor
- Use CSS custom properties for maintainable theming
- Keep all styles self-contained (no external CSS files beyond font import)

**Non-Goals:**
- Page-turning animations for multi-page recipes (too complex, save for future)
- Mobile-first responsive design (desktop-first, basic mobile fallback acceptable)
- Dark mode variant
- Offline support or PWA features
- Changing the login page aesthetic (can be a follow-up)

## Decisions

### 1. CSS Architecture: Design Tokens via Custom Properties

**Decision**: Use CSS custom properties (`:root` variables) at the top of the embedded stylesheet.

**Rationale**:
- Keeps all styling self-contained in the Rust string
- Enables future theming without hunting through CSS
- Matches the pattern in the provided design system
- Alternative considered: Sass/CSS-in-JS would require build tooling changes

**Implementation**: Define all colors, typography, spacing, and shadows as variables per `design-system.md`.

### 2. Scrolling Strategy: Independent Overflow with Visual Cues

**Decision**: Each scrollable region (notepad content, left page, right page) scrolls independently using `overflow-y: auto` with styled scrollbars and edge shadows.

**Rationale**:
- Maintains the physical metaphor (scroll within the paper/page)
- Simpler than page-turning mechanics
- User can see all content without interaction complexity
- Alternative considered: Page-turning would be more book-like but significantly more complex and could feel sluggish

**Implementation**:
- Notepad: `.notepad-content { overflow-y: auto; max-height: calc(100% - header - input); }`
- Recipe pages: Each page gets `overflow-y: auto` when content exceeds height
- Scrollbar styling: Custom thin scrollbar matching paper color (`::-webkit-scrollbar`)
- Edge shadows: CSS gradient overlays at top/bottom of scroll regions to indicate more content

### 3. Recipe Book Page Layout: Flexbox with Fixed Structure

**Decision**: Use flexbox for the two-page spread with ingredients always on left, preparation always on right.

**Rationale**:
- Matches the mockup exactly
- Predictable layout for recipe rendering
- Alternative considered: CSS Grid would work but flexbox is simpler for this two-column case

**Implementation**:
- Book container: `display: flex;` with the leather cover as a positioned pseudo-element
- Pages container: `display: flex;` with two `.page` children
- Metadata (difficulty, time, servings) anchored to bottom of left page with `margin-top: auto;`

### 4. Font Loading: Google Fonts with Fallback

**Decision**: Load Kalam font via Google Fonts CDN with a cursive fallback stack.

**Rationale**:
- Google Fonts is reliable and fast
- Kalam is the specified font in the design system
- Alternative considered: Self-hosting font would add complexity and file management

**Implementation**:
```html
<link href="https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&display=swap" rel="stylesheet">
```
Fallback: `font-family: 'Kalam', 'Caveat', cursive;`

### 5. Recipe Rendering: JavaScript Transform to Two-Page Format

**Decision**: Modify the existing `renderRecipe()` function to populate the two-page book structure instead of the current side panel.

**Rationale**:
- Reuses existing data flow (fetch recipe JSON → render)
- Keeps change isolated to the UI layer
- Alternative considered: New component system would over-engineer this

**Implementation**:
- Left page: Title, ingredients list, metadata icons
- Right page: Preparation steps, notes
- Empty state: Show placeholder text ("Select a recipe to view") when no recipe loaded
- Loading state: Skeleton animation within book pages

### 6. Animation Approach: Subtle CSS Transitions

**Decision**: Use CSS transitions for state changes, avoid JavaScript animations.

**Rationale**:
- CSS transitions are smooth and GPU-accelerated
- User wants "pleasant" not "snappy" - 200-300ms transitions feel gentle
- Alternative considered: JavaScript animations (GSAP, etc.) would add dependencies

**Implementation**:
- Message appearance: `opacity` + `transform` transition (fade + slide up)
- Recipe loading: Skeleton shimmer (existing pattern, adapt colors)
- Hover states: Subtle shadow/scale changes on interactive elements
- No page-flip animations (explicitly a non-goal)

### 7. Responsive Approach: Desktop-First with Breakpoint Fallback

**Decision**: Optimize for 1200px+ viewport, stack layout vertically below 1000px.

**Rationale**:
- Primary use case is kitchen tablet/laptop
- The book metaphor doesn't work well on small phones anyway
- Alternative considered: Mobile-first would require significantly different UX for small screens

**Implementation**:
- Default: Side-by-side notepad + book layout
- Below 1000px: Stack notepad above book, both full-width
- Below 600px: Simplified single-column with tab switching (future enhancement, not in initial scope)

### 8. Timer Widget: Fixed Position with SSE Updates

**Decision**: Keep timer as fixed-position element, style as speech bubble per mockup.

**Rationale**:
- Timer needs to be visible regardless of scroll position
- Speech bubble aesthetic matches the warm, friendly tone
- Existing timer logic (if any) remains unchanged

**Implementation**:
- `position: fixed; top: 25px; right: 50px;`
- Speech bubble tail via `::before` and `::after` pseudo-elements
- Timer updates via existing SSE connection (no new backend needed)

## Risks / Trade-offs

**[Large CSS payload in Rust string]** → The embedded CSS will grow significantly. Mitigation: Well-organized with comments, CSS custom properties reduce repetition.

**[Google Fonts dependency]** → External network request required. Mitigation: Font is render-blocking with `display=swap`, fallback cursive font available immediately.

**[Scrollbar styling cross-browser]** → `::-webkit-scrollbar` only works in WebKit/Blink. Mitigation: Firefox/Safari will show default scrollbars, which is acceptable.

**[Long recipes may feel cramped]** → Fixed-height book pages could feel limiting for very long recipes. Mitigation: Independent page scrolling, potential future enhancement for page-turning.

**[Handwritten font readability]** → Kalam at small sizes may be harder to read. Mitigation: Minimum 12px for body text, ensure sufficient contrast per design system.
