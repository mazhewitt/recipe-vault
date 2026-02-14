## Context

Recipes are behind Cloudflare Access + family-based tenancy. All routes pass through `cloudflare_auth` then `api_key_auth` middleware. There is no concept of public access. The UI is a single-page chat app that renders recipe cards client-side in JavaScript (`recipe-display.js`). Photos are stored on the filesystem and served through an authenticated endpoint.

## Goals / Non-Goals

**Goals:**
- Allow users to generate a shareable URL for any recipe they can access
- Share links expire after 30 days, limiting exposure
- The share page is a standalone server-rendered HTML page that works without JavaScript
- Rich link previews (Open Graph tags) for messaging apps
- Easy copy-to-clipboard for pasting recipes into email

**Non-Goals:**
- Server-side email sending (SMTP, deliverability, etc.)
- Share analytics or view tracking
- Revocation UI (expiry handles cleanup)
- Editable or interactive shared pages
- Password-protected share links

## Decisions

### 1. Share token format: 10-character alphanumeric random string

**Rationale:** Short enough to be readable in URLs, long enough to be unguessable (62^10 ≈ 8.4 × 10^17 possibilities). UUID would work but makes ugly URLs. Base64 introduces URL-unfriendly characters.

**Alternatives considered:**
- UUID v4: Secure but long URLs (`/share/550e8400-e29b-41d4-a716-446655440000`)
- Signed JWT: Overkill for simple expiry, adds dependency
- Recipe ID + HMAC: More complex, no real benefit over random tokens

### 2. Server-rendered HTML for the share page (built in Rust handler)

**Rationale:** The share page must work without JavaScript (for link previews, email clients, and simplicity). Building the HTML string directly in the Rust handler avoids adding a template engine dependency. The page is simple enough (title, photo, metadata, ingredients, steps) that a template engine is overkill.

**Alternatives considered:**
- Tera/Askama template engine: Cleaner separation but adds a dependency for one page
- Client-side rendering with a public API: Requires JS, breaks OG tags, adds a public API surface

### 3. Public routes placed *before* the auth middleware layer in the router

**Rationale:** The current app applies `cloudflare_auth` as a layer on the entire `app` Router. Share routes need to bypass this entirely. Axum's layered middleware applies to all routes merged *before* the layer is added. The solution is to merge share routes *after* the auth layer, or use a separate Router that doesn't have the auth layer and nest it into the final app.

**Approach:** Create the share routes as a separate `Router` and merge them into the app *after* the cloudflare auth layer is applied using `.merge()`. This avoids modifying the auth middleware itself.

```
let app = Router::new()
    .nest_service("/static", ServeDir::new("./static"))
    .merge(ui_routes)
    .nest("/api", api_routes)
    .layer(cloudflare_auth)       // auth applies to everything above
    .merge(share_routes)          // share routes bypass auth (merged after layer)
    .layer(TraceLayer)
    .layer(CorsLayer)
    .layer(DefaultBodyLimit);
```

### 4. Dedicated `share_links` table with lazy expiry cleanup

**Rationale:** A dedicated table keeps sharing concerns separate from the recipe model. Lazy cleanup (check `expires_at` on access, return 404 if expired) avoids the need for a background job or cron. Expired rows accumulate but are harmless — a periodic `DELETE FROM share_links WHERE expires_at < now()` can be added later if needed.

**Schema:**
```sql
CREATE TABLE share_links (
    token TEXT PRIMARY KEY,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
);
CREATE INDEX idx_share_links_recipe_id ON share_links(recipe_id);
```

`ON DELETE CASCADE` ensures share links are cleaned up when a recipe is deleted.

### 5. Photo served via `/share/:token/photo` (not inline base64)

**Rationale:** Base64 embedding bloats HTML by ~33% and breaks OG image tags (which need a URL). A dedicated photo endpoint keeps the share page lightweight and enables `og:image` meta tags for rich previews.

### 6. Copy-to-clipboard: plain text formatting via a small inline script

**Rationale:** The share page is server-rendered with no JS required for *viewing*. But a "Copy to clipboard" button needs a small inline `<script>` to call the Clipboard API. This is progressive enhancement — the page works without JS, but copying is better with it. The script formats the recipe as clean plain text (title, ingredients, steps) suitable for pasting into an email.

## Risks / Trade-offs

- **[Token enumeration]** → 10-character alphanumeric tokens have ~60 bits of entropy. Brute-forcing is impractical, but rate limiting on `/share/:token` could be added later if needed.
- **[Expired link UX]** → Users who saved a share link will get a 404 after 30 days with no explanation. → Mitigation: Return a friendly "This share link has expired" page instead of a raw 404.
- **[Recipe deletion breaks links]** → CASCADE delete handles the DB row, but someone following the link gets a 404. → Acceptable; same as any link to deleted content.
- **[No revocation UI]** → If a user shares a recipe they shouldn't have, they can't un-share it before expiry. → Acceptable for v1; the 30-day window limits exposure. Revocation endpoint exists (`DELETE /api/recipes/:id/share/:token`) for future UI work.
- **[Share page styling]** → Needs its own minimal CSS. Embedding the full `styles.css` (33KB) is wasteful for a simple page. → Inline a small `<style>` block in the share page HTML with just the needed styles.
