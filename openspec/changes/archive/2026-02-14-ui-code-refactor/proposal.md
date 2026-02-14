## Why

The frontend codebase has accumulated significant technical debt that poses security risks and impedes maintainability. The 1,065-line `app.js` god file combines navigation, rendering, timers, and SSE streaming with no modular structure, making changes fragile and error-prone. More critically, user-provided data is interpolated directly into `innerHTML` throughout the application, creating stored XSS vectors where any family member who can create a recipe can inject scripts affecting other users.

## What Changes

- Split `app.js` into logical ES modules: `recipe-display.js`, `chat.js`, `timer.js`, `navigation.js`
- Implement HTML sanitization for all user-provided data before DOM insertion (recipe titles, ingredients, steps, etc.)
- Refactor SSE parsing to use native `EventSource` API or properly handle multi-line events and event type dispatching
- Update `index.html` to use `<script type="module">` for modular JavaScript
- Create an `escapeHtml()` utility for consistent XSS protection across the frontend

## Capabilities

### New Capabilities
- `frontend-modules`: Modular JavaScript architecture using ES modules for maintainable frontend code organization
- `frontend-xss-protection`: HTML sanitization and XSS prevention for user-provided content in the browser

### Modified Capabilities
<!-- No existing spec requirements are changing - this is implementation-level refactoring -->

## Impact

- **Affected code**: `static/app.js` (split into multiple files), `static/index.html` (module imports)
- **Security**: Eliminates stored XSS vulnerabilities in recipe display
- **Maintainability**: Modular structure makes future frontend changes safer and easier to reason about
- **Browser compatibility**: ES modules require modern browsers (supported since ~2017, acceptable for family app)
- **No API changes**: Backend remains unchanged; this is frontend-only refactoring
