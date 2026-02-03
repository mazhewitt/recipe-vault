## Context

The Recipe Vault UI is currently implemented as inline HTML/CSS/JS strings within `src/handlers/ui.rs` (1540 lines). The main chat page HTML includes:
- ~600 lines of CSS (design tokens, book styling, responsive layout)
- ~400 lines of JavaScript (recipe fetching, chat SSE handling, DOM manipulation)
- ~200 lines of HTML structure

The codebase already uses `tower_http` for CORS and tracing. Axum supports serving static files via `tower_http::services::ServeDir`.

## Goals / Non-Goals

**Goals:**
- Extract CSS to `static/styles.css` for proper editor tooling support
- Extract JavaScript to `static/app.js` for proper editor tooling support
- Extract HTML template to `templates/chat.html`
- Enable CSS/JS changes without Rust recompilation
- Maintain single-binary deployment option via build-time embedding

**Non-Goals:**
- Adding a JavaScript build system (webpack, vite, etc.)
- Adding CSS preprocessors (sass, less)
- Adding JavaScript frameworks (React, Vue, etc.)
- Changing the visual design or behavior
- Modifying the login/logout pages (keep inline for simplicity)

## Decisions

### Decision 1: Use tower_http::ServeDir for static file serving

**Choice**: Add a `/static` route using `tower_http::services::ServeDir`

**Rationale**: Already using tower_http for CORS/tracing, so no new dependencies. ServeDir handles caching headers, content types, and range requests automatically.

**Alternatives considered**:
- Axum's built-in `serve_file`: Too limited for a directory
- include_str! at runtime: Doesn't solve the "rebuild on change" problem

### Decision 2: Extract HTML to static file

**Choice**: Extract the HTML shell to `static/chat.html` and serve it via `ServeDir` (or read from disk on request)

**Rationale**: Keeping HTML in Rust strings defeats the purpose of the refactor (editor support). Since the page is largely a Single Page App (SPA) shell that loads data via API, it doesn't need server-side templating yet.

**Alternatives considered**:
- Keep as Rust const: Hard to edit, no syntax highlighting
- Full template engine: `askama` is not yet in dependencies

### Decision 3: File structure convention

**Choice**:
```
static/
  chat.html       # The main chat interface
  styles.css      # All CSS
  app.js          # All JavaScript
```

**Rationale**: Simple flat structure. All frontend assets live together.

### Decision 4: Development vs Production asset serving

**Choice**: Always serve from filesystem (via Docker COPY in production)

**Rationale**: Simple and consistent.

## Risks / Trade-offs

**[Risk] Static files not found in production** → **Mitigation:** Update `Dockerfile` to `COPY static /app/static`.

**[Risk] Caching issues during development** → ServeDir respects file modification times. Browser dev tools can disable cache. Not a significant concern.
