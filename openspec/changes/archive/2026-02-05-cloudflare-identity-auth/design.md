## Context

Recipe Vault is now exposed via Cloudflare Tunnel with Cloudflare Access providing Google OAuth. Users currently authenticate twice: Google sign-in at Cloudflare, then family password in the app. This is redundant.

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
- Simple implementation: Trust Cloudflare headers, don't over-engineer JWT verification
- Local dev support: Way to test without Cloudflare

**Non-Goals:**
- JWT verification: We trust Cloudflare's network path; headers can't be spoofed
- User management UI: No user CRUD, just read identity from headers
- Permission levels: All authenticated users have equal access

## Decisions

### Decision 1: Trust Cloudflare Headers Without JWT Verification

**Choice**: Read `Cf-Access-Authenticated-User-Email` header directly, don't verify JWT.

**Rationale**: Traffic only reaches our app through Cloudflare Tunnel. The header can't be spoofed because external requests don't reach us directly. JWT verification would add complexity for no security benefit.

### Decision 2: Optional Identity (Graceful Degradation)

**Choice**: If Cloudflare headers are missing, allow access but with `user_email = None`. This supports local development.

**Rationale**:
- Local dev: Run without Cloudflare, still test the app
- API key auth: MCP clients authenticate via API key, may not have Cloudflare headers

### Decision 2b: Network Isolation (Zero Trust)

**Choice**: Remove port 3000 mapping from docker-compose.prod.yml in production.

**Rationale**: Forces all traffic through Cloudflare Tunnel, ensuring authentication applies to everyone. Eliminates any possibility of header spoofing since the container port is not exposed.

**Trade-off**: Must use `https://recipes.aduki.co.uk` even when at home on the local network.

### Decision 2c: API-Only Local Port for MCP

**Choice**: Add nginx sidecar exposing port 3500 that only routes `/api/*` requests, stripping Cloudflare headers.

**Rationale**: MCP clients (Claude Desktop) need local network access to the API. By stripping `Cf-Access-*` headers, we ensure only API key authentication works on this port - no header spoofing possible.

```nginx
location /api/ {
    proxy_pass http://recipe-vault:3000;
    proxy_set_header Cf-Access-Authenticated-User-Email "";
    proxy_set_header Cf-Access-Jwt-Assertion "";
}
location / {
    return 403 "API access only";
}
```

**Security model**:
- Port 3000: Not exposed (tunnel only)
- Port 3500: API-only, API key auth only, headers stripped

### Decision 3: Simulate Headers in Development

**Choice**: Environment variable `DEV_USER_EMAIL` to simulate Cloudflare identity in development.

```bash
DEV_USER_EMAIL=test@example.com cargo run
```

### Decision 4: Remove Login/Logout UI

**Choice**: Remove `/login` page, login form, and logout button. Rely entirely on Cloudflare Access.

**Rationale**: Cloudflare handles session management. Users log out by navigating to `<team>.cloudflareaccess.com/cdn-cgi/access/logout`.

## Risks / Trade-offs

**[Risk] No direct local web access** → With port 3000 closed, must use Cloudflare URL for web UI even at home. MCP/API access preserved via port 3500.

**[Risk] Old session cookies become invalid** → Users just get redirected through Cloudflare again.

**[Risk] DEV_USER_EMAIL accidentally deployed** → Document clearly; add explicit checks if needed.

## Migration Plan

1. **Code changes**: Update auth middleware, handlers, templates
2. **Network isolation**: Remove port 3000 mapping from docker-compose.prod.yml
3. **API proxy**: Add nginx sidecar for API-only access on port 3500
4. **Deploy**: Update docker-compose on NAS, restart
5. **Verify**: Test Google login flow via `https://recipes.aduki.co.uk`
6. **Verify MCP**: Test Claude Desktop can access API via port 3500
7. **Cleanup**: Remove `FAMILY_PASSWORD` from `.env` (optional, ignored if present)

**Rollback**: Revert docker image to previous version, re-add port mapping if needed.
