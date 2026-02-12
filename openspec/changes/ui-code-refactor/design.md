## Context

The Recipe Vault frontend currently consists of a single 1,065-line `static/app.js` file containing all client-side logic: navigation state, recipe rendering (140-line template literals with nested conditionals), chat SSE handling, timer management, and mobile responsiveness. There is no build tooling—just vanilla JS served directly to the browser.

**Current state:**
- Global functions with global state variables
- User data interpolated directly into `innerHTML` (XSS risk)
- Manual SSE parsing that doesn't handle multi-line data fields or properly dispatch on event types
- No module boundaries or separation of concerns

**Constraints:**
- No build step preferred (keep deployment simple)
- Modern browser target acceptable (family app, not public)
- Backend API unchanged—this is frontend-only refactoring
- Must maintain existing functionality during transition

## Goals / Non-Goals

**Goals:**
- Split `app.js` into logical modules with clear responsibilities
- Eliminate XSS vulnerabilities in recipe display and chat rendering
- Improve SSE parsing robustness (handle multi-line events, proper event dispatching)
- Establish patterns for maintainable frontend code going forward

**Non-Goals:**
- Introducing a framework (React, Vue, etc.) or build tooling
- Changing backend APIs or data models
- Comprehensive test coverage (that's a separate effort)
- Rewriting UI/UX or changing user-facing behavior

## Decisions

### Decision 1: ES Modules Without Build Step

**Choice:** Use native ES modules (`<script type="module">`) without bundling.

**Rationale:**
- Supported in all modern browsers since ~2017
- Eliminates need for webpack/vite/rollup complexity
- Family app context means browser compatibility risk is low
- Keeps deployment simple (no build step)

**Alternatives considered:**
- Add build tooling (webpack/vite): Rejected due to added complexity for small team/family app
- Keep monolithic file: Rejected due to maintainability concerns

**Implementation:**
- Convert `app.js` to `app.js` (entry point) + `recipe-display.js`, `chat.js`, `timer.js`, `navigation.js`
- Use ES6 `export`/`import` syntax
- Update `index.html` to `<script type="module" src="/app.js">`

### Decision 2: HTML Sanitization via `escapeHtml()` Utility

**Choice:** Create a simple `escapeHtml()` function and apply it to all user-provided data before DOM insertion.

**Rationale:**
- Lightweight solution (no library dependencies)
- Covers the specific XSS risk: template literal interpolation into `innerHTML`
- Easy to audit and understand
- Can be consistently applied across all rendering code

**Alternatives considered:**
- DOMPurify library: Rejected as overkill—we're escaping text, not sanitizing rich HTML
- Use `textContent` instead of `innerHTML`: Rejected because some content (markdown) needs HTML rendering

**Implementation:**
```javascript
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```
- Apply to: `recipe.title`, `ingredient.name`, `step.instruction`, chat message user text, etc.
- Audit all `innerHTML` and template literal usage in refactored modules

### Decision 3: Native `EventSource` for SSE Parsing

**Choice:** Replace manual SSE parsing with browser's native `EventSource` API.

**Rationale:**
- Handles multi-line data fields correctly (current implementation doesn't)
- Properly dispatches on event types (`message`, `chunk`, `tool_use`, `recipe_artifact`, `done`, `error`)
- Less code to maintain
- Standard API with well-defined behavior

**Alternatives considered:**
- Fix manual parsing to handle multi-line: Rejected because reinventing the wheel
- Use a library (eventsource-polyfill): Rejected—native support is sufficient for modern browsers

**Implementation:**
- Use `EventSource` constructor with `/api/chat` endpoint
- Add event listeners for custom event types (`chunk`, `tool_use`, etc.)
- Handle `error` event for connection failures and retry logic

### Decision 4: Module Boundaries

**Choice:** Organize code into 4 modules based on functional areas:

| Module | Responsibility |
|--------|---------------|
| `app.js` | Entry point, initialization, module coordination |
| `recipe-display.js` | Recipe rendering, navigation, index/detail views |
| `chat.js` | Chat UI, SSE handling, message formatting |
| `timer.js` | Cooking timer functionality |
| `navigation.js` | Responsive navigation state, mobile handling |

**Rationale:**
- Clear separation of concerns
- Each module has a single, well-defined purpose
- Reduces risk of unintended side effects when changing one area
- Makes code easier to navigate (e.g., "timer bug? check `timer.js`")

**Alternatives considered:**
- More granular modules (e.g., separate `sse.js`, `markdown.js`): Rejected to avoid over-engineering for current codebase size
- Group by technical layer (e.g., `dom.js`, `api.js`): Rejected in favor of feature-based organization

## Risks / Trade-offs

**[Risk] Browser compatibility**
→ **Mitigation:** ES modules supported since 2017. For family app, we can document minimum browser versions (Chrome 61+, Firefox 60+, Safari 11+). If needed, can add polyfill later.

**[Risk] Breaking changes during refactor**
→ **Mitigation:** Refactor incrementally—extract one module at a time, test in browser after each step. Keep git history clean for easy rollback.

**[Risk] Performance regression from multiple HTTP requests (one per module)**
→ **Mitigation:** Browsers handle module loading efficiently with HTTP/2 multiplexing. For family app scale, this is negligible. Can revisit if performance monitoring shows issues.

**[Risk] Missing XSS vectors**
→ **Mitigation:** Audit all `innerHTML` usage and template literal interpolation during refactor. Add code comments marking sanitized vs. safe content. Consider automated testing with XSS payloads.

**[Trade-off] No build step means no code minification**
→ **Accepted:** For family app, the ~10-50KB difference in payload size is not worth build complexity. Can revisit if this becomes a bottleneck.

**[Trade-off] Manual `escapeHtml()` instead of library**
→ **Accepted:** Simple function is easier to understand and audit. Risk is low since we're escaping text, not parsing untrusted HTML.
