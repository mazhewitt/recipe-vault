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

### Decision 1: Nullable created_by/updated_by Fields

**Choice**: Add nullable `created_by` and `updated_by` columns to recipes table.

**Rationale**:
- Existing recipes don't have this data (can't backfill)
- Recipes created via API key (MCP) may not have user context
- Keeps migration simple (no data transformation needed)

### Decision 2: Email as Identifier

**Choice**: Store full email address in created_by/updated_by fields.

**Rationale**:
- Simple to implement (direct from Cloudflare header)
- Human-readable in UI
- No need for separate user table

### Decision 3: Update Tracking on Any Change

**Choice**: Update `updated_by` whenever recipe metadata, ingredients, or steps are modified.

**Rationale**: Captures all recipe changes, not just title/description updates.

## Implementation Notes

The database layer changes (migration, model, queries) have already been implemented and are waiting for handler integration:
- Migration: `migrations/20260204000001_add_recipe_authorship.sql`
- Model: `src/models/recipe.rs` - Recipe struct has created_by/updated_by
- Queries: `src/db/queries.rs` - create_recipe/update_recipe accept user_email parameter

Remaining work is to wire up the handlers to pass the user identity to these queries.
