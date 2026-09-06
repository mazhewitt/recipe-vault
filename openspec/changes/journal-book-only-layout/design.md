## Context

`planned-ideas/ui-v2-journal/README.md` is the design handoff for UI 2.0; this change is step 4 of its build order. It is written against the result of step 3 (`journal-margin-notes`), which is itself written against steps 1 and 2. Where this change and step 3 modify the same requirement (for example `web-chat` "Web User Interface" and "Recipe Artifact Event Handling", `frontend-modules` "ES Module Structure" and "Module Boundaries", `browser-testing` "Chat UI can be tested automatically") the delta here restates the requirement as step 3 left it plus this change's edits. The `family-recipe-ui` requirements it touches are restated as step 1 left them ("Recipe book displays as open two-page spread with leather cover", "Typography uses Kalam handwritten font", "Design tokens define consistent theming" are step 1's / step 3's text). The classic-notepad flag added by step 3 is removed here.

Relevant current code: `static/chat.html` has `.notepad-container` with `#messages`, `#loading`, `#image-attachment`, `#message-input`, `#image-upload`, `#clipboard-button`, and a `.mobile-tab-bar` with `#tab-book` / `#tab-chat` driving `Navigation.switchTab`. `static/app.js` `showError` inserts into `.notepad-input`, and `setupImagePasteHandler` / `setupClipboardButton` / `setupTextareaAutoResize` find the input by id. `renderRecipe` in `static/recipe-display.js` writes ingredients to the left page and method to the right on desktop, everything to the left on phones; `renderIndex` splits the list across both pages; `meal-plan-display.js` picks `#page-left-content` on phones. `page-transitions.js` holds the `animating` lock and applies `view-transition-name` to `#page-left-content` on phones. Notepad CSS is `styles.css:199-499`, the tab bar `1218-1279`, and the `@media (max-width: 1024px)` block stacks notepad and book.

Decisions already taken with the user: phone tabs are tap only with a 200ms crossfade; recipe swipe is unchanged; the Notes tab shows the full global thread; the Meals edge tab is gated and belongs to step 5; undo is deferred.

## Goals / Non-Goals

**Goals**
- One chat surface: the note input in the book. No transcript panel.
- Desktop reads as an open cookbook: contents on the left, the recipe with its margin on the right.
- Phone reads as a single page with paper tabs, and the input within thumb reach.
- Keep image attach, loading state, timers, page turns, swipe and prefetch working with minimal code churn (ids preserved).

**Non-Goals**
- Contents edge-tab filters (step 5, `recipe-tags-contents-filters`).
- Persisting the thread across page loads.
- Server-side thumbnails.
- Undo of AI edits.

## Decisions

### One note-input element, positioned by CSS
The input lives once in the DOM, as `.note-input` inside `.book-container` after `.recipe-book`. On desktop it is absolutely positioned over the foot of the right page (the right page gets matching bottom padding); on phones it is a cream bar beneath the book with a 44px red send button. Keeping a single element means `app.js` setup functions and the image tests keep working unchanged. DOM:

```html
<form class="note-input" id="note-input">
  <div id="image-attachment" class="image-attachment" hidden>…</div>
  <div id="loading" class="loading"><div class="spinner"></div><span id="loading-text">Thinking…</span></div>
  <span class="note-pencil" aria-hidden="true"></span>
  <textarea id="message-input" rows="1" placeholder="Write a note to the cook…"></textarea>
  <input type="file" id="image-upload" accept="image/*" hidden>
  <button id="clipboard-button" type="button" aria-label="Attach image">…</button>
  <button id="send-button" type="submit" aria-label="Send note">…</button>
  <span class="note-page-number" id="note-page-number">p. 1</span>
</form>
```
`showError` in `app.js` inserts into `.note-input`. Enter sends, Shift+Enter inserts a newline (as today). The page number is `pageNumberFor(index)` of the current recipe, or `p. 1` on the contents page; `fetchAndDisplayRecipe` and `showIndex` update it.

### Desktop recipe spread: contents left, recipe right
`renderRecipe(recipe, { layout: 'journal' })` writes the whole recipe into `#page-right-content`: `.recipe-title-row` with a 96×76 `.recipe-polaroid` (existing preview click), `.recipe-meta-line`, `ingredients:` header, `.ingredients-list`, `method:` header, `.prep-list`, notes/description, authorship. `renderIndex(list, { currentRecipeId, singleColumn: true })` writes all groups into `#page-left-content` only and leaves the right page alone. `fetchAndDisplayRecipe` calls both on desktop. The contents view (`viewMode === 'index'`) keeps step 1's two-page split.

Fallback if the right page proves cramped in use: ingredients on the left, method plus margin on the right, no persistent contents column. The renderer's `layout` option is the switch.

### Ingredient packing on desktop only
When rendering for the journal layout, consecutive ingredients whose text is at most 24 characters are grouped up to three per `.ingredient-line`, joined by ` · ` inside `<span class="ingredient-sep">`. Each item keeps its own `.ingredient-item` span so `textContent` still contains every item and existing assertions hold. Phones render one item per line.

### Phone: one visible page
On phones `#page-left` is visible in index mode and `#page-right` in recipe (and meal) mode, toggled by `body[data-view-mode]`. The contents keep rendering into `#page-left-content` (single column, as today) and the recipe renders into `#page-right-content`, which also hosts the margin, the paper tabs and the footer. `meal-plan-display.js` therefore always targets `#page-right-content`. `view-transition-name: page-content` moves from `#page-left-content` to `.pages-container` on phones so contents→recipe and recipe→recipe swaps both slide.

### Tabs
`.page-tabs` (`role="tablist"`, three `button[role="tab"][data-tab]`) is a static child of `#page-right` above `.page-content`, shown only on phones. `.edge-tabs` (same three buttons) is a static child of `#page-right` on the right outer edge, shown only on desktop. Both set `#page-right[data-tab]`. `renderRecipe` wraps ingredients and method in `section.tab-panel[data-tab="ingredients|method"]`; the notes panel is `section.tab-panel[data-tab="notes"] > .notes-thread`, rendered by `margin-notes.js` `renderThread(container)` from the full thread (user notes as pencil lines, replies as biro notes, status lines muted). On phones the active panel is shown and `#page-margin` (last three notes) renders beneath it in the Ingredients and Method tabs. On desktop Ingredients and Method scroll `#page-right` to the section; Notes swaps the recipe body for `.notes-thread` until Ingredients or Method is tapped. Opening a recipe resets the tab to Ingredients. Tabs are hidden on the contents page and while a meal plan is shown.

New `static/page-tabs.js` exports `initializeState`, `setActiveTab(tab)` and `initPageTabs()`. `page-transitions.js` gains `crossfadeElement(el, applyFn, ms = 200)` which sets the `animating` lock, fades `el` out, runs `applyFn`, fades in and clears the lock; under `prefers-reduced-motion` it applies immediately. `setActiveTab` uses it on phones. Because the lock is shared, a tab tap during a page turn is ignored and a swipe during a crossfade is ignored.

### Phone footer
`renderRecipe` on phones appends `<div class="phone-footer"><button class="footer-prev">‹ previous recipe</button><span>p. N</span><button class="footer-next">next recipe ›</button></div>`; `navigation.js` wires the buttons to `loadPrevRecipe` / `loadNextRecipe` by delegation and disables them with `updateNavigationState`. The existing edge chevrons remain.

### Removals
Delete: `.notepad-container` markup and CSS, `#messages`, `.mobile-tab-bar` and `switchTab`, the `@media (max-width: 1024px)` stacking block (replaced by a rule that collapses the margin under the content), `addMessage` / `updateStreamingMessage` / `finalizeStreamingMessage` / `scrollToBottom` in `chat.js`, `isClassic()` and the `rv-ui` read, the htmx `<script>` tags in `chat.html`, and `window.switchTab`. `chat.js` calls `margin-notes.js` only.

### Meal plan styling
Because the meal plan now lives on the right page beside the margin, `styles.css` gains `.meal-plan-panel`, `.meal-plan-header`, `.meal-plan-title` (Kalam 28px), `.meal-plan-guest-badge`, `.meal-plan-recipe-row`, `.meal-plan-role-badge` (leather / border / accent-brown per role), `.meal-plan-recipe-link` (serif, underlined) and `.meal-plan-actions` — all in the book palette.

## Risks / Trade-offs

- Every desktop test that reads ingredients from `#page-left-content` breaks; the rewrite is budgeted in tasks 5.x. Tests assert on `.ingredients-list` / `.prep-list` inside `#page-right-content` on desktop.
- The right page holds title, meta, ingredients, method and margin; long recipes scroll. Accepted (pages already scroll); the fallback layout is recorded above.
- Page-turn overlays copy `#page-right-content`; the static tabs and margin are not in the overlay, so the turning page shows content only. Acceptable and arguably closer to a real page.
- Removing the transcript removes the visible "User:" echo; the Notes tab restores it. Tests move to `.notes-thread`.
- Meal plan on phones now depends on `#page-right` being visible in `meal` view mode; `renderMealPlan` sets `viewMode = 'meal'`.

## Migration Plan

Frontend only. Deploy normally, purge the Cloudflare cache per CLAUDE.md. The `rv-ui` flag becomes inert; nothing needs clearing. Rollback is a redeploy of the previous tag (the notepad returns with it).

## Open Questions

- Whether the desktop Notes edge tab should open the thread in place of the recipe (chosen) or as an overlay sticky (README option 4). Revisit after use.
- Tablet (601–1024px): the book is full width with the margin collapsed under the content and the desktop edge tabs shown; not mocked, verify on an iPad in the e2e `ipad` project.
