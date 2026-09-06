# frontend-modules Specification

## Purpose
TBD - created by archiving change ui-code-refactor. Update Purpose after archive.

## Requirements

### Requirement: ES Module Structure

The system SHALL organize frontend JavaScript code into ES modules with clear separation of concerns.

#### Scenario: Module files exist
- **WHEN** the frontend is deployed
- **THEN** the following module files exist in `/static/`:
  - `app.js` (entry point and coordination)
  - `recipe-display.js` (recipe and contents rendering)
  - `chat.js` (chat input and SSE handling)
  - `margin-notes.js` (chat thread store and margin / sticky rendering)
  - `timer.js` (cooking timer functionality)
  - `navigation.js` (recipe navigation state)
  - `page-transitions.js` (page-turn animation, swipe gestures, prefetch cache)
  - `meal-plan-display.js` (meal plan panel rendering)
  - `utils.js` (shared helpers: `escapeHtml`, `renderMarkdown`)

#### Scenario: Entry point loads modules
- **WHEN** `chat.html` is loaded in the browser
- **THEN** it includes `<script type="module" src="/static/app.js?v=<version>">`
- **AND** `app.js` imports the other modules using ES6 `import` syntax

#### Scenario: Module exports functions
- **WHEN** a module defines functionality (e.g., `renderRecipe()` in `recipe-display.js`)
- **THEN** it exports the function using ES6 `export` syntax
- **AND** other modules can import it using `import { renderRecipe } from './recipe-display.js'`

### Requirement: Module Boundaries

The system SHALL enforce clear responsibilities for each module.

#### Scenario: Recipe display module responsibility
- **WHEN** code needs to render a recipe or navigate between index/detail views
- **THEN** that logic resides in `recipe-display.js`
- **AND** other modules import and call exported functions from `recipe-display.js`

#### Scenario: Chat module responsibility
- **WHEN** code needs to send a chat request or handle SSE events
- **THEN** that logic resides in `chat.js`
- **AND** `chat.js` delegates drawing AI replies on the page to `margin-notes.js`

#### Scenario: Timer module responsibility
- **WHEN** code needs to manage cooking timer state or UI
- **THEN** that logic resides in `timer.js`
- **AND** other modules import and call exported functions from `timer.js`

#### Scenario: Navigation module responsibility
- **WHEN** code needs to handle responsive navigation or mobile state
- **THEN** that logic resides in `navigation.js`
- **AND** other modules import and call exported functions from `navigation.js`

#### Scenario: Entry point module responsibility
- **WHEN** the app initializes
- **THEN** `app.js` coordinates initialization of other modules
- **AND** does not contain business logic specific to recipes, chat, timers, or navigation

#### Scenario: Margin notes module responsibility
- **WHEN** code needs to store the chat thread or render notes into `#page-margin`
- **THEN** that logic resides in `margin-notes.js`
- **AND** it exposes `addNote`, `updateStreamingNote`, `finalizeStreamingNote`, `getThread` and `render`

#### Scenario: Utility module has no imports from feature modules
- **WHEN** `utils.js` provides `escapeHtml` or `renderMarkdown`
- **THEN** it imports nothing from other application modules, so any module can import it without creating a cycle

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
