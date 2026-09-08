## 1. Spread mode state (`static/spread-modes.js`, new)

- [ ] 1.1 Create the module: `setSpreadMode(mode)` / `getSpreadMode()` writing `body[data-spread-mode]` (`contents` | `cook` | `notes`), defaulting to `contents`
- [ ] 1.2 Register a re-render callback from `app.js` rather than importing `recipe-display.js` or `page-tabs.js` (no import cycle)
- [ ] 1.3 Honour the `isAnimating()` lock from `page-transitions.js`: a mode change during a page turn or crossfade is ignored, as `setActiveTab` already does
- [ ] 1.4 Ignore every mode change at ≤600px, so the phone never leaves its single-page layout
- [ ] 1.5 Unit-level checks that the attribute is the single source of truth and that an unknown mode is rejected

## 2. Left-edge tab strip (`static/chat.html`, `static/spread-modes.js`)

- [ ] 2.1 Give `.contents-tabs` two tab sets: the filters (All / Mains / Sweets / Meals) when no recipe is open, and Contents / Cook / Notes when one is
- [ ] 2.2 Swap the sets on view-mode change without destroying the `<nav>` (it is a sibling of `#page-left-content` precisely so a contents re-render cannot remove it)
- [ ] 2.3 Keep the buttons free of `role="tab"` and `data-tab` so `page-tabs.js`'s delegated `[role="tab"][data-tab]` handler never sees them; use `aria-pressed` as the filter tabs already do
- [ ] 2.4 Drop Cook from the strip while a meal plan is displayed
- [ ] 2.5 Restore the remembered contents filter (`sessionStorage['rv-contents-filter']`) when the strip reverts on return to the contents

## 3. Cook mode layout (`static/recipe-display.js`, `static/styles.css`)

- [ ] 3.1 Relocate the rendered `.tab-panel[data-tab="ingredients"]` node into `#page-left-content` on entering cook mode, and back on leaving — a move, not a second render, so `applyStepHighlight` keeps its single `querySelector` target
- [ ] 3.2 Right page shows the method panel only; no margin column in cook mode
- [ ] 3.3 Independent scrolling for both pages (the `.page` overflow rule already gives this; confirm no `padding-bottom: 72px` gap now that the input is elsewhere in notes mode)
- [ ] 3.4 Hide the right-edge Ingredients / Method strip in cook mode above 600px
- [ ] 3.5 Skip `setActiveTab`'s scroll-to-header behaviour in cook mode — there is no tab to scroll to
- [ ] 3.6 Preserve the mode across a recipe refresh (photo upload, `update_recipe`, difficulty refresh) — `renderRecipe` re-asserts the tab today and must re-assert the mode too

## 4. Notes mode layout (`static/styles.css`, `static/margin-notes.js`)

- [ ] 4.1 Render the open recipe's thread into the left page, oldest first, reusing `renderThread`'s markup and its XSS rules (only AI replies are markdown)
- [ ] 4.2 Reposition the single `.note-input` form to the foot of the left page with CSS only (`right: calc(50% + 10px)`), no second form and no JS move
- [ ] 4.3 Right page shows the whole recipe (ingredients and method) as one scrolling page with its margin column
- [ ] 4.4 Book-level thread on the left when no recipe is open, with the contents on the right
- [ ] 4.5 Empty-thread message when the open recipe has no notes

## 5. Implicit transitions (`static/spread-modes.js`, `static/chat.js`, `static/navigation.js`)

- [ ] 5.1 Opening a recipe (contents click, `display_recipe`, prev/next, swipe) selects `cook`
- [ ] 5.2 Focusing the note input selects `notes`
- [ ] 5.3 Suppress 5.2 while a timer is running for the open recipe and the mode is `cook` — the method page is load-bearing there
- [ ] 5.4 Returning to the contents (`navigation.js:123`, the Recipe Book header) selects `contents` and reverts the strip
- [ ] 5.5 Clicking a recipe in the contents while another is open switches recipe and returns to `cook`

## 6. Per-recipe notes (`static/margin-notes.js`, `static/chat.js`)

- [ ] 6.1 Add `recipeId` to every thread entry; `addNote` / `updateStreamingNote` take it from the turn, not from current state at render time
- [ ] 6.2 `chat.js` captures `state.currentRecipeId` when the note is sent and stamps every entry of that turn — user note, status lines, streaming reply, errors
- [ ] 6.3 `null` is the book-level thread: notes written on the contents page or with a meal plan open
- [ ] 6.4 Filter `render()` (the margin, last three) and `renderThread()` by the displayed recipe
- [ ] 6.5 A recipe created mid-turn does not claim that turn's notes — the id is immutable once stamped
- [ ] 6.6 Confirm `src/chat/sessions.rs` is untouched: the LLM still receives the whole session history

## 7. Right-edge tabs (`static/page-tabs.js`, `static/styles.css`)

- [ ] 7.1 Remove Notes from the desktop right-edge strip; keep all three on the phone's `.page-tabs`
- [ ] 7.2 Keep `notes` in `VALID_TABS` — the value stays legal, only the desktop affordance goes
- [ ] 7.3 Right-edge strip hidden entirely in cook mode above 600px

## 8. Responsive

- [ ] 8.1 ≤600px: no spread modes, layout unchanged, notes scoping still applies
- [ ] 8.2 768px portrait (the `ipad` Playwright project): confirm cook mode is readable; if the ingredient column is too cramped, fall back to phone-like single-page behaviour and assert that instead
- [ ] 8.3 1024px and narrower: the margin column still collapses in contents and notes modes

## 9. Tests

- [ ] 9.1 `tests/e2e/tests/spread-modes.spec.ts`: default cook mode on open, tab switching, contents mode alongside a recipe, notes mode input position, animation-lock rejection, meal plan has no Cook tab
- [ ] 9.2 `tests/e2e/tests/notes-scoping.spec.ts`: notes filed per recipe, reply after navigation stays with its recipe, book thread, empty thread message
- [ ] 9.3 Use `test.skip(...)` for viewport-inapplicable cases, never a bare `if (...) return` — that reports as a pass
- [ ] 9.4 Assert cook mode keeps a running timer's step highlight
- [ ] 9.5 Verify each new test fails when its behaviour is reverted
- [ ] 9.6 Full `make test-e2e` and `make lint` green across chromium, mobile-chrome and ipad

## 10. Documentation

- [ ] 10.1 `design-system.md`: the left-edge strip's recipe-mode variant and the notes-mode input position
- [ ] 10.2 `planned-ideas/ui-v2-journal/README.md`: note that the interaction model's "Notes tab shows the thread for the current recipe" is now implemented, and that the left page is contextual
- [ ] 10.3 Deployment: static assets only — tag the release and purge the Cloudflare cache
