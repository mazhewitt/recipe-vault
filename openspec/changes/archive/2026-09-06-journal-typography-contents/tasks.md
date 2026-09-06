## 1. HTML and backend

- [x] 1.1 `static/chat.html`: add `preconnect` to fonts.gstatic.com and extend the Google Fonts link with Libre Baskerville (400/700, italic 400)
- [x] 1.2 `static/chat.html`: reference `/static/styles.css?v={{asset_version}}` and `/static/app.js?v={{asset_version}}`
- [x] 1.3 `src/handlers/ui.rs`: substitute `{{asset_version}}` with `env!("CARGO_PKG_VERSION")`; add a test asserting the rendered chat page contains `styles.css?v=`
- [x] 1.4 `src/main.rs`: wrap the `/static` `ServeDir` with `SetResponseHeaderLayer` adding `Cache-Control: no-cache`

## 2. CSS (`static/styles.css`)

- [x] 2.1 Add `--font-serif` token next to `--font-handwritten`
- [x] 2.2 Contents page: title, A–Z strip under the title, row grid (polaroid / name / page number), `.index-polaroid` and `.empty` variant with alternating rotation, `.index-page-number`, `.current` highlight, `.index-footer`; remove the `translateX(4px)` hover
- [x] 2.3 Recipe body: `.ingredients-list` and `.prep-list` in serif 14px; `.ingredient-qty`; `.prep-step` with absolutely positioned Kalam `.step-number`
- [x] 2.4 Replace `.recipe-meta` tile styles with `.recipe-meta-line`
- [x] 2.5 Mobile (`@media (max-width: 600px)`): row name 16px, polaroid 48×40, meta line wraps

## 3. JavaScript

- [x] 3.1 `static/recipe-display.js`: export `pageNumberFor(index)`; `renderIndex(recipes, { currentRecipeId })` renders title, strip, groups with the new row DOM, footer, highlight and scroll-into-view
- [x] 3.2 `static/recipe-display.js`: `renderRecipe` emits `.ingredient-qty`, `.prep-step[data-step]` with `.step-number`/`.step-text`, "method:" header, `.recipe-meta-line`; drop `.serving-note`
- [x] 3.3 `static/recipe-display.js`: read `prep_time_minutes ?? prep_time` and `cook_time_minutes ?? cook_time` in `getTotalTimeMinutes` and the meta line
- [x] 3.4 `static/app.js`: add `lastRecipeId` and `photoEpoch` to shared state; set `lastRecipeId` in `fetchAndDisplayRecipe`; bump `photoEpoch` after a successful photo upload; pass `{ currentRecipeId }` at both `renderIndex` call sites
- [x] 3.5 `static/navigation.js`: `showIndex` passes `{ currentRecipeId: state.lastRecipeId }` to `renderIndex`

## 4. Documentation

- [x] 4.1 `design-system.md`: replace the typography section with the Journal type table, add `--font-serif`, record the contrast rule

## 5. Tests

- [x] 5.1 `tests/e2e/tests/ui-improvements.spec.ts`: "Index" → "Contents"; `responsive.spec.ts`: "preparation" → "method"
- [x] 5.2 `tests/e2e/tests/index.spec.ts`: page numbers follow list order; seeded recipes show `.index-polaroid.empty`; footer shows the recipe count and "continued overleaf" on desktop; returning to contents marks the last recipe `.current`
- [x] 5.3 `tests/e2e/tests/recipe-display.spec.ts`: `.ingredients-list` computed font-family contains "Libre Baskerville"; first `.step-number` is "1."; meta line shows "30 min" and "serves 4" for the seeded recipe
- [x] 5.4 `cargo test`, `make lint`, `make test-e2e` green; `openspec validate journal-typography-contents`
