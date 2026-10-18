## Why

The 2026-10-17 browser audit (see `steady-cooking-spread/proposal.md` for method) found that changing recipe, the book's most frequent action, is easy to trigger by accident on the phone and slow everywhere. It also forgets where the cook was.

**Accidental page turns on the phone**
- Two invisible 60px-wide, full-height tap zones (`.mobile-edge-nav`, `styles.css:2425-2486`) lie over the left and right thirds of the page: 31% of its width. They cover every step number and the quantities. Tapping "225 g" turned Lemon Drizzle into Lasagne.
- On the contents page the "next" zone covers every row's page number. Tapping "p. 7" on the lasagne opens Banana Bread.
- The swipe detector locks direction after 10px and treats anything within 63° of horizontal as a swipe (`page-transitions.js:397-423`). A natural thumb arc while scrolling a long method turns the page, or swallows the scroll.
- Switching Ingredients → Method on the phone loses the place in the method (step 7 drops 386px).

**Slow turns**
- Every "›" tap first force-refetches the whole recipe list (`navigation.js:70/97`). That refetch also empties the prefetch cache (`app.js:49`), so the page turns over a loading skeleton every time.
- On the real Synology and Cloudflare link this is a pause, a turn and then a skeleton. The cook taps again, thinking the first tap missed.

**The book forgets where you were**
- The open recipe is not in the URL or history. Reload, browser Back, or an iPad discarding the tab in the background throws the cook out of the recipe and back to the contents.
- Rotating a phone to landscape with a recipe open shows the contents with no note input.
- Tapping the polaroid on a touch screen never shows the photo: the preview opens on `touchend`, and the click synthesised after it closes the preview again.
- "Recipe Book" back to the contents shows a half-state for a frame: a blank left page, with the recipe re-flowed on the right.

## What Changes

- **No invisible tap zones over the page.** The phone's `.mobile-edge-nav` overlays go. Recipes change by the existing footer links ("‹ previous recipe · p. N · next recipe ›"), by swipe, or by two small visible chevrons in the leather gutter outside the paper. Each chevron is a 44px target that covers no text.
- **A swipe is unmistakably sideways.** The direction locks only after 30px. A swipe needs |dx| > 2|dy| when it locks and overall at release, and must cover 30% of the page width. Anything else is a scroll.
- **Each phone tab keeps its own scroll position.**
- **Page turns use the list already held.** Next and previous navigate from the cached list and the prefetched recipe. The list is refreshed when the contents are shown and after a recipe is created or deleted, not on every turn, and a refresh no longer discards the prefetch cache.
- **The open recipe is in the URL.**
  - Opening a recipe pushes `?recipe=<id>`, and returning to the contents pushes the bare path.
  - Reload restores the recipe (and the spread mode).
  - Back and Forward move between the contents and the recipes visited, with the page-turn animation.
  - A recipe id that no longer exists shows the contents with a short note, rather than silently opening a different recipe.
- **Rotation and resize keep the view.** Crossing 600px with a recipe open keeps the recipe, applies the right mode for the new width and keeps the note input.
- **The photo preview works on touch.** It opens on tap and closes on a second tap, never in the same gesture.
- **Back to the contents is one clean page turn**, with no intermediate half-rendered frame.

## Non-goals

- Swipe on the tablet. The audit asked for it, but the tablet's pages scroll independently and a spread-wide swipe needs its own design. Filed as a `.scratch/` issue.
- The layout, timer and reply changes: see `steady-cooking-spread`.

## Capabilities

### Modified Capabilities
- `swipe-navigation`: stricter horizontal test; no full-height edge zones.
- `family-recipe-ui`: phone navigation affordances; photo preview on touch; per-tab scroll on the phone; crossing 600px keeps the view.
- `recipe-prefetch`: turns use the cache, and a list refresh keeps it.
- `recipe-browsing`: "Recipe list is fetched fresh on navigation" is replaced by navigating from the list already held.
- `recipe-book-index`: returning to the contents is a single page turn.

### New Capabilities
- `recipe-url-state`: the open recipe lives in the URL and history.

## Impact

Frontend only: `static/navigation.js`, `page-transitions.js`, `app.js`, `recipe-display.js`, `styles.css` (edge-nav block), `chat.html`. E2e specs that drive `.mobile-edge-nav` (`navigation.spec.ts`, `responsive.spec.ts`) switch to the footer links or the new chevrons.
