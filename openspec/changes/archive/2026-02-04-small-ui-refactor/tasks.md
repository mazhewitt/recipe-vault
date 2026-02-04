## 1. Create Static Asset Files

- [x] 1.1 Create `static/` directory at project root
- [x] 1.2 Extract HTML from `CHAT_PAGE_HTML` in ui.rs to `static/chat.html`
- [x] 1.3 Extract CSS from `CHAT_PAGE_HTML` in ui.rs to `static/styles.css`
- [x] 1.4 Extract JavaScript from `CHAT_PAGE_HTML` in ui.rs to `static/app.js`
- [x] 1.5 Link CSS/JS in `static/chat.html` (`<link rel="stylesheet" href="/static/styles.css">`, `<script src="/static/app.js"></script>`)

## 2. Configure Static File Serving

- [x] 2.1 Add `tower_http::services::ServeDir` route for `/static` path in main.rs
- [x] 2.2 Update `ui.rs` handler to serve `static/chat.html` instead of the const string
- [x] 2.3 Remove the inline `CHAT_PAGE_HTML` const from `ui.rs`

## 3. Update Deployment

- [x] 3.1 Update `Dockerfile` to `COPY static /app/static` in the runtime stage
- [x] 3.2 Verify local build `docker build -t recipe-vault:test .`

## 4. Verification

- [x] 4.1 Test chat page loads correctly with external assets
- [x] 4.2 Verify browser dev tools show CSS/JS loading from `/static/` paths
- [x] 4.3 Test that modifying `static/styles.css` reflects changes without Rust rebuild
