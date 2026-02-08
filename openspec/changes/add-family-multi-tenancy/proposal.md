## Why

The Recipe Vault is currently single-user with all recipes visible to everyone who authenticates. Users want to share the app with friends while keeping their recipes private to their own families. We need family-based multi-tenancy where ~10 users across 2 families can each see only their family's recipes.

## What Changes

- Add a configuration file (`families.yaml`) that maps user emails to family groups
- Modify all recipe queries to filter by family membership based on the authenticated user's email
- Support god mode for API key authentication (access all recipes when X-User-Email header is omitted)
- Support scoped access for API key authentication (scope to family when X-User-Email header is provided)
- Normalize all email addresses to lowercase for case-insensitive matching
- Return 404 (not 403) for cross-family recipe access to preserve privacy
- Display "contact admin" message for users not in the family configuration

## Capabilities

### New Capabilities

- `family-multi-tenancy`: Configuration-based family groups with email-to-family mapping, family member lookup, and recipe query filtering

### Modified Capabilities

- `api-security`: Add X-User-Email header support for scoped access, god mode behavior when header is omitted, case-insensitive email handling
- `recipe-domain`: Add family-based filtering to list, get, update, and delete operations using the creator's email and family membership
- `mcp-interface`: Pass X-User-Email header from MCP client to API for scoped access

## Impact

**Code:**
- `src/auth.rs` - Add family config loading, email normalization, family member lookup
- `src/config.rs` - Add families.yaml config file loading
- `src/db/queries.rs` - Modify all recipe queries to filter by family members list (using `created_by IN (...)`)
- `src/handlers/recipes.rs` - Update handlers to extract family members from UserIdentity and handle god mode
- All recipe-related tests - Update to verify family isolation and god mode behavior

**Configuration:**
- New `families.yaml` file deployed with the application
- No database schema changes needed (uses existing `created_by` field)

**Dependencies:**
- Add YAML parsing library (serde_yaml) to Cargo.toml

**Testing:**
- Cross-family isolation tests (404 responses)
- God mode tests (API key without X-User-Email)
- Scoped mode tests (API key with X-User-Email)
- Email case-insensitivity tests
- Config file loading tests with temp files
