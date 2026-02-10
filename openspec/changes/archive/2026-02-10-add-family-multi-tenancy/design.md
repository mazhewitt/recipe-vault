## Context

Recipe Vault currently supports authentication (API key + Cloudflare Access) and tracks recipe authorship (`created_by`, `updated_by` fields), but all authenticated users can see all recipes. The app is used by the developer and needs to expand to ~10 users across 2 families, where each family should only see their own recipes.

**Current State:**
- Database has `created_by` and `updated_by` (TEXT, nullable) on recipes table
- All existing recipes have `created_by = 'mazhewitt@gmail.com'`
- Auth middleware extracts user email from Cloudflare headers, X-User-Email header, or DEV_USER_EMAIL env var
- No filtering by user - all queries return all recipes

**Constraints:**
- Small scale: ~10 users, 2 families, static membership
- Cannot modify existing migrations (sqlx tracks checksums)
- Must maintain backward compatibility with MCP client god mode
- Users can VPN in to edit config if needed while traveling

## Goals / Non-Goals

**Goals:**
- Family members share recipes within their family
- Families cannot see each other's recipes (strict isolation)
- Simple configuration-based approach (no UI for family management)
- Preserve existing authorship tracking (`created_by`, `updated_by`)
- MCP client can operate in god mode (all recipes) or scoped mode (one family)
- Case-insensitive email matching

**Non-Goals:**
- Dynamic family membership (users added via UI)
- Recipe sharing between families
- Family-level permissions or roles
- Migration of recipes between families
- Hot-reloading of config file (restart required)

## Decisions

### Decision 1: Config file for family mapping (not database table)

**Choice:** Store email→family mapping in `families.yaml`, loaded at startup into memory.

**Why:**
- Only 2 families, ~10 users - doesn't warrant database tables
- Easy to edit manually (VPN + text editor)
- Fast lookup (in-memory HashMap)
- Avoids migration complexity
- User explicitly asked for "simple config"

**Alternatives considered:**
- Database table with `families` and `family_members` - overkill for this scale, requires seeding migration
- Hardcode in source - works but requires recompilation for changes, less flexible than YAML
- Environment variable - unwieldy for 10 users, hard to read/maintain

**Trade-off:** Adding a family member requires app restart (acceptable given small scale and VPN access).

### Decision 2: No `family_id` column in database

**Choice:** Derive family membership from `created_by` email using config lookup. Queries filter with `WHERE created_by IN (family_member_emails)`.

**Why:**
- Zero schema changes needed
- Zero migration complexity
- Existing `created_by` field already captures recipe ownership
- Family membership is implicit via config

**Alternatives considered:**
- Add `family_id` column to recipes - requires migration, complicates backfill, adds redundancy
- Add `family_id` and foreign key to families table - over-engineered for this use case

**Trade-off:** Queries use `IN` clause with list of emails instead of simple `family_id =` equality. For ~10 users and <1000 recipes, performance impact is negligible.

### Decision 3: API key god mode when X-User-Email omitted

**Choice:** API key without X-User-Email header → access all recipes, create as DEV_USER_EMAIL. API key with X-User-Email → scope to that user's family.

**Why:**
- MCP client needs god mode for AI assistance (must see all recipes to provide context)
- Maintains backward compatibility with existing MCP setup
- Optional scoping gives flexibility for future multi-user MCP scenarios

**Alternatives considered:**
- Always require X-User-Email - breaks existing MCP client behavior
- Separate god-mode key - adds complexity, unnecessary for single deployment

**Trade-off:** God mode is powerful, but acceptable for this use case (trusted users, single deployment).

### Decision 4: Case-insensitive email matching

**Choice:** Normalize all emails to lowercase in config loading, auth middleware, and database operations.

**Why:**
- Email addresses are case-insensitive per RFC 5321
- Prevents `Alice@Gmail.com` vs `alice@gmail.com` mismatch bugs
- User expectation: emails should "just work" regardless of case

**Implementation:** `.to_lowercase()` at all entry points (config load, UserIdentity creation, query binding).

### Decision 5: 404 (not 403) for cross-family access

**Choice:** Return 404 Not Found when user tries to access another family's recipe, not 403 Forbidden.

**Why:**
- Preserves privacy - doesn't reveal that the recipe exists
- Families don't know about each other's recipes
- User explicitly requested this behavior

**Trade-off:** Harder to debug genuine 404s vs authorization failures. Acceptable given small scale and clear separation.

### Decision 6: User not in config → 403 with friendly message

**Choice:** If authenticated email is not in `families.yaml`, return 403 with "Contact the administrator" message.

**Why:**
- Clear error message guides user to correct action
- Prevents silent failures or confusing empty states
- Admin (developer) can add user to config and restart app

**Implementation:** Check during auth middleware, before attempting any recipe operations.

## Risks / Trade-offs

### Risk: Config file out of sync with reality
**Example:** User removed from family but their recipes remain (created_by still points to them).
**Mitigation:** Recipes are scoped by creator's email. If creator is removed from config, their recipes stay with the family (still visible to remaining members). This is desired behavior - family recipes persist even if author leaves.

### Risk: Config file syntax error breaks app
**Example:** Malformed YAML prevents startup.
**Mitigation:** Validate config on load, fail fast with clear error message. Consider adding a config validation test.

### Risk: Family membership changes require restart
**Trade-off accepted:** For ~10 users with rare membership changes, restart is acceptable. Could add hot-reload later if needed (watch file for changes, reload config).

### Risk: Query performance with IN clause
**Example:** `WHERE created_by IN (email1, email2, ...)` slower than `WHERE family_id = ?`.
**Mitigation:** Negligible for this scale (<10 emails, <1000 recipes). SQLite can index created_by and optimize IN queries efficiently.

### Risk: Email case sensitivity bugs
**Mitigation:** Normalize all emails to lowercase at every entry point. Add test coverage for mixed-case email scenarios.

## Migration Plan

### Deployment Steps
1. Add `serde_yaml` dependency to `Cargo.toml`
2. Create `/app/data/families.yaml` with initial family mapping:
   ```yaml
   families:
     hewitt-family:
       members:
         - mazhewitt@gmail.com
         # add other family members
     friend-family:
       members:
         - friend@example.com
         # add friend's family members
   ```
3. Deploy code changes (auth, queries, handlers)
4. Restart application to load new config
5. Verify each family can only see their own recipes

### Rollback Strategy
If issues arise:
1. Remove config file or set all users to same family (temporary escape hatch)
2. Revert code changes and redeploy previous version
3. No database rollback needed (no schema changes)

### Testing Before Production
1. Test with local `families.yaml` containing test families
2. Verify cross-family isolation (Family A cannot see Family B's recipes)
3. Verify god mode (API key without X-User-Email sees all)
4. Verify scoped mode (API key with X-User-Email sees only that family)
5. Test case-insensitive email matching

## Open Questions

**Q: What if we want to transfer recipe ownership between families?**
A: For now, manually update `created_by` in the database. For 10 users, this is fine. Could add admin API endpoint later if needed.

**Q: Should we display family name in the UI?**
A: Not required per exploration discussion. Could add later if users want context like "Hewitt Family Recipes" header.

**Q: Do we need audit logging for who views whose recipes?**
A: Not currently. If needed later, could add access logs showing user + recipe_id lookups.
