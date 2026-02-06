
## Database Migration Rules

**NEVER modify a migration that has already been applied.** sqlx tracks checksums of migration files. If you change a migration after it has run on any environment (dev, staging, production), sqlx will refuse to run migrations entirely, preventing the application from starting.

Instead:
- Create a **new migration file** with a later timestamp for any changes (e.g., backfills, column modifications)
- Migration filenames use the format: `YYYYMMDDHHMMSS_description.sql`
- Always test migrations against a copy of the production database before deploying
- The `DATABASE_URL` must include `?mode=rwc` for SQLite to allow creating new database files
- The database filename in `DATABASE_URL` must match the actual production database file (currently `recipes.db`)

**NEVER modify the production database filename** without verifying what the actual file is called on the deployment target.

## Deployment Rules

- This project uses CI/CD via git tags (e.g., `v2.1.0`)
- The production database is at `/app/data/recipes.db` inside the Docker container
- The `docker-entrypoint.sh` creates backups before migrations and will start the app even if migrations fail
- After deploying static asset changes, **purge the Cloudflare cache** (Caching > Purge Everything)

## Security Rules

**NEVER commit secrets to git.** This includes:
- API keys, tokens, passwords
- `.env` files with real credentials
- `.api_key` files
- Private keys or certificates
- Any file containing `API_KEY=`, `SECRET=`, `PASSWORD=`, or similar

Before committing, verify no secrets are staged:
- Check `git diff --cached` for sensitive values
- Ensure `.gitignore` covers secret file patterns

If you accidentally stage a secret, remove it immediately with `git reset HEAD <file>`.
