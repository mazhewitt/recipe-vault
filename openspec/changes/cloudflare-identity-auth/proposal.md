## Why

The app is now exposed to the internet via Cloudflare Tunnel with Cloudflare Access providing Google OAuth authentication. This creates redundant authentication: users must sign in with Google (Cloudflare) AND enter a family password. We want to simplify this to a single sign-on experience.

## What Changes

- Remove the family password authentication requirement for web UI access
- Read authenticated user identity from Cloudflare Access headers (`Cf-Access-Authenticated-User-Email`)
- Display user identity in the UI (show who's logged in)
- Add `DEV_USER_EMAIL` environment variable for local development
- Keep API key authentication for MCP/programmatic access (unchanged)

## Capabilities

### New Capabilities

- `cloudflare-identity`: Handles reading Cloudflare Access identity headers, extracting user email for use throughout the app

### Modified Capabilities

- `web-auth`: **BREAKING** - Family password authentication removed; Cloudflare Access becomes the sole authentication method for web UI. Session cookie mechanism replaced with Cloudflare identity headers.

## Impact

- **Auth middleware**: Replace session cookie validation with Cloudflare header reading
- **UI handlers**: Pass user email to templates, remove login/logout pages
- **API security**: API key auth unchanged; Cloudflare headers accepted as alternative for `/api/*`
- **Local development**: DEV_USER_EMAIL simulates Cloudflare headers for testing
- **Breaking change**: Existing deployments without Cloudflare Access will lose web authentication
