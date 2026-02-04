## Why

The app is now exposed to the internet via Cloudflare Tunnel with Cloudflare Access providing Google OAuth authentication. This creates redundant authentication: users must sign in with Google (Cloudflare) AND enter a family password. We want to simplify this to a single sign-on experience while gaining user identity for tracking who created or modified recipes.

## What Changes

- Remove the family password authentication requirement for web UI access
- Read authenticated user identity from Cloudflare Access headers (`Cf-Access-Authenticated-User-Email`)
- Add `created_by` and `updated_by` fields to recipes to track which family member made changes
- Display user identity in the UI (who's logged in, who created/edited recipes)
- Keep API key authentication for MCP/programmatic access (unchanged)

## Capabilities

### New Capabilities

- `cloudflare-identity`: Handles reading and validating Cloudflare Access identity headers, extracting user email for use throughout the app

### Modified Capabilities

- `web-auth`: **BREAKING** - Family password authentication removed; Cloudflare Access becomes the sole authentication method for web UI. Session cookie mechanism replaced with Cloudflare identity headers.
- `recipe-domain`: Recipes gain `created_by` and `updated_by` email fields tracked on create/update operations

## Impact

- **Database**: Migration to add `created_by` (nullable, string) and `updated_by` (nullable, string) columns to recipes table
- **Auth middleware**: Replace session cookie validation with Cloudflare header reading
- **UI handlers**: Pass user email to templates, remove login/logout pages
- **Recipe handlers**: Capture user email on create/update operations
- **API security**: API key auth unchanged; Cloudflare headers accepted as alternative for `/api/*`
- **Local development**: Need way to simulate Cloudflare headers for testing
- **Breaking change**: Existing deployments without Cloudflare Access will lose web authentication
