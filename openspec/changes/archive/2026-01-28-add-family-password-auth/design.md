## Context

Currently, the web chat UI requires users to enter a 32-character hex API key stored in localStorage. This key is sent as an `X-API-Key` header on every request. While secure, this UX is inappropriate for a family recipe app where non-technical users need quick access from kitchen devices.

The system already has:
- API key auth middleware in `src/auth.rs`
- Login form UI in `src/handlers/ui.rs` (currently asks for API key)
- `/api/chat` endpoint protected by API key middleware

## Goals / Non-Goals

**Goals:**
- Replace API key entry with memorable family password
- Persist authentication via long-lived cookies (login once, stay logged in)
- Auto-invalidate sessions when password changes (no session tracking needed)
- Maintain backward compatibility with API key auth for MCP clients
- Add logout capability

**Non-Goals:**
- Per-user accounts or identity (single shared family password)
- Password reset flows (admin changes .env directly)
- Session revocation UI (change password to invalidate all sessions)
- HTTPS enforcement (assumes trusted home network)

## Decisions

### Decision 1: Password-derived session cookie

**Choice**: Cookie value = `SHA256(password + "recipe-vault-session-v1")`

**Rationale**:
- Stateless: no server-side session storage needed
- Auto-invalidation: changing password invalidates all cookies automatically
- Simple: just compare computed hash with cookie value

**Alternatives considered**:
- Random session tokens with server storage: More complex, requires session cleanup
- JWT: Overkill for single-password family auth
- Password hash directly: Would be reversible via rainbow tables

### Decision 2: Cookie configuration

**Choice**:
- `HttpOnly`: Yes (JS cannot read)
- `SameSite`: Strict (CSRF protection)
- `Max-Age`: 10 years (effectively forever)
- `Path`: /
- `Secure`: No (home network often HTTP-only)

**Rationale**: Balance security with home network realities. HttpOnly + SameSite provide meaningful protection without requiring HTTPS.

### Decision 3: Dual auth paths

**Choice**: `/api/*` endpoints accept EITHER `X-API-Key` header OR valid session cookie

**Rationale**:
- Browsers use cookies (automatic, no JS header management)
- MCP/programmatic clients use API key (explicit, scriptable)
- Same backend logic, different auth vectors

### Decision 4: Login/logout as separate routes

**Choice**:
- `POST /login` - validate password, set cookie, redirect to /chat
- `POST /logout` - clear cookie, redirect to /chat

**Rationale**: Standard web auth pattern. Form POST + redirect avoids JavaScript complexity.

## Risks / Trade-offs

**[Risk] Password in .env is plaintext** → Acceptable for home server; .env is already sensitive (contains ANTHROPIC_API_KEY). Document that .env should not be committed.

**[Risk] SHA256 without key stretching** → For a shared family password on a home network, this is acceptable. Not storing credentials, just validating sessions.

**[Risk] No rate limiting on /login** → Could add later if needed. Home network context makes brute force unlikely.

**[Trade-off] Long cookie expiry** → Convenience over forced re-auth. Family members won't be surprised by unexpected logouts.
