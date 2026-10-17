# Cook page polish: uneven spacing in the ingredient list, and small reply text

Status: needs-triage
Reported: 2026-10-17
Reporter: Claude (usability audit, openspec/changes/steady-cooking-spread/audit-summary.md)
Severity: low (polish).

## Description

### 1. Uneven spacing in the cook-mode ingredient list (`cook-ingredient-uneven-spacing`, cook)

In cook mode each ingredient is `display: block`, but the items are still wrapped in the packed `.ingredient-line` groups of up to three, and each group has `margin-bottom: 3px`. The list therefore has a slightly larger gap after every second or third item, which makes the quantities harder to scan.

- Evidence: the screenshots `tablet-01-lasagne.png` and `tablet-30-drizzle.png` in the audit session's `audit/cook/shots/` show visibly uneven gaps, for example after "chopped tomatoes" and after "beef stock".
- Cause:
  - `static/recipe-display.js:496-531` (`renderIngredients` packs up to three per line);
  - `static/styles.css:796-798` (`.ingredient-line` margin);
  - `static/styles.css:1927-1933` (cook-mode block items).
- After steady-cooking-spread D2 the packed form is never shown above 600px: the ingredients are on screen only in cook mode, and the phone already shows one per line. Cook mode could therefore render one item per line outright.
- Related: item 1 of `.scratch/book-spread-modes-follow-ups/02-open-decisions.md`.

### 2. Replies are small next to the recipe (part of `small-targets-and-text`, ask)

- Replies are 14px Kalam (`styles.css:1796-1800`); status lines are 13px italic.
- After steady-cooking-spread D9 the method is 18px, so a reply on the new sticky is hard to read at 60cm by comparison.
- D9 keeps the Notes thread's sizes, and it does not set a size for the reply sticky.

## What a fix needs

- Render one ingredient per line in cook mode, with even spacing between items. Consider a quantity column for scanning.
- Decide the reply sticky's type size: at least 16px is suggested, or 18px to match cook mode.
- Neither needs a spec change beyond family-recipe-ui "Recipe text is sized for reading from the counter", which this could extend to the sticky.
