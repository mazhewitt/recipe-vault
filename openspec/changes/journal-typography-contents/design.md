## Context

`planned-ideas/ui-v2-journal/README.md` is the design handoff for UI 2.0. This change is step 1 of the build order there (typography + contents page). Steps 2–5 are specified in sibling changes `journal-timer-cover-pill`, `journal-margin-notes`, `journal-book-only-layout` and `recipe-tags-contents-filters`; those deltas are written against the result of this change.

Relevant current code: fonts are loaded at `static/chat.html:7` (Kalam only); the single font token `--font-handwritten` lives at `static/styles.css:34`; `renderIndex` is `static/recipe-display.js:125-298` and `renderRecipe` is `337-519`. All page content is written as innerHTML into `#page-left-content` / `#page-right-content`. There is no bundler and no asset cache-busting.

## Goals / Non-Goals

**Goals**
- Serif body text with Kalam accents, per the README type table.
- A contents page with thumbnails, page numbers, counts and a "you were here" highlight.
- A single meta line replacing the metadata tiles; total time actually renders.
- Groundwork for later steps: `--font-serif`, `pageNumberFor`, `.prep-step[data-step]`, `lastRecipeId`, `photoEpoch`.
- Deterministic asset refresh after deploy.

**Non-Goals**
- Removing the notepad, margin notes, edge tabs, timer pill, tags (later changes).
- Server-side thumbnail resizing (candidate follow-up).
- Changing the two-page index split or page scrolling.

## Decisions

### Fonts
`static/chat.html` loads `family=Kalam:wght@300;400;700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap` with a `preconnect` to `fonts.gstatic.com`. Token `--font-serif: 'Libre Baskerville', Georgia, 'Times New Roman', serif` sits beside `--font-handwritten`. Tests assert the computed `font-family` string, not that the web font actually loaded.

### Page numbers are cosmetic and derived
`pageNumberFor(i) = 2 * i + 3` where `i` is the recipe's position in the full alphabetical list (contents occupies p.1–2, each recipe a notional spread). Exported from `recipe-display.js`; each contents row gets `data-page`. Reused by `journal-book-only-layout` for the phone footer and note input.

### Contents row DOM
```html
<div class="index-recipe-item[ current]" data-recipe-id="…" data-page="7" [aria-current="page"]>
  <span class="index-polaroid[ empty]"><img src="/api/recipes/{id}/photo?e={photoEpoch}" alt="" loading="lazy" decoding="async"></span>
  <span class="index-recipe-name">{escaped title}</span>
  <span class="index-page-number">p. 7</span>
</div>
```
The `<img>` is omitted when `photo_filename` is null (the polaroid renders as the dashed empty variant). Polaroids alternate a slight rotation by `nth-child`. The page number uses `--color-ink-light`, the darkest colour allowed under 16px on paper by the README contrast rule. The existing `translateX(4px)` hover on rows is dropped because it fights the rotated polaroid.

### Thumbnails use stable URLs
Photo URLs are stable per recipe, so contents thumbnails use `loading="lazy"` and a `photoEpoch` value in shared state (bumped after a successful photo upload) instead of `?t=Date.now()`. This lets the browser cache thumbnails across index renders while still refreshing after an upload.

### Highlighting the last-viewed recipe
`renderIndex(recipes, { currentRecipeId })`. Shared state gains `lastRecipeId`, set in `fetchAndDisplayRecipe` and deliberately not cleared by `showIndex`. Callers pass `currentRecipeId ?? lastRecipeId`. After render the containing page scrolls the `.current` row into view instead of resetting to top.

### Meta line
`.recipe-meta-line` replaces the `.recipe-meta` tile block: total (`Xh YY` when ≥ 60 min, else `NN min`), `serves N`, `difficulty` with the existing `.difficulty-dot(.filled)` spans, then optional muted `(prep 15 · cook 30)`. `getTotalTimeMinutes` and the renderer read `prep_time_minutes ?? prep_time` so both field spellings work. `.serving-note` is removed (serves lives in the meta line).

### Step DOM
`.prep-step` becomes `<div class="prep-step" data-step="N"><span class="step-number">N.</span><span class="step-text">…</span>{duration}</div>`. `data-step` is the hook `journal-timer-cover-pill` uses to highlight the step a timer belongs to. The visible text is unchanged ("1. Mix the flour…") so existing tests keep passing.

### Cache-busting
`src/handlers/ui.rs` substitutes `{{asset_version}}` with `env!("CARGO_PKG_VERSION")`. Only the stylesheet and the entry module carry `?v=`; imports inside modules are un-versioned, so `/static` responses get `Cache-Control: no-cache` (revalidate via the existing ETag) through a `SetResponseHeaderLayer` around `ServeDir`. Cloudflare still needs a purge after deploy per CLAUDE.md.

## Risks / Trade-offs

- Contents thumbnails load full-size photos (up to 5 MB). Mitigated by lazy loading and browser caching; a `?size=thumb` resize is a follow-up.
- Google Fonts is a runtime dependency; the fallback stack (Georgia) is acceptable.
- `no-cache` adds a conditional request per module on each load; the app has ~10 modules, so this is negligible.

## Migration Plan

Pure frontend + one header + one template substitution. Deploy normally, then purge the Cloudflare cache. No database changes. Rollback is a redeploy of the previous tag.

## Open Questions

- None blocking. Server-side thumbnails deferred.
