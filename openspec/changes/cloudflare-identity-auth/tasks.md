# Implementation Tasks

## 1. Identity Extraction

- [x] 1.1 Create `UserIdentity` struct to hold optional email
- [x] 1.2 Create middleware/extractor to read `Cf-Access-Authenticated-User-Email` header
- [x] 1.3 Add `DEV_USER_EMAIL` environment variable support for development mode
- [x] 1.4 Add identity to request extensions for handler access

## 2. Remove Password Authentication

- [x] 2.1 Remove `FAMILY_PASSWORD` handling from config
- [x] 2.2 Remove password login endpoint (`POST /login`)
- [x] 2.3 Remove session cookie validation logic
- [x] 2.4 Remove logout endpoint (`POST /logout`)
- [x] 2.5 Update API auth middleware to accept Cloudflare identity as alternative to API key

## 3. Update Handlers

- [x] 3.1 Update UI handler to pass user identity to templates
- [x] 3.2 Remove login form handler and redirect logic
- [x] 3.3 Fix compilation errors from query signature changes (pass None for user_email temporarily)

## 4. Update UI Templates

- [x] 4.1 Remove login form template/page
- [x] 4.2 Add user identity display to chat header (show email when logged in)
- [x] 4.3 Add Cloudflare logout link when identity present

## 5. Testing

- [x] 5.1 Update auth tests (tests/auth_test.rs) to remove password-based tests
- [x] 5.2 Add tests for Cloudflare header identity extraction
- [x] 5.3 Add tests for `DEV_USER_EMAIL` fallback behavior
- [x] 5.4 Update chat tests (tests/chat_test.rs) to handle optional family_password
- [x] 5.5 Update E2E test helpers (tests/e2e/tests/helpers.ts) to remove password authentication
- [x] 5.6 Verify E2E tests work without login flow (or update to use DEV_USER_EMAIL)

## 6. Documentation

- [x] 6.1 Update README to document new auth flow (remove family password, add Cloudflare identity)
- [x] 6.2 Update CLOUDFLARE_TUNNEL_SETUP.md to note family password is no longer needed
- [x] 6.3 Update API.md to remove session cookie authentication section
- [x] 6.4 Update SYNOLOGY.md to remove FAMILY_PASSWORD references
- [x] 6.5 Document `DEV_USER_EMAIL` environment variable for local development
- [x] 6.6 Update TESTING.md if it mentions authentication setup

## 7. Deployment

- [x] 7.1 Remove port mapping (3000:3000) from docker-compose.prod.yml to enforce tunnel-only access
      - Forces all traffic through Cloudflare Tunnel (true zero trust)
      - Prevents header spoofing since local port is closed
      - Trade-off: Must use https://recipes.aduki.co.uk even at home
- [x] 7.2 Add nginx sidecar for API-only local access on port 3500
      - Create nginx-api-only.conf that routes only /api/* to recipe-vault
      - Strip Cf-Access-* headers to prevent spoofing (API key auth only)
      - Add api-proxy service to docker-compose.prod.yml
- [x] 7.3 Update MCP client configuration docs to use port 3500