## 1. Configuration

- [x] 1.1 Add `FAMILY_PASSWORD` to Config struct in `src/config.rs`
- [x] 1.2 Add `FAMILY_PASSWORD` to `.env.example` with documentation

## 2. Session Cookie Logic

- [x] 2.1 Add session hash function: `SHA256(password + "recipe-vault-session-v1")` in `src/auth.rs`
- [x] 2.2 Add cookie validation function that compares computed hash with cookie value
- [x] 2.3 Add cookie creation helper with proper flags (HttpOnly, SameSite=Strict, Max-Age=10yr)

## 3. Auth Middleware Updates

- [x] 3.1 Update `api_key_auth` middleware in `src/auth.rs` to accept session cookie OR API key
- [x] 3.2 Extract cookie from request and validate against computed hash
- [x] 3.3 Ensure existing API key auth continues to work unchanged

## 4. Login/Logout Routes

- [x] 4.1 Add `POST /login` handler that validates password and sets cookie
- [x] 4.2 Add `POST /logout` handler that clears cookie
- [x] 4.3 Register routes in `src/main.rs`

## 5. UI Updates

- [x] 5.1 Update login form in `src/handlers/ui.rs` to ask for family password instead of API key
- [x] 5.2 Change form to POST to `/login` instead of using localStorage
- [x] 5.3 Add logout button to chat header
- [x] 5.4 Wire logout button to POST to `/logout`
- [x] 5.5 Remove localStorage API key logic from JavaScript

## 6. Testing

- [x] 6.1 Test login with correct password sets cookie and redirects
- [x] 6.2 Test login with incorrect password shows error
- [x] 6.3 Test chat access with valid cookie works
- [x] 6.4 Test chat access without cookie shows login form
- [x] 6.5 Test logout clears cookie and shows login form
- [x] 6.6 Test API key auth still works for MCP clients
