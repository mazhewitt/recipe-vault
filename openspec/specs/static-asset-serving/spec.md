# Static Asset Serving

## Purpose
Provide a small, focused specification for serving frontend static assets (HTML, CSS, JavaScript, images) from the server at the `/static` URL path. This ensures that UI files are available, correctly typed, and cacheable. (TBD: expand with additional asset types or performance rules as needed.)
## Requirements
### Requirement: Static assets are served from the static directory

The server SHALL serve files from the `static/` directory at the `/static/` URL path.

#### Scenario: CSS file is accessible

- **WHEN** a browser requests `/static/styles.css`
- **THEN** the server returns the contents of `static/styles.css` with `Content-Type: text/css`

#### Scenario: JavaScript file is accessible

- **WHEN** a browser requests `/static/app.js`
- **THEN** the server returns the contents of `static/app.js` with `Content-Type: application/javascript`

#### Scenario: Non-existent file returns 404

- **WHEN** a browser requests `/static/nonexistent.xyz`
- **THEN** the server returns HTTP 404 Not Found

---

### Requirement: Static assets include appropriate caching headers

The server SHALL include caching headers that allow browsers to cache static assets while still detecting changes.

#### Scenario: Assets include ETag or Last-Modified

- **WHEN** a browser requests a static asset
- **THEN** the response includes either an `ETag` header or a `Last-Modified` header (or both)

#### Scenario: Conditional requests return 304 when unchanged

- **WHEN** a browser sends a conditional request with `If-None-Match` or `If-Modified-Since` for an unchanged file
- **THEN** the server returns HTTP 304 Not Modified with no body

---

### Requirement: Chat page references external CSS and JavaScript

The chat page HTML SHALL load styles and scripts from external files rather than inline content.

#### Scenario: CSS loaded via link tag

- **WHEN** the chat page HTML is rendered
- **THEN** it includes a `<link rel="stylesheet" href="/static/styles.css">` tag in the head

#### Scenario: JavaScript loaded via script tag

- **WHEN** the chat page HTML is rendered
- **THEN** it includes a `<script src="/static/app.js"></script>` tag before the closing body tag

### Requirement: Share page includes inline styles

The share page SHALL include its own minimal inline CSS rather than referencing the full application stylesheet.

#### Scenario: Share page styling is self-contained
- **WHEN** the share page HTML is rendered at `/share/:token`
- **THEN** styling is included via an inline `<style>` block in the `<head>`
- **AND** no external stylesheet is referenced
- **AND** the page renders correctly without loading any additional CSS files

