
## Specifications

Feature requirements live in `openspec/specs/<capability>/spec.md`. Before implementing or modifying any feature, check whether a spec exists for that area and read it — specs are the authoritative source of requirements and acceptance scenarios.

Key specs:
- `openspec/specs/recipe-domain/` — core recipe model, CRUD rules
- `openspec/specs/family-multi-tenancy/` — family scoping, recipe isolation, god mode
- `openspec/specs/api-security/` — API key auth, Cloudflare Access, middleware
- `openspec/specs/web-auth/` — authentication flow
- `openspec/specs/web-chat/` — chat interface, SSE streaming
- `openspec/specs/mcp-interface/` — MCP tools and protocol
- `openspec/specs/recipe-sharing/` — share links, public share page
- `openspec/specs/recipe-photo-storage/` — photo upload, serving, deletion
- `openspec/specs/recipe-difficulty-rating/` — AI difficulty assessment
- `openspec/specs/cooking-guidance/` — guided cooking mode
- `openspec/specs/frontend-modules/` — JS module structure
- `openspec/specs/deployment/` — Docker, Synology, CI/CD

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
