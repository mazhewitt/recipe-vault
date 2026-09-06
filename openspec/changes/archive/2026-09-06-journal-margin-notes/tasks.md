## 1. Backend

- [x] 1.1 `src/ai/client.rs`: in `execute_tool`, after an MCP call named `update_recipe`, parse the result JSON; when it carries an `id`, return it as the artifact recipe id and append the "[UI] page refreshed, reply with one short margin note" instruction to the tool result text
- [x] 1.2 `src/ai/client.rs`: deduplicate collected recipe ids (preserving order) before `chat` returns them so one turn emits one `recipe_artifact` per recipe
- [x] 1.3 `src/ai/llm.rs`: mock branch for "halve" / "update" that calls `update_recipe` on the current recipe (id from the `current_recipe` context or `mock_recipe_id`), then replies with a one-line text after the tool result
- [x] 1.4 `src/ai/prompts.rs`: add a "## Replying" section (about 40 words, no headings; one-sentence note after `update_recipe`)
- [x] 1.5 `tests/chat_test.rs`: a chat turn whose mock calls `update_recipe` emits a `recipe_artifact` event for that id and the tool result contains the `[UI]` instruction

## 2. HTML and CSS

- [x] 2.1 `static/chat.html`: add `<aside id="page-margin" class="page-margin" aria-live="polite"></aside>` inside `#page-right` after `#page-right-content`
- [x] 2.2 `static/styles.css`: `--color-biro` and `--color-sticky` tokens; `body[data-view-mode="recipe"] #page-right` two-column grid (`minmax(0,1fr) 150px`); index-mode sticky positioning
- [x] 2.3 `static/styles.css`: `.margin-note` (Kalam 14px, biro, slight rotation), `[data-kind="status"]` muted, `[data-kind="error"]` leather red, `.streaming` caret, `.sticky-note` (sticky colour, shadow); fade-in keyframes and the `prefers-reduced-motion` override
- [x] 2.4 `static/styles.css`: in `@media (max-width: 1024px)` collapse the grid so `#page-margin` renders beneath `#page-right-content`

## 3. JavaScript

- [x] 3.1 `static/utils.js`: move `renderMarkdown` here from `chat.js`; `chat.js` re-exports it
- [x] 3.2 `static/margin-notes.js` (new): thread store and `initializeState`, `addNote`, `updateStreamingNote`, `finalizeStreamingNote`, `getThread`, `render` (last three non-user entries; latest reply only in index mode)
- [x] 3.3 `static/chat.js`: `isClassic()` reading `localStorage` `rv-ui`; add margin calls beside each notepad call for user notes, chunks, tool_use, timer_start, error and done events
- [x] 3.4 `static/chat.js`: on `recipe_artifact` call `clearPrefetchCache()` before `fetchAndDisplayRecipe`, and skip ids already fetched this turn (a `Set` reset in `sendMessage`)
- [x] 3.5 `static/app.js`: `viewMode` setter mirrors to `document.body.dataset.viewMode`; initialise `MarginNotes` with shared state; expose `window.getMarginThread` for tests
- [x] 3.6 `tests/e2e/eslint.config.js`: add `localStorage` to the globals allowlist

## 4. Documentation

- [x] 4.1 `design-system.md`: add margin note, status line and sticky note components with the two new tokens

## 5. Tests

- [x] 5.1 `tests/e2e/tests/margin-notes.spec.ts` (new): sending a message with a recipe open renders the reply in `#page-margin .margin-note[data-kind="reply"]`; four replies leave three visible; a reply on the contents page renders one `.sticky-note`; `tool_use` renders a status line; "halve this recipe" re-renders the page with the updated servings and adds a one-line note; with `localStorage rv-ui=classic` set, `#page-margin` stays empty while `#messages` still updates
- [x] 5.2 `tests/e2e/tests/chat.spec.ts`: existing notepad assertions unchanged; add the margin assertion for the reply
- [x] 5.3 `cargo test`, `make lint`, `make test-e2e` green; `openspec validate journal-margin-notes`
