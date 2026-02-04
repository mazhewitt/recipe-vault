## Why

The UI code (HTML, CSS, JavaScript) is currently embedded as inline strings within `src/handlers/ui.rs` (~1200+ lines). This makes frontend development difficult: no syntax highlighting, no CSS/JS tooling support, and requires rebuilding the Rust binary for every styling tweak. An upcoming feature (recipe book pagination with page-turn animations) will require significant CSS and JavaScript work that would be painful without proper editor support.

## What Changes

- Extract inline HTML template to `templates/index.html`
- Extract inline CSS to `static/styles.css`
- Extract inline JavaScript to `static/app.js`
- Configure Axum to serve static files from `static/` directory
- Modify `ui.rs` to load and serve the HTML template (or serve as static file)
- Enable hot-reload of CSS/JS changes without Rust recompilation during development

## Capabilities

### New Capabilities

- `static-asset-serving`: Capability for serving static CSS, JavaScript, and other assets from a `static/` directory with appropriate caching headers

### Modified Capabilities

None - the `family-recipe-ui` spec defines visual/behavioral requirements which remain unchanged. This refactor only changes implementation architecture, not user-facing behavior.

## Impact

- **Code**: `src/handlers/ui.rs` significantly reduced in size; new `static/` and `templates/` directories
- **Build**: No change to Rust compilation; frontend assets now editable without rebuild
- **Deployment**: Static files must be deployed alongside binary (or embedded at build time for single-binary deployment)
- **Development**: Faster iteration on CSS/JS with proper tooling support
