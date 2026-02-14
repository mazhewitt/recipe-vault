## 1. Database

- [x] 1.1 Create migration file for `share_links` table (token PK, recipe_id FK with CASCADE, created_by, created_at, expires_at) with index on recipe_id

## 2. Backend Share API

- [x] 2.1 Add `ShareLink` model struct and token generation function (10-char alphanumeric)
- [x] 2.2 Implement `POST /api/recipes/:id/share` handler — validate recipe access, create share link row, return token/URL/expiry JSON
- [x] 2.3 Add DB query functions: insert share link, lookup share link by token (with expiry check), lookup recipe by share token

## 3. Public Share Routes

- [x] 3.1 Implement `GET /share/:token` handler — look up token, load recipe with details, server-render HTML page with OG tags and inline styles
- [x] 3.2 Implement `GET /share/:token/photo` handler — look up token, serve photo file with correct Content-Type
- [x] 3.3 Implement expired/invalid token handling — return friendly "link expired" HTML page for expired tokens, 404 for unknown tokens

## 4. Router Integration

- [x] 4.1 Wire share routes into `main.rs` — merge share routes *after* the auth middleware layer so they bypass authentication
- [x] 4.2 Create `ShareState` with pool and config, wire into share handlers

## 5. Frontend Share Button

- [x] 5.1 Add "Share" button to the recipe card UI in `recipe-display.js`
- [x] 5.2 Implement share button click handler — call `POST /api/recipes/:id/share`, copy full URL to clipboard, show confirmation toast

## 6. Share Page Copy-to-Clipboard

- [x] 6.1 Add inline `<script>` to the share page that formats the recipe as plain text and copies to clipboard on button click
- [x] 6.2 Hide the copy button when Clipboard API is unavailable (progressive enhancement)
