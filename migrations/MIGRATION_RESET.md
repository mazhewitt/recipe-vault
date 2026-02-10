# Migration Reset Guide for v2.6.1 Baseline

## Overview
All migrations have been consolidated into a single baseline migration: `20260210120000_baseline_v2_6_1.sql`

**IMPORTANT**: The baseline migration is idempotent and safe to run on existing databases. It uses `CREATE TABLE IF NOT EXISTS` and `INSERT OR IGNORE` to avoid conflicts.

## Prerequisites
- Ensure production is on v2.6.1 (current baseline)
- Backup all databases before proceeding

## Deployment Process

The migration reset happens automatically when you deploy the new code:

1. **Tag and deploy**: `git tag v2.6.2 && git push origin v2.6.2`
2. The application will:
   - Detect that old migrations are missing
   - Delete entries from `_sqlx_migrations` table
   - Run the new baseline migration (which safely skips existing tables)
   - Start normally

## Manual Reset (if needed)

### Development (Local)

```bash
# Backup your local database
cp recipe-vault.db recipe-vault.db.backup

# Reset migrations table
sqlite3 recipe-vault.db "DELETE FROM _sqlx_migrations;"

# Run the baseline migration (safe on existing database)
cargo sqlx migrate run

# Verify
sqlite3 recipe-vault.db "SELECT * FROM _sqlx_migrations;"
```

### Production

**IMPORTANT**: Only do this if automatic deployment fails.

```bash
# SSH to production server
ssh production-server

# Backup (this is critical!)
cp /app/data/recipes.db /app/data/recipes.db.backup.$(date +%Y%m%d_%H%M%S)

# Reset the migrations table
sqlite3 /app/data/recipes.db "DELETE FROM _sqlx_migrations;"

# Restart the container (it will run migrations on startup)
docker restart recipe-vault

# Monitor logs to ensure migration completes successfully
docker logs -f recipe-vault
```

## Verification

After resetting migrations, verify the `_sqlx_migrations` table contains only one entry:

```sql
SELECT * FROM _sqlx_migrations;
```

Expected result:
```
version              | description           | installed_on | success | checksum | execution_time
---------------------|----------------------|--------------|---------|----------|---------------
20260210120000       | baseline v2 6 1      | <timestamp>  | 1       | <hash>   | <time>
```

## Rollback Plan

If something goes wrong:

1. Stop the application
2. Restore from backup: `cp recipes.db.backup recipes.db`
3. Revert code to previous tag: `git checkout v2.6.1`
4. Restart application

## Notes

- The baseline migration creates the exact same schema as the 4 previous migrations combined
- Existing data is preserved (only the `_sqlx_migrations` table is modified)
- New installations will only run one migration instead of four
