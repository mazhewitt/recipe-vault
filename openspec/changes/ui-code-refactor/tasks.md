## 1. Module Structure Setup

- [x] 1.1 Create empty module files: `static/recipe-display.js`, `static/chat.js`, `static/timer.js`, `static/navigation.js`
- [x] 1.2 Update `static/index.html` to use `<script type="module" src="/app.js">` instead of current script tag
- [x] 1.3 Backup original `static/app.js` as `static/app.js.backup` for reference during refactor

## 2. XSS Protection Utility

- [x] 2.1 Create `static/utils.js` with `escapeHtml(unsafe)` function implementing character replacements for `&`, `<`, `>`, `"`, `'`
- [x] 2.2 Add JSDoc comment to `escapeHtml()` explaining its purpose and usage
- [x] 2.3 Export `escapeHtml` from `utils.js` using ES6 export syntax

## 3. Extract Recipe Display Module

- [x] 3.1 Move `renderRecipe()` function to `recipe-display.js` and export it
- [x] 3.2 Move recipe index rendering logic (e.g., `renderRecipeIndex()` or similar) to `recipe-display.js`
- [x] 3.3 Move recipe navigation state logic to `recipe-display.js`
- [x] 3.4 Apply `escapeHtml()` to `recipe.title` in recipe display template literals
- [x] 3.5 Apply `escapeHtml()` to `ingredient.name` in ingredient rendering
- [x] 3.6 Apply `escapeHtml()` to `step.instruction` in step rendering
- [x] 3.7 Apply `escapeHtml()` to `recipe.description` if displayed
- [x] 3.8 Add code comments indicating sanitized vs. static HTML in `recipe-display.js`
- [x] 3.9 Import `escapeHtml` from `utils.js` in `recipe-display.js`

## 4. Extract Chat Module

- [x] 4.1 Move chat UI functions (e.g., message rendering, input handling) to `chat.js` and export them
- [x] 4.2 Move conversation state management to `chat.js`
- [x] 4.3 Move markdown rendering logic to `chat.js`
- [x] 4.4 Apply `escapeHtml()` to user message text before rendering in chat
- [x] 4.5 Ensure markdown-rendered content from LLM is not double-escaped (controlled rendering path)
- [x] 4.6 Add code comments for XSS safety in chat message rendering
- [x] 4.7 Import `escapeHtml` from `utils.js` in `chat.js`

## 5. Refactor SSE Parsing to EventSource

- [ ] 5.1 Replace manual SSE parsing in `chat.js` with native `EventSource` constructor
- [ ] 5.2 Add event listeners for `chunk` event (text streaming)
- [ ] 5.3 Add event listeners for `tool_use` event (tool call notifications)
- [ ] 5.4 Add event listeners for `recipe_artifact` event (recipe panel display)
- [ ] 5.5 Add event listeners for `done` event (response completion)
- [ ] 5.6 Add event listeners for `error` event (error handling and retry logic)
- [ ] 5.7 Remove old manual SSE parsing code (manual `\n` splitting and `startsWith` checks)
- [ ] 5.8 Test SSE connection with multi-line data to verify correct handling

## 6. Extract Timer Module

- [x] 6.1 Move cooking timer state management to `timer.js` and export relevant functions
- [x] 6.2 Move timer UI functions (start, stop, display) to `timer.js`
- [x] 6.3 Ensure timer module has minimal dependencies on other modules

## 7. Extract Navigation Module

- [x] 7.1 Move responsive navigation state logic to `navigation.js` and export functions
- [x] 7.2 Move mobile navigation handling to `navigation.js`
- [x] 7.3 Test mobile navigation behavior after extraction

## 8. Refactor App Entry Point

- [x] 8.1 Import all module functions in `app.js` using ES6 `import` statements
- [x] 8.2 Move initialization logic to `app.js` (coordinating module setup)
- [x] 8.3 Remove business logic from `app.js` (delegate to specific modules)
- [x] 8.4 Ensure `app.js` is under 200 lines (entry point only)

## 9. XSS Security Testing

- [x] 9.1 Create `tests/e2e/tests/xss-protection.spec.ts` for XSS payload testing
- [x] 9.2 Add test: recipe title with `<script>alert('XSS')</script>` renders as escaped text
- [x] 9.3 Add test: ingredient name with `<img src=x onerror=alert('XSS')>` renders as escaped text
- [x] 9.4 Add test: step instruction with `<a href="javascript:alert('XSS')">click</a>` renders as escaped text
- [x] 9.5 Add test: recipe description with HTML entities renders safely
- [x] 9.6 Add test: chat message with HTML tags renders as text (not executed)
- [x] 9.7 Run XSS test suite and verify all payloads are neutralized

## 10. Playwright Test Updates

- [x] 10.1 Update `tests/e2e/tests/recipe-display.spec.ts` if function names changed (e.g., `fetchAndDisplayRecipe` now in `recipe-display.js`)
- [x] 10.2 Update `tests/e2e/tests/chat.spec.ts` if chat functions moved to modules
- [x] 10.3 Update `tests/e2e/tests/navigation.spec.ts` if navigation functions moved to modules
- [x] 10.4 Verify `tests/e2e/tests/responsive.spec.ts` still works with modular structure

## 11. Regression Testing with Playwright

- [x] 11.1 Run full Playwright test suite: `npm test` in `tests/e2e/`
- [x] 11.2 Verify all existing tests pass (recipe-display, chat, navigation, responsive, index, image-paste, image-upload, photo-management)
- [x] 11.3 Fix any test failures due to module refactoring
- [x] 11.4 Verify SSE streaming still works (covered by chat.spec.ts tests)
- [x] 11.5 Verify mobile/tablet responsive behavior still works (covered by responsive.spec.ts)

## 12. Cleanup and Documentation

- [x] 12.1 Remove `static/app.js.backup` after verifying all Playwright tests pass
- [x] 12.2 Verify each module is under 400 lines of code
- [x] 12.3 Add module-level comments documenting each module's responsibility
- [x] 12.4 Audit all `innerHTML` usage across all modules for XSS safety comments
- [x] 12.5 Update any inline documentation or README sections referencing the old monolithic structure
