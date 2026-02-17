## 1. Index Alphabet Navigation Markup

- [x] 1.1 Update index rendering logic to output a top-of-index A–Z navigation row in index view only.
- [x] 1.2 Add deterministic letter section targets/IDs for rendered index groups so each active letter has a scroll destination.
- [x] 1.3 Mark letters with no matching recipes as disabled and non-interactive in rendered markup/state.

## 2. Interaction Behavior

- [x] 2.1 Implement click handling for active letters to scroll/jump to matching section targets.
- [x] 2.2 Ensure repeated clicks on the same letter are stable and do not throw errors.
- [x] 2.3 Preserve existing index recipe click behavior after letter jump navigation.

## 3. Styling and Responsive Behavior

- [x] 3.1 Add CSS for compact alphabet controls with minimal extra padding while keeping controls clearly clickable.
- [x] 3.2 Add distinct visual styles for active vs disabled letters consistent with existing design tokens.
- [x] 3.3 Ensure alphabet row remains usable and non-overlapping in both wide (two-page) and narrow (stacked) layouts.

## 4. Validation

- [x] 4.1 Verify letter jump behavior with long index data and sparse-letter datasets (including disabled letters).
- [x] 4.2 Verify responsive behavior at desktop and narrow breakpoints for visibility, clickability, and scroll targeting.
- [x] 4.3 Verify no regressions to index grouping, recipe selection, and existing left/right navigation behavior.