# Implementation Tasks

## Prerequisites

This change depends on `cloudflare-identity-auth` being deployed first.

## 1. Database Migration (COMPLETED)

- [x] 1.1 Create migration to add `created_by` column (nullable VARCHAR) to recipes table
- [x] 1.2 Create migration to add `updated_by` column (nullable VARCHAR) to recipes table
- [x] 1.3 Add backfill statement to set existing recipes to mazhewitt@gmail.com
- [x] 1.4 Update Recipe model struct to include new fields
- [x] 1.5 Update recipe queries to accept user_email parameter
- [x] 1.6 Test migration runs successfully on development database

## 2. Update MCP Client (COMPLETED)

- [x] 2.1 Add `DEFAULT_AUTHOR_EMAIL` environment variable to MCP binary
- [x] 2.2 Pass user_email to ApiClient constructor
- [x] 2.3 Add `X-User-Email` header in HTTP client for create/update requests
- [x] 2.4 Update MCP documentation with DEFAULT_AUTHOR_EMAIL configuration
- [x] 2.5 Update HTTP client tests for new constructor signature

## 3. Update Web Handlers

- [x] 3.1 Update `create_recipe` handler to extract identity (Cloudflare or X-User-Email) and pass to query
- [x] 3.2 Update `update_recipe` handler to extract identity (Cloudflare or X-User-Email) and pass to query

## 4. Update UI Templates

- [x] 4.1 Display `created_by` on recipe display (if present)
- [x] 4.2 Display `updated_by` on recipe display (if present)
- [x] 4.3 Format email display nicely (e.g., show name portion or truncate)

## 5. Testing

- [x] 5.1 Add tests for recipe creation with identity tracking
- [x] 5.2 Verify existing recipe tests pass with nullable author fields
- [x] 5.3 Test migration can be applied to existing database without data loss
- [x] 5.4 Verify schema changes after migration (created_by and updated_by columns exist and are nullable)
- [x] 5.5 Test MCP recipe creation with DEFAULT_AUTHOR_EMAIL set
- [x] 5.6 Test MCP recipe creation without DEFAULT_AUTHOR_EMAIL (should be null)

## 6. Automated Database Backup (COMPLETED)

- [x] 6.1 Check if Docker deployment has an entrypoint script
- [x] 6.2 Add automated backup logic to entrypoint script before migrations
- [x] 6.3 Create backup directory in /app/data with timestamped database copies
- [x] 6.4 Only backup if database file exists (skip on first-time deployment)
- [x] 6.5 Document rollback procedure using backups

## 7. Production Deployment

- [ ] 7.1 Deploy updated Docker image with automated backup
- [ ] 7.2 Verify backup was created before migration ran
- [ ] 7.3 Verify migration completed successfully in production
- [ ] 7.4 Verify authorship data is present in production database
- [ ] 7.5 Test creating recipe via web UI (Cloudflare identity)
- [ ] 7.6 Test creating recipe via MCP (X-User-Email header)
