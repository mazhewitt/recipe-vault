## Why

The Journal 2.0 direction (`planned-ideas/ui-v2-journal/README.md`, chosen 2026-09-05) keeps the recipe book but makes it read like a real cookbook. The two cheapest, most visible pieces are typography and the index: today every word is in Kalam, which is charming for titles but tiring for ingredient lists and method steps, and the "~ Index ~" page is a plain list of names with no thumbnails, no page numbers and no sense of place. This change is build step 1 of 5 and lays groundwork (font token, step DOM, page-number rule) that the later steps reuse.

It also fixes a live bug: the recipe renderer reads `prep_time` / `cook_time` but the API emits `prep_time_minutes` / `cook_time_minutes`, so prep/cook metadata never renders and total time falls through to step durations.

## What Changes

- Load Libre Baskerville alongside Kalam; add a `--font-serif` design token. Ingredients, method steps and contents entries switch to the serif; titles, headers, labels, step numbers and metadata stay in Kalam.
- The index becomes "~ Contents ~": title first, then the A–Z strip, then letter groups whose rows carry a polaroid thumbnail (or an empty dashed polaroid when the recipe has no photo), the recipe name in serif, and a cosmetic page number. A footer gives the recipe count ("continued overleaf" on the desktop left page). The row for the recipe the reader just left is highlighted and scrolled into view.
- Recipe pages: the "preparation" header becomes "method:", each step gets a red Kalam step number and a `data-step` attribute, ingredient quantities get their own span, and the four metadata tiles collapse into one handwritten meta line (total time · serves · difficulty dots, with prep/cook muted in parentheses).
- Fix the prep/cook field-name mismatch.
- Cache-busting: the chat page references `styles.css?v=<version>` and `app.js?v=<version>` (version from `CARGO_PKG_VERSION`), and static assets are served with `Cache-Control: no-cache` so un-versioned module imports revalidate via ETag.
- `design-system.md` typography section updated to the Journal type table.

No layout change: the notepad stays, the two-page index split and independent page scrolling stay.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `family-recipe-ui`: typography becomes Kalam + Libre Baskerville; `--font-serif` token; recipe metadata renders as a single meta line; right-page header reads "method:"
- `recipe-book-index`: index is titled "Contents", rows carry polaroid thumbnails and page numbers, footer shows counts, A–Z strip sits under the title, last-viewed recipe is highlighted
- `static-asset-serving`: chat page references versioned asset URLs and the module entry script; static responses carry `Cache-Control: no-cache`

## Impact

- `static/chat.html` — font link + preconnect, versioned asset URLs
- `static/styles.css` — `--font-serif`, contents styling, recipe body serif + step numbers, meta line, mobile overrides
- `static/recipe-display.js` — `pageNumberFor`, `renderIndex(recipes, opts)`, `renderRecipe` DOM changes, field-name fix
- `static/app.js`, `static/navigation.js` — `lastRecipeId` / `photoEpoch` in shared state; pass `currentRecipeId` to `renderIndex`
- `src/handlers/ui.rs` — `{{asset_version}}` substitution; `src/main.rs` — `Cache-Control` header on `/static`
- `design-system.md` — typography section
- `tests/e2e` — `ui-improvements.spec.ts`, `responsive.spec.ts`, `index.spec.ts`, `recipe-display.spec.ts`
