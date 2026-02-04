# Implementation Tasks

## 1. Database Migration

- [ ] 1.1 Create migration to add `created_by` column (nullable VARCHAR) to recipes table
- [ ] 1.2 Create migration to add `updated_by` column (nullable VARCHAR) to recipes table
- [ ] 1.3 Update Recipe model struct to include new fields
- [ ] 1.4 Update recipe queries to read/write new fields

## 2. Identity Extraction

- [ ] 2.1 Create `UserIdentity` struct to hold optional email
- [ ] 2.2 Create middleware/extractor to read `Cf-Access-Authenticated-User-Email` header
- [ ] 2.3 Add `DEV_USER_EMAIL` environment variable support for development mode
- [ ] 2.4 Add identity to request extensions for handler access

## 3. Update Authentication

- [ ] 3.1 Remove `FAMILY_PASSWORD` handling from config
- [ ] 3.2 Remove password login endpoint (`POST /login`)
- [ ] 3.3 Remove session cookie validation logic
- [ ] 3.4 Remove logout endpoint (`POST /logout`)
- [ ] 3.5 Update API auth middleware to accept Cloudflare identity as alternative to API key

## 4. Update Handlers

- [ ] 4.1 Update `create_recipe` handler to set `created_by` from identity
- [ ] 4.2 Update `update_recipe` handler to set `updated_by` from identity
- [ ] 4.3 Update UI handler to pass user identity to templates
- [ ] 4.4 Remove login form handler and redirect logic

## 5. Update UI Templates

- [ ] 5.1 Remove login form template/page
- [ ] 5.2 Add user identity display to chat header (show email when logged in)
- [ ] 5.3 Add Cloudflare logout link when identity present
- [ ] 5.4 Display `created_by`/`updated_by` on recipe display (if present)

## 6. Testing

- [ ] 6.1 Update auth tests (tests/auth_test.rs) to remove password-based tests
- [ ] 6.2 Add tests for Cloudflare header identity extraction
- [ ] 6.3 Add tests for `DEV_USER_EMAIL` fallback behavior
- [ ] 6.4 Add tests for recipe creation with identity tracking
- [ ] 6.5 Verify existing recipe tests pass with nullable author fields
- [ ] 6.6 Update chat tests (tests/chat_test.rs) to handle optional family_password
- [ ] 6.7 Update E2E test helpers (tests/e2e/tests/helpers.ts) to remove password authentication
- [ ] 6.8 Verify E2E tests work without login flow (or update to use DEV_USER_EMAIL)

## 7. Documentation and Deployment

- [ ] 7.1 Update README to document new auth flow (remove family password, add Cloudflare identity)
- [ ] 7.2 Update CLOUDFLARE_TUNNEL_SETUP.md to note family password is no longer needed
- [ ] 7.3 Update API.md to remove session cookie authentication section
- [ ] 7.4 Update SYNOLOGY.md to remove FAMILY_PASSWORD references
- [ ] 7.5 Document `DEV_USER_EMAIL` environment variable for local development
- [ ] 7.6 Update TESTING.md if it mentions authentication setup
