## Context

The Recipe Vault API is exposed on the home network without authentication. Anyone on the network can access, modify, or delete recipes. A simple authentication mechanism is needed that balances security with ease of use for a home environment.

**Stakeholders**: Home users accessing recipes from multiple devices

**Constraints**:
- Must work with containerized deployment
- Key must persist across container restarts
- Simple enough for non-technical family members to configure

## Goals / Non-Goals

**Goals**:
- Protect API endpoints from unauthorized access
- Auto-generate key on first run for easy setup
- Persist key in Docker volume
- Clear error messages for missing/invalid keys

**Non-Goals**:
- User accounts or multi-user authentication
- Key rotation or expiration
- Rate limiting
- HTTPS (can be added separately via reverse proxy)

## Decisions

### Decision 1: Key Format

**Choice**: 32-character hex string (128 bits of entropy)

**Example**: `a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6`

**Rationale**: Easy to copy/paste, sufficient entropy for home use, no special characters that could cause escaping issues.

### Decision 2: Key Storage Location

**Choice**: `/app/data/.api_key` file (inside Docker volume)

**Rationale**:
- Persists with the database in the same volume
- Hidden file (dot prefix) to avoid accidental exposure
- Simple text file, easy to backup or manually set

### Decision 3: Header Name

**Choice**: `X-API-Key`

**Rationale**: Common convention for API key authentication. Clear and unambiguous.

### Decision 4: Middleware Approach

**Choice**: Axum layer middleware applied to `/api/*` routes only

**Rationale**:
- Health check endpoints (if added later) remain accessible
- Clean separation of concerns
- Easy to test

### Decision 5: Key Loading Priority

**Choice**:
1. Check for `/app/data/.api_key` file
2. If not found, generate new key, save to file, log it

**Rationale**: User doesn't need to configure anything on first run. Key is logged once for them to save.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Key logged to stdout could be captured | Only log on first generation; user should save immediately |
| Key stored in plaintext | Acceptable for home use; file permissions restrict access |
| No key rotation | Can manually delete `.api_key` file to force regeneration |

## Migration Plan

1. Add auth module with key loading and middleware
2. Update main.rs to apply middleware to API routes
3. Update MCP http_client to send API_KEY header
4. Update config to read API_KEY for MCP server
5. Update documentation

**Rollback**: Remove middleware layer; API returns to open access

## Open Questions

None - straightforward implementation for home use case.
