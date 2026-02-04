# Implementation Tasks

## Prerequisites

This change depends on `cloudflare-identity-auth` being deployed first.

## 1. Database Migration (COMPLETED)

- [x] 1.1 Create migration to add `created_by` column (nullable VARCHAR) to recipes table
- [x] 1.2 Create migration to add `updated_by` column (nullable VARCHAR) to recipes table
- [x] 1.3 Update Recipe model struct to include new fields
- [x] 1.4 Update recipe queries to accept user_email parameter
- [ ] 1.5 Test migration runs successfully on development database

## 2. Update Handlers

- [ ] 2.1 Update `create_recipe` handler to extract identity and pass to query
- [ ] 2.2 Update `update_recipe` handler to extract identity and pass to query

## 3. Update UI Templates

- [ ] 3.1 Display `created_by` on recipe display (if present)
- [ ] 3.2 Display `updated_by` on recipe display (if present)
- [ ] 3.3 Format email display nicely (e.g., show name portion or truncate)

## 4. Testing

- [ ] 4.1 Add tests for recipe creation with identity tracking
- [ ] 4.2 Verify existing recipe tests pass with nullable author fields
- [ ] 4.3 Test migration can be applied to existing database without data loss
- [ ] 4.4 Verify schema changes after migration (created_by and updated_by columns exist and are nullable)

## 5. Deployment

- [ ] 5.1 Backup production database before applying migration
- [ ] 5.2 Test migration on a copy of production database
- [ ] 5.3 Run migration in production environment (sqlx migrate run)
- [ ] 5.4 Verify migration completed successfully in production
- [ ] 5.5 Document rollback procedure if migration fails
