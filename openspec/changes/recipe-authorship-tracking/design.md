## Context

With Cloudflare Access providing user identity (from the `cloudflare-identity-auth` change), we can now track which family member created or modified recipes. This builds on the identity extraction already implemented.

## Goals / Non-Goals

**Goals:**
- Track who created each recipe
- Track who last updated each recipe
- Display authorship information in the UI

**Non-Goals:**
- Full audit log (only last update, not history)
- Permission-based editing (any user can edit any recipe)
- User profiles or accounts (just email display)

## Decisions

### Decision 1: Backfill Existing Recipes with Owner Email

**Choice**: Add nullable `created_by` and `updated_by` columns, but backfill all existing recipes with `mazhewitt@gmail.com`.

**Rationale**:
- All existing recipes were created by the owner (mazhewitt@gmail.com)
- Accurately reflects authorship instead of leaving null values
- Future recipes created via API key (MCP) may still have null if no user context
- Nullable fields still needed for MCP-created recipes

### Decision 2: Email as Identifier

**Choice**: Store full email address in created_by/updated_by fields.

**Rationale**:
- Simple to implement (direct from Cloudflare header)
- Human-readable in UI
- No need for separate user table

### Decision 3: Update Tracking on Any Change

**Choice**: Update `updated_by` whenever recipe metadata, ingredients, or steps are modified.

**Rationale**: Captures all recipe changes, not just title/description updates.

### Decision 4: Automated Database Backup Before Migrations

**Choice**: Automatically create timestamped database backups in Docker container startup script before running migrations.

**Rationale**:
- Prevents data loss from migration errors
- No manual intervention required for production deployments
- Backups persist in the `/app/data` volume
- Only backs up if database exists (handles first-time startup)
- Timestamped backups allow rollback to specific points

**Implementation**: Add backup logic to Docker entrypoint script that runs before `sqlx migrate run`.

## Implementation Notes

The database layer changes (migration, model, queries) have already been implemented and are waiting for handler integration:
- Migration: `migrations/20260204000001_add_recipe_authorship.sql`
- Model: `src/models/recipe.rs` - Recipe struct has created_by/updated_by
- Queries: `src/db/queries.rs` - create_recipe/update_recipe accept user_email parameter

Remaining work is to wire up the handlers to pass the user identity to these queries.

### MCP User Attribution

For recipes created via Claude Desktop (MCP), the MCP server will:
1. Accept a `DEFAULT_AUTHOR_EMAIL` environment variable (configured in Claude Desktop config)
2. Send this as an `X-User-Email` header with create/update requests
3. Web handlers will check for this header and use it for attribution

This allows the owner to attribute MCP-created recipes to themselves without hardcoding the email in the codebase.
