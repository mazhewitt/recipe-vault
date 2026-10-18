## MODIFIED Requirements

### Requirement: ES Module Structure

The system SHALL organize frontend JavaScript code into ES modules with clear separation of concerns.

#### Scenario: Module files exist
- **WHEN** the frontend is deployed
- **THEN** the following module files exist in `/static/`:
  - `app.js` (entry point and coordination)
  - `recipe-display.js` (recipe and contents rendering)
  - `chat.js` (note input and SSE handling)
  - `margin-notes.js` (chat thread store, per-recipe scoping, margin / sticky rendering, Notes thread rendering)
  - `spread-modes.js` (contents / cook / notes spread mode state and the left-edge tab strip)
  - `page-tabs.js` (Ingredients / Method / Notes tab state on phone and desktop)
  - `timer.js` (cooking timer functionality)
  - `navigation.js` (recipe navigation state and footer links)
  - `page-transitions.js` (page-turn animation, tab crossfade, swipe gestures, prefetch cache)
  - `meal-plan-display.js` (meal plan panel rendering)
  - `place-keeping.js` (ingredient ticks, the current-step mark, the stepper's servings and their per-recipe `sessionStorage` memory; the screen wake lock while a recipe or meal plan is displayed)
  - `servings.js` (the servings stepper: scaled ingredient quantities, rounded for reading, for the session only; the `servings_set` event's target)
  - `utils.js` (shared helpers: `escapeHtml`, `renderMarkdown`)

#### Scenario: Entry point loads modules
- **WHEN** `chat.html` is loaded in the browser
- **THEN** it includes `<script type="module" src="/static/app.js?v=<version>">`
- **AND** `app.js` imports the other modules using ES6 `import` syntax
- **AND** no other `<script>` tags load application code (the htmx tags are gone)

#### Scenario: Module exports functions
- **WHEN** a module defines functionality (e.g., `renderRecipe()` in `recipe-display.js`)
- **THEN** it exports the function using ES6 `export` syntax
- **AND** other modules can import it using `import { renderRecipe } from './recipe-display.js'`
