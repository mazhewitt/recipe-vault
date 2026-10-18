# frontend-modules Specification

## Purpose
Keeps the static frontend as ES modules with clear boundaries and no shared globals, so each part of the book (display, navigation, spread modes, timers, chat) can change without breaking the others.

## Requirements

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

### Requirement: Module Boundaries

The system SHALL enforce clear responsibilities for each module.

#### Scenario: Recipe display module responsibility
- **WHEN** code needs to render a recipe or the contents, or navigate between index/detail views
- **THEN** that logic resides in `recipe-display.js`
- **AND** other modules import and call exported functions from `recipe-display.js`

#### Scenario: Chat module responsibility
- **WHEN** code needs to send a chat request or handle SSE events
- **THEN** that logic resides in `chat.js`
- **AND** `chat.js` renders nothing itself; it calls `margin-notes.js` for every note, reply, status line and error

#### Scenario: Timer module responsibility
- **WHEN** code needs to manage cooking timer state or UI
- **THEN** that logic resides in `timer.js`
- **AND** other modules import and call exported functions from `timer.js`

#### Scenario: Navigation module responsibility
- **WHEN** code needs to move between recipes or the contents (arrows, edge chevrons, phone footer links, boundary state)
- **THEN** that logic resides in `navigation.js`
- **AND** `navigation.js` no longer exports `switchTab`; there is no Book/Chat tab state

#### Scenario: Entry point module responsibility
- **WHEN** the app initializes
- **THEN** `app.js` coordinates initialization of other modules
- **AND** does not contain business logic specific to recipes, chat, timers, or navigation

#### Scenario: Margin notes module responsibility
- **WHEN** code needs to store the chat thread, render notes into `#page-margin`, or render the full thread into `.notes-thread`
- **THEN** that logic resides in `margin-notes.js`
- **AND** it exposes `addNote`, `updateStreamingNote`, `finalizeStreamingNote`, `getThread`, `render` and `renderThread`

#### Scenario: Utility module has no imports from feature modules
- **WHEN** `utils.js` provides `escapeHtml` or `renderMarkdown`
- **THEN** it imports nothing from other application modules, so any module can import it without creating a cycle

#### Scenario: Page tabs module responsibility
- **WHEN** code needs to change the active Ingredients / Method / Notes tab
- **THEN** that logic resides in `page-tabs.js` (`setActiveTab`)
- **AND** the crossfade itself is provided by `page-transitions.js` (`crossfadeElement`) so the animation lock is shared with recipe navigation

### Requirement: No Global State Pollution

The system SHALL minimize global state and scope variables to modules.

#### Scenario: Module-scoped state
- **WHEN** a module needs state (e.g., current conversation in `chat.js`)
- **THEN** the state is declared within the module scope
- **AND** not attached to the global `window` object

#### Scenario: Shared state via exports
- **WHEN** multiple modules need access to shared state
- **THEN** the state is exported from one module and imported by others
- **AND** updates go through exported functions, not direct global mutation

### Requirement: Browser Compatibility

The system SHALL target modern browsers that support native ES modules.

#### Scenario: ES module support required
- **WHEN** a user accesses the application
- **THEN** their browser MUST support `<script type="module">` (Chrome 61+, Firefox 60+, Safari 11+, Edge 16+)
- **AND** the application MAY display a browser compatibility warning for older browsers

#### Scenario: No build step
- **WHEN** the application is deployed
- **THEN** JavaScript files are served directly without bundling or transpilation
- **AND** module loading is handled natively by the browser

### Requirement: Spread mode module boundaries

`spread-modes.js` SHALL own the spread mode and its tab strip without importing the rendering modules, so that no import cycle is introduced.

#### Scenario: No cycle through recipe-display
- **WHEN** `spread-modes.js` needs the spread re-rendered after a mode change
- **THEN** it invokes a callback registered by `app.js`
- **AND** it does not import `recipe-display.js` or `page-tabs.js`

#### Scenario: Mode is readable without importing the module
- **WHEN** CSS or another module needs the current mode
- **THEN** it reads `body[data-spread-mode]`, which `spread-modes.js` keeps as the single source of truth
