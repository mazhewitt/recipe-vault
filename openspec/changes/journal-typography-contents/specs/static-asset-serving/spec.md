## MODIFIED Requirements

### Requirement: Static assets include appropriate caching headers

The server SHALL include caching headers that allow browsers to cache static assets while still detecting changes.

#### Scenario: Assets include ETag or Last-Modified

- **WHEN** a browser requests a static asset
- **THEN** the response includes either an `ETag` header or a `Last-Modified` header (or both)

#### Scenario: Conditional requests return 304 when unchanged

- **WHEN** a browser sends a conditional request with `If-None-Match` or `If-Modified-Since` for an unchanged file
- **THEN** the server returns HTTP 304 Not Modified with no body

#### Scenario: Assets revalidate on every load

- **WHEN** a browser requests any file under `/static/`
- **THEN** the response includes `Cache-Control: no-cache`
- **AND** the browser revalidates the cached copy with a conditional request before reuse

### Requirement: Chat page references external CSS and JavaScript

The chat page HTML SHALL load styles and scripts from external files rather than inline content, with a version query string on the entry points so deployments invalidate cached copies.

#### Scenario: CSS loaded via link tag

- **WHEN** the chat page HTML is rendered
- **THEN** it includes a `<link rel="stylesheet" href="/static/styles.css?v=<version>">` tag in the head, where `<version>` is the application's crate version

#### Scenario: JavaScript loaded via script tag

- **WHEN** the chat page HTML is rendered
- **THEN** it includes a `<script type="module" src="/static/app.js?v=<version>"></script>` tag before the closing body tag

#### Scenario: Version placeholder is substituted

- **WHEN** the chat page template contains `{{asset_version}}`
- **THEN** the server replaces every occurrence with the crate version before responding
