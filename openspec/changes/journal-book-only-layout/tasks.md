## 1. HTML

- [ ] 1.1 `static/chat.html`: delete `.notepad-container` (including `#messages`), `.mobile-tab-bar` and the two htmx `<script>` tags
- [ ] 1.2 `static/chat.html`: add `.note-input` inside `.book-container` after `.recipe-book` with the preserved ids `#message-input`, `#clipboard-button`, `#image-upload`, `#image-attachment`, `#loading`, plus `#send-button` and `#note-page-number`
- [ ] 1.3 `static/chat.html`: add `.page-tabs` (phone) and `.edge-tabs` (desktop) as static children of `#page-right`, each with Ingredients / Method / Notes buttons

## 2. CSS (`static/styles.css`)

- [ ] 2.1 Delete notepad styles (`.notepad*`, `.message*`, `.input-controls`, `.text-input`, lines ~199-499), `.mobile-tab-bar` / `.mobile-tab` (~1218-1279) and the `@media (max-width: 1024px)` stacking block
- [ ] 2.2 `.app-container` / `.book-container` full width; `.note-input` desktop (absolute at the foot of `#page-right`, page padding-bottom) and phone (cream bar under the book, 44px targets, red send button); `.paste-error` inside `.note-input`
- [ ] 2.3 Journal recipe layout on the right page: `.recipe-polaroid` 96×76, packed `.ingredient-line` with `.ingredient-sep`, `.tab-panel`, `.notes-thread` (user notes as pencil lines, replies biro)
- [ ] 2.4 `.edge-tabs` on the right outer edge (desktop only) and `.page-tabs` paper tabs on the top edge (phone only; active tab cream and joined to the page, inactive tan / brown)
- [ ] 2.5 Phone: single-page frame, `body[data-view-mode]` toggling `#page-left` / `#page-right`, `.phone-footer`, `view-transition-name: page-content` on `.pages-container`, `#page-margin` inline under the active panel
- [ ] 2.6 Tablet (`601–1024px`): book full width, margin collapsed under content, edge tabs shown
- [ ] 2.7 Meal plan panel styles (`.meal-plan-*`) in the book palette

## 3. JavaScript

- [ ] 3.1 `static/page-tabs.js` (new): `initializeState`, `initPageTabs`, `setActiveTab(tab)` setting `#page-right[data-tab]`, scrolling on desktop, crossfading on phone, showing `.notes-thread` for Notes
- [ ] 3.2 `static/page-transitions.js`: export `crossfadeElement(el, applyFn, ms = 200)` that holds the `animating` lock and honours `prefers-reduced-motion`; move the phone `view-transition-name` target to `.pages-container`
- [ ] 3.3 `static/recipe-display.js`: `renderRecipe(recipe, { layout: 'journal' })` writes the full recipe to `#page-right-content` (polaroid, meta line, packed ingredients, method, tab panels, phone footer); `renderIndex(list, { currentRecipeId, singleColumn: true })` fills the left page only; `fetchAndDisplayRecipe` calls both on desktop and resets the tab to Ingredients
- [ ] 3.4 `static/margin-notes.js`: `renderThread(container)` rendering the full thread; `render()` places the last three notes under the active phone panel
- [ ] 3.5 `static/navigation.js`: remove `switchTab`; wire `.footer-prev` / `.footer-next` by delegation; `updateNavigationState` disables them at boundaries; `showIndex` updates `#note-page-number`
- [ ] 3.6 `static/chat.js`: remove `addMessage`, `updateStreamingMessage`, `finalizeStreamingMessage`, `scrollToBottom`, `isClassic` and the `rv-ui` read; route user notes, chunks, tool_use, timer_start, errors and done to `margin-notes.js`; `#send-button` and form submit call `sendMessage`
- [ ] 3.7 `static/app.js`: `showError` targets `.note-input`; remove `window.switchTab` and the mobile `switchTab('book')` init; initialise `PageTabs`; `viewMode` accepts `meal`
- [ ] 3.8 `static/meal-plan-display.js`: always render into `#page-right-content`; set `viewMode = 'meal'`

## 4. Documentation

- [ ] 4.1 `design-system.md`: rewrite the layout section (book only, note input, edge tabs, paper tabs, phone footer, tablet behaviour); remove the notepad section

## 5. Tests

- [ ] 5.1 `tests/e2e/tests/responsive.spec.ts`: rewrite — no `#tab-book` / `#tab-chat`; phone shows `.page-tabs` and the note input below the book; desktop shows `.edge-tabs` and the note input on the right page
- [ ] 5.2 `tests/e2e/tests/chat.spec.ts`: rewrite — user note appears in `.notes-thread` (Notes tab) without a "User:" prefix; reply appears as a margin note; "list" reply contains "Chicken Curry"
- [ ] 5.3 Remove `#tab-chat` / `#tab-book` clicks and `#messages` assertions in `index.spec.ts`, `meal-plan-display.spec.ts`, `image-upload.spec.ts`, `image-paste.spec.ts`, `xss-protection.spec.ts`; XSS test asserts on `.notes-thread` innerHTML
- [ ] 5.4 Desktop assertions that read ingredients / steps from `#page-left-content` (`recipe-display.spec.ts`, `navigation.spec.ts`, `ui-improvements.spec.ts`) move to `#page-right-content`; add a check that `#page-left-content` shows the contents with `.index-recipe-item.current` while a recipe is open
- [ ] 5.5 `tests/e2e/tests/page-tabs.spec.ts` (new): on mobile-chrome, tapping Method shows `.prep-list` and hides `.ingredients-list`; Notes shows `.notes-thread`; a tap during a page turn is ignored; the footer shows `p. N` and navigates; on chromium the edge tabs scroll the right page and Notes shows the thread
- [ ] 5.6 `make lint`, `make test-e2e` (chromium, mobile-chrome, ipad) green; `openspec validate journal-book-only-layout`
