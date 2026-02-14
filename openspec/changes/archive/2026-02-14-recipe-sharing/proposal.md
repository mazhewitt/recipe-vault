## Why

Recipes are currently locked behind authentication — there's no way to share a recipe with someone outside your family or outside the app entirely. Users want to send a recipe link to a friend via text or paste a formatted recipe into an email.

## What Changes

- Add a `share_links` database table to track time-limited share tokens (30-day expiry)
- Add an authenticated API endpoint to generate a share link for a recipe
- Add public (unauthenticated) routes to view a shared recipe and its photo
- Server-render a standalone share page with Open Graph meta tags for rich link previews
- Add a "Share" button to the recipe card UI that generates and copies the share link
- Add a "Copy to clipboard" button on the share page for easy email paste (plain text)

## Capabilities

### New Capabilities
- `recipe-sharing`: Generating time-limited share links and rendering public standalone recipe pages

### Modified Capabilities
- `web-auth`: Public share routes (`/share/:token`, `/share/:token/photo`) must bypass authentication
- `recipe-photo-storage`: Photos must be accessible via the public share photo route for shared recipes
- `static-asset-serving`: The standalone share page needs its own CSS (or a subset of existing styles)

## Impact

- **Database**: New migration for `share_links` table with foreign key to recipes
- **Backend routes**: New authenticated endpoint (`POST /api/recipes/:id/share`) and two public endpoints (`GET /share/:token`, `GET /share/:token/photo`)
- **Auth middleware**: Must allow `/share/*` routes through without authentication
- **Frontend**: New share button in recipe display, clipboard integration
- **HTML**: New server-rendered share page template (Rust-side, no JS dependency)
