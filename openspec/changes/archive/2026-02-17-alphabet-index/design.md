## Context

The recipe index currently groups recipe names by first letter and supports selecting recipe entries, but it does not provide fast letter-to-letter navigation when the index is long. The requested behavior is a compact clickable alphabet at the top of the index that jumps to the corresponding letter section and works across responsive layouts.

The current frontend is implemented in static JavaScript and CSS under `static/`, with index rendering and page behavior already split between index and recipe views. Existing requirements in `recipe-book-index` and `family-recipe-ui` define grouping, styling, and responsive behavior, so this change extends those capabilities without introducing new backend contracts.

## Goals / Non-Goals

**Goals:**
- Add an A–Z control at the top of the index view for direct letter navigation.
- Ensure each active letter scrolls to its corresponding section within the index pages.
- Keep alphabet controls compact (minimal extra padding) while remaining clearly clickable.
- Preserve existing index grouping, recipe click-through, and navigation-arrow behavior.
- Ensure usability across both wide and stacked responsive layouts.

**Non-Goals:**
- No API changes or additional backend endpoints.
- No changes to recipe sort rules beyond existing alphabetical ordering.
- No redesign of the broader recipe-book visual system.

## Decisions

### Decision: Add a dedicated alphabet navigation row in index render path
- The index render path will emit a top-level alphabet control before grouped recipe entries.
- Active letters map to letters present in the current recipe dataset; inactive letters are shown but non-interactive.
- This keeps behavior discoverable and consistent with cookbook/table-of-contents expectations.

Alternative considered:
- Only render letters that exist in data. Rejected because full A–Z provides predictable scanning and clear inactive state.

### Decision: Use anchor-style section targets with controlled scroll behavior
- Each rendered letter section receives a stable DOM target keyed by letter.
- Clicking an active letter triggers scroll/jump to that section target in the index container.
- Use browser-native smooth scroll where available, with immediate jump fallback.

Alternative considered:
- Manual pixel-offset bookkeeping per section. Rejected because it is brittle with responsive layout and dynamic content height.

### Decision: Keep compact hit targets through typography-first spacing
- Alphabet controls will use tight horizontal spacing and minimal vertical padding to meet the “small but clickable” request.
- Maintain readability and operability using existing design tokens and responsive font scaling.
- In narrow layouts, allow wrapping or horizontal fit behavior without overlapping recipe content.

Alternative considered:
- Large button-style chips for each letter. Rejected because it adds visual weight and conflicts with the requested compact appearance.

## Risks / Trade-offs

- [Risk] Scroll target ambiguity when letters span both pages in split layout. → Mitigation: define deterministic section targeting based on rendered section ownership per page.
- [Risk] Compact controls may reduce touch usability on very narrow viewports. → Mitigation: preserve minimum clickable area while reducing decorative padding.
- [Risk] Smooth scrolling may behave differently across browsers. → Mitigation: rely on standard scroll behavior with graceful non-animated fallback.

## Migration Plan

1. Update index render logic to output alphabet controls and letter section IDs.
2. Add click handlers for active letters and no-op handling for inactive letters.
3. Add/update styles for compact alphabet controls and responsive wrapping.
4. Validate behavior on wide and narrow layouts and with long recipe lists.
5. Deploy as frontend-only change; rollback by reverting static JS/CSS changes if needed.

## Open Questions

- Should letter navigation target the first occurrence across both pages or remain page-local where the letter is rendered?
- Should inactive letters be hidden on very narrow viewports, or always shown as disabled for consistency?