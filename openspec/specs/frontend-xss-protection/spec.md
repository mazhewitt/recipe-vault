# frontend-xss-protection Specification

## Purpose
TBD - created by archiving change ui-code-refactor. Update Purpose after archive.
## Requirements
### Requirement: HTML Escaping Utility

The system SHALL provide a utility function to escape HTML special characters in user-provided text.

#### Scenario: escapeHtml function exists
- **WHEN** a module needs to sanitize user input for display
- **THEN** it can import or call `escapeHtml(unsafe)` function
- **AND** the function is available from a shared module or utility file

#### Scenario: Escape HTML entities
- **WHEN** `escapeHtml()` is called with text containing HTML special characters
- **THEN** the following replacements are made:
  - `&` → `&amp;`
  - `<` → `&lt;`
  - `>` → `&gt;`
  - `"` → `&quot;`
  - `'` → `&#039;`

#### Scenario: Safe text unchanged
- **WHEN** `escapeHtml()` is called with text containing no special characters
- **THEN** the text is returned unchanged

### Requirement: Recipe Data Sanitization

The system SHALL escape all user-provided recipe data before inserting into the DOM.

#### Scenario: Recipe title sanitized
- **WHEN** a recipe title is displayed in the UI
- **THEN** the title is passed through `escapeHtml()` before inserting into `innerHTML`
- **AND** any `<script>` tags or event handlers in the title are rendered as text, not executed

#### Scenario: Ingredient names sanitized
- **WHEN** recipe ingredients are rendered
- **THEN** each ingredient's name is passed through `escapeHtml()`
- **AND** malicious HTML in ingredient names is rendered as text

#### Scenario: Step instructions sanitized
- **WHEN** recipe steps are rendered
- **THEN** each step's instruction text is passed through `escapeHtml()`
- **AND** malicious HTML in instructions is rendered as text

#### Scenario: Recipe description sanitized
- **WHEN** a recipe description is displayed
- **THEN** the description is passed through `escapeHtml()`
- **AND** XSS attempts in descriptions are neutralized

### Requirement: Chat Message Sanitization

The system SHALL escape user-provided chat messages before inserting into the DOM.

#### Scenario: User message text sanitized
- **WHEN** a user's chat message is displayed
- **THEN** the message text is passed through `escapeHtml()`
- **AND** any HTML tags in the message are rendered as text

#### Scenario: Assistant message content sanitized
- **WHEN** assistant messages contain text content
- **THEN** user-referenced content (e.g., recipe titles mentioned in responses) is sanitized
- **AND** markdown rendering does not introduce XSS vulnerabilities

### Requirement: XSS Prevention in Template Literals

The system SHALL sanitize all user data interpolated into template literals used with `innerHTML`.

#### Scenario: Template literal with recipe data
- **WHEN** rendering HTML via template literals (e.g., `<div class="title">${recipe.title}</div>`)
- **THEN** `recipe.title` is wrapped in `escapeHtml()` before interpolation
- **AND** the resulting HTML is safe for `innerHTML` insertion

#### Scenario: No sanitization for static HTML
- **WHEN** rendering static HTML strings without user data
- **THEN** sanitization is not required
- **AND** performance is not impacted by unnecessary escaping

#### Scenario: Audit trail for innerHTML usage
- **WHEN** code uses `innerHTML` to insert content
- **THEN** there SHOULD be a code comment indicating whether the content is sanitized or static
- **AND** code reviewers can easily verify XSS safety

### Requirement: XSS Test Cases

The system SHALL prevent execution of common XSS payloads in user-provided data.

#### Scenario: Script tag injection blocked
- **WHEN** a recipe title contains `<script>alert('XSS')</script>`
- **THEN** the title is displayed as literal text
- **AND** the script does not execute

#### Scenario: Event handler injection blocked
- **WHEN** an ingredient name contains `<img src=x onerror=alert('XSS')>`
- **THEN** the name is displayed as literal text
- **AND** the onerror handler does not execute

#### Scenario: Data URL injection blocked
- **WHEN** a step instruction contains `<a href="javascript:alert('XSS')">click</a>`
- **THEN** the instruction is displayed as literal text
- **AND** the javascript: URL does not execute

#### Scenario: HTML entity injection blocked
- **WHEN** user data contains encoded attacks like `&lt;script&gt;alert('XSS')&lt;/script&gt;`
- **THEN** the data is double-escaped if inserted into innerHTML
- **AND** does not result in script execution

