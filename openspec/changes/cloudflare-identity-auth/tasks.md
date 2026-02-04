# Implementation Tasks

## 1. Identity Extraction

- [ ] 1.1 Create `UserIdentity` struct to hold optional email
- [ ] 1.2 Create middleware/extractor to read `Cf-Access-Authenticated-User-Email` header
- [ ] 1.3 Add `DEV_USER_EMAIL` environment variable support for development mode
- [ ] 1.4 Add identity to request extensions for handler access

## 2. Remove Password Authentication

- [ ] 2.1 Remove `FAMILY_PASSWORD` handling from config
- [ ] 2.2 Remove password login endpoint (`POST /login`)
- [ ] 2.3 Remove session cookie validation logic
- [ ] 2.4 Remove logout endpoint (`POST /logout`)
- [ ] 2.5 Update API auth middleware to accept Cloudflare identity as alternative to API key

## 3. Update Handlers

- [ ] 3.1 Update UI handler to pass user identity to templates
- [ ] 3.2 Remove login form handler and redirect logic
- [ ] 3.3 Fix compilation errors from query signature changes (pass None for user_email temporarily)

## 4. Update UI Templates

- [ ] 4.1 Remove login form template/page
- [ ] 4.2 Add user identity display to chat header (show email when logged in)
- [ ] 4.3 Add Cloudflare logout link when identity present

## 5. Testing

- [ ] 5.1 Update auth tests (tests/auth_test.rs) to remove password-based tests
- [ ] 5.2 Add tests for Cloudflare header identity extraction
- [ ] 5.3 Add tests for `DEV_USER_EMAIL` fallback behavior
- [ ] 5.4 Update chat tests (tests/chat_test.rs) to handle optional family_password
- [ ] 5.5 Update E2E test helpers (tests/e2e/tests/helpers.ts) to remove password authentication
- [ ] 5.6 Verify E2E tests work without login flow (or update to use DEV_USER_EMAIL)

## 6. Documentation

- [ ] 6.1 Update README to document new auth flow (remove family password, add Cloudflare identity)
- [ ] 6.2 Update CLOUDFLARE_TUNNEL_SETUP.md to note family password is no longer needed
- [ ] 6.3 Update API.md to remove session cookie authentication section
- [ ] 6.4 Update SYNOLOGY.md to remove FAMILY_PASSWORD references
- [ ] 6.5 Document `DEV_USER_EMAIL` environment variable for local development
- [ ] 6.6 Update TESTING.md if it mentions authentication setup

## 7. Deployment

- [ ] 7.1 Remove port mapping (3000:3000) from docker-compose.prod.yml to enforce tunnel-only access
      - Forces all traffic through Cloudflare Tunnel (true zero trust)
      - Prevents header spoofing since local port is closed
      - Trade-off: Must use https://recipes.aduki.co.uk even at home
- [ ] 7.2 Add nginx sidecar for API-only local access on port 3500
      - Create nginx-api-only.conf that routes only /api/* to recipe-vault
      - Strip Cf-Access-* headers to prevent spoofing (API key auth only)
      - Add api-proxy service to docker-compose.prod.yml
- [ ] 7.3 Update MCP client configuration docs to use port 3500
