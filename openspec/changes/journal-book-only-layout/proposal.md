## Why

With replies already rendering as margin notes (`journal-margin-notes`), the notepad is a second copy of the conversation that takes 380px from the book on desktop and forces a Book/Chat tab bar on phones. The Journal 2.0 handoff (`planned-ideas/ui-v2-journal/README.md`) calls this the single largest layout change: the book takes the full width, the only chat surface is a "Write a note to the cook…" input at the foot of the page, and the phone gets Ingredients / Method / Notes paper tabs on the page edge. This is build step 4 of 5.

## What Changes

- **Notepad removed.** `.notepad-container`, `#messages`, the "User:"/"AI:" transcript, the mobile Book/Chat tab bar and `switchTab` are deleted. The book fills the width. The unused htmx script tags go too.
- **Note input in the book.** One input element (pencil icon, placeholder "Write a note to the cook…", paperclip for images, current page number; red send button on phone) sits at the foot of the right page on desktop and below the book on phone. Existing ids `#message-input`, `#clipboard-button`, `#image-upload`, `#image-attachment` and `#loading` are kept so image paste/upload and the loading state keep working.
- **Desktop recipe view.** Left page shows the contents in a single column with the current recipe highlighted; right page shows the whole recipe (title with a 96×76 polaroid, meta line, ingredients packed with `·`, method) beside the margin column, plus edge tabs Ingredients / Method / Notes. Ingredients and Method scroll the page; Notes shows the full chat thread.
- **Phone.** Three paper tabs on the page's top edge (tap only, 200ms crossfade); margin notes inline under the active tab's content; Notes tab shows the full thread; footer `‹ previous recipe · p. N · next recipe ›`. Recipe-to-recipe swipe is unchanged.
- **Meal plans** render on the right page on every viewport, and finally get CSS.
- The `rv-ui=classic` flag from step 3 is removed.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `family-recipe-ui`: layout is book only; notepad requirements removed; recipe spread becomes contents-left / recipe-right; page scrolling and alphabet navigation restated for the new layout; note input and phone page tabs and desktop edge tabs added
- `web-chat`: "Web User Interface" and "Recipe Artifact Event Handling" restated without the notepad, transcript or mobile close button; classic fallback flag removed
- `recipe-artifact`: artifact panel is the right page of the book on all viewports; meal artifact panel likewise
- `meal-planning`: meal plan panel renders on the right page with book styling
- `recipe-page-transitions`: phone tab switch is a 200ms crossfade that shares the navigation lock; view-transition name moves to `.pages-container`
- `frontend-modules`: `page-tabs.js` added, `switchTab` removed from `navigation.js`, chat module no longer renders a transcript
- `browser-testing`: chat tests assert notes without "User:"/"AI:" prefixes

Unchanged, stated for the record: `swipe-navigation` (recipe swipe on phone is exactly as today; tab switching is tap only) and `frontend-xss-protection` (it names no `#messages` element; user notes are still escaped, replies still rendered through `renderMarkdown`).

## Impact

- `static/chat.html` — remove notepad, tab bar and htmx tags; add `.note-input`, `.edge-tabs`, `.page-tabs`, phone footer host
- `static/styles.css` — note input, edge tabs, paper tabs, phone frame and footer, journal recipe layout, meal plan styles, tablet collapse; delete notepad CSS (`199-499`), tab bar (`1218-1279`) and the 1024px stacking rules
- `static/page-tabs.js` (new), `static/page-transitions.js` (`crossfadeElement`), `static/recipe-display.js` (`renderRecipe` journal layout, `renderIndex` `singleColumn`), `static/navigation.js` (remove `switchTab`; wire footer links), `static/chat.js` (remove `addMessage` / `#messages` code and the classic flag), `static/app.js` (`showError` targets `.note-input`; initialise page tabs), `static/margin-notes.js` (`renderThread`), `static/meal-plan-display.js` (single container)
- `tests/e2e/tests/` — rewrite `responsive.spec.ts` and `chat.spec.ts`; remove `#tab-chat` / `#tab-book` clicks and `#messages` assertions in `index`, `chat`, `meal-plan-display`, `image-upload`, `image-paste`, `xss-protection` specs; new `page-tabs.spec.ts`; desktop tests that read ingredients from `#page-left-content` move to `#page-right-content`
- `design-system.md` — layout section rewritten
