## Why

The current web chat authentication requires users to enter a 32-character hex API key, which is a poor UX for a family recipe app. Family members in the kitchen shouldn't need to find and paste cryptographic strings to check a recipe.

## What Changes

- Add family password authentication for the web UI
- Implement cookie-based sessions that persist across browser restarts
- Use password-derived cookie values so sessions auto-invalidate when password changes
- Add login page and logout functionality
- Keep API key auth for MCP/programmatic access (unchanged)
- API endpoints accept either session cookie OR API key

## Capabilities

### New Capabilities

- `web-auth`: Family password authentication with cookie-based sessions. Handles login form, password validation, session cookie creation/validation, and logout.

### Modified Capabilities

- `api-security`: Add session cookie as alternative authentication method alongside API key for `/api/*` endpoints
- `web-chat`: Update authentication to use family password via login form instead of API key entry

## Impact

- **Configuration**: New `FAMILY_PASSWORD` environment variable
- **Routes**: Add `/login` POST and `/logout` POST endpoints
- **UI**: Replace API key form with password form, add logout button to chat header
- **Auth middleware**: Accept session cookie as alternative to X-API-Key header
- **Docker**: No changes needed (already handles .env)
