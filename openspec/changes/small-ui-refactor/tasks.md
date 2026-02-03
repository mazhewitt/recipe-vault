## 1. Create Static Asset Files

- [ ] 1.1 Create `static/` directory at project root
- [ ] 1.2 Extract HTML from `CHAT_PAGE_HTML` in ui.rs to `static/chat.html`
- [ ] 1.3 Extract CSS from `CHAT_PAGE_HTML` in ui.rs to `static/styles.css`
- [ ] 1.4 Extract JavaScript from `CHAT_PAGE_HTML` in ui.rs to `static/app.js`
- [ ] 1.5 Link CSS/JS in `static/chat.html` (`<link rel="stylesheet" href="/static/styles.css">`, `<script src="/static/app.js"></script>`)

## 2. Configure Static File Serving

- [ ] 2.1 Add `tower_http::services::ServeDir` route for `/static` path in main.rs
- [ ] 2.2 Update `ui.rs` handler to serve `static/chat.html` instead of the const string
- [ ] 2.3 Remove the inline `CHAT_PAGE_HTML` const from `ui.rs`

## 3. Update Deployment

- [ ] 3.1 Update `Dockerfile` to `COPY static /app/static` in the runtime stage
- [ ] 3.2 Verify local build `docker build -t recipe-vault:test .`

## 4. Verification

- [ ] 4.1 Test chat page loads correctly with external assets
- [ ] 4.2 Verify browser dev tools show CSS/JS loading from `/static/` paths
- [ ] 4.3 Test that modifying `static/styles.css` reflects changes without Rust rebuild
