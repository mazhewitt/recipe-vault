## Context

Recipe Vault is now exposed via Cloudflare Tunnel with Cloudflare Access providing Google OAuth. Users currently authenticate twice: Google sign-in at Cloudflare, then family password in the app. This is redundant and prevents us from knowing which family member performed actions.

Current auth flow:
```
User → Cloudflare Access (Google) → recipe-vault → Family Password → Session Cookie → Access
```

Target auth flow:
```
User → Cloudflare Access (Google) → recipe-vault reads Cf-Access-Authenticated-User-Email → Access
```

Cloudflare Access sends these headers on authenticated requests:
- `Cf-Access-Authenticated-User-Email` - The user's email (e.g., "daughter@gmail.com")
- `Cf-Access-Jwt-Assertion` - JWT token (can be verified, but email header is sufficient for our trust model)

## Goals / Non-Goals

**Goals:**
- Single sign-on: Google auth at Cloudflare is sufficient
- User tracking: Know who created/modified each recipe
- Simple implementation: Trust Cloudflare headers, don't over-engineer JWT verification
- Local dev support: Way to test without Cloudflare

**Non-Goals:**
- JWT verification: We trust Cloudflare's network path; headers can't be spoofed
- User management UI: No user CRUD, just read identity from headers
- Permission levels: All authenticated users have equal access
- Audit log: Just created_by/updated_by, not full change history

## Decisions

### Decision 1: Trust Cloudflare Headers Without JWT Verification

**Choice**: Read `Cf-Access-Authenticated-User-Email` header directly, don't verify JWT.

**Rationale**: Traffic only reaches our app through Cloudflare Tunnel. The header can't be spoofed because external requests don't reach us directly. JWT verification would add complexity (fetching Cloudflare's public keys, token validation) for no security benefit in our architecture.

**Alternative considered**: Verify `Cf-Access-Jwt-Assertion` JWT - rejected as unnecessary given tunnel architecture.

### Decision 2: Optional Identity (Graceful Degradation)

**Choice**: If Cloudflare headers are missing, allow access but with `user_email = None`. This supports local development and direct NAS access.

**Rationale**:
- Local dev: Run without Cloudflare, still test the app
- Home network: Direct access via `http://nas:3000` still works (no Cloudflare headers)
- API key auth: MCP clients authenticate via API key, may not have Cloudflare headers

**Alternative considered**: Require headers for all web access - rejected because it breaks local dev and home network access.

### Decision 3: Simulate Headers in Development

**Choice**: Environment variable `DEV_USER_EMAIL` to simulate Cloudflare identity in development.

**Rationale**: Allows testing user identity features without Cloudflare infrastructure.

```bash
DEV_USER_EMAIL=test@example.com cargo run
```

### Decision 4: Nullable created_by/updated_by Fields

**Choice**: Add nullable `created_by` and `updated_by` columns to recipes table.

**Rationale**:
- Existing recipes don't have this data (can't backfill)
- Recipes created via API key (MCP) may not have user context
- Keeps migration simple (no data transformation needed)

### Decision 5: Remove Login/Logout UI

**Choice**: Remove `/login` page, login form, and logout button. Rely entirely on Cloudflare Access.

**Rationale**: Cloudflare handles session management. Users log out by clearing Cloudflare session (navigate to `<team>.cloudflareaccess.com/cdn-cgi/access/logout`).

## Risks / Trade-offs

**[Risk] Local/home access has no authentication** → Acceptable trade-off. Home network is trusted. Users who want auth for local access can route through Cloudflare even at home.

**[Risk] Old session cookies become invalid** → Users just get redirected through Cloudflare again. Seamless experience.

**[Risk] API clients sending spoofed headers** → API key auth is separate. Headers only trusted for web UI path where traffic comes through tunnel.

**[Risk] DEV_USER_EMAIL accidentally deployed** → Document clearly; only works when FAMILY_PASSWORD is also unset. Could add explicit `DEVELOPMENT_MODE=true` guard if needed.

## Migration Plan

1. **Database migration**: Add `created_by` and `updated_by` columns (nullable VARCHAR)
2. **Code changes**: Update auth middleware, handlers, templates
3. **Deploy**: Update docker-compose on NAS, restart
4. **Verify**: Test Google login flow, check recipes show "Created by" when applicable
5. **Cleanup**: Remove `FAMILY_PASSWORD` from `.env` (optional, ignored if present)

**Rollback**: Revert docker image to previous version. Old session cookies won't work, but Cloudflare Access still protects the app.
