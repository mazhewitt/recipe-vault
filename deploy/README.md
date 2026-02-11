# Recipe Vault Production Deployment

This directory contains configuration for deploying Recipe Vault to a Synology NAS (or any Docker-capable server).

## Prerequisites

- Synology NAS with "Container Manager" (Docker) installed
- SSH access enabled on Synology (for initial setup)
- A Docker Hub account with the `recipe-vault` image pushed (see repo README)

## Setup Instructions

1.  **Prepare Directory**
    SSH into your Synology or use File Station to create a folder:
    `/volume1/docker/recipe-vault`

2.  **Upload Files**
    Upload `docker-compose.prod.yml` and `.env.example` to this folder.

3.  **Configure**
    - Rename `docker-compose.prod.yml` to `docker-compose.yml`.
    - Edit `docker-compose.yml`: Change `username/recipe-vault:latest` to your actual image name.
    - Rename `.env.example` to `.env`.
    - Edit `.env`: Add your `ANTHROPIC_API_KEY` and `FAMILY_PASSWORD`.

4.  **Start Services**
    
    **Option A: Synology Container Manager (UI)**
    - Open Container Manager.
    - Go to "Project".
    - Click "Create".
    - Name: `recipe-vault`.
    - Path: Select `/docker/recipe-vault`.
    - Source: "Create docker-compose.yml" (it will use the existing one).
    - Click "Next", then "Done".

    **Option B: SSH (Command Line)**
    ```bash
    cd /volume1/docker/recipe-vault
    sudo docker-compose up -d
    ```

5.  **Access**
    Open `http://<synology-ip>:3000` in your browser.

## Automatic Updates

The `watchtower` service is configured to check for new images every 5 minutes. When a new version is pushed to Docker Hub with the `latest` tag:
1.  Watchtower pulls the new image.
2.  It restarts the `recipe-vault` container.
3.  Your data in `data/` is preserved.

## Database Migrations

Migrations run automatically on container startup via `docker-entrypoint.sh`. The entrypoint:

1. **Backs up** the database before running migrations (timestamped copy in `data/backups/`)
2. **Runs migrations** via `sqlx migrate run`
3. **Starts the app** regardless of migration success (to avoid restart loops)

If migrations fail, the app starts with the existing schema and logs a warning.

### Migration Rules

- **Never modify an existing migration file** after it has been applied. sqlx tracks checksums and will reject modified migrations, preventing the app from starting.
- Always create a **new migration file** for changes (backfills, column modifications, etc.)
- Migration filenames: `YYYYMMDDHHMMSS_description.sql`
- The `DATABASE_URL` must include `?mode=rwc` for SQLite to create new database files
- The database file is `recipes.db` (not `recipe-vault.db`)

### Troubleshooting Migration Failures

If you see `migration was previously applied but has been modified`:

```bash
# 1. Check what's in the migrations table
sudo docker run --rm -v /volume1/docker/recipe-vault/data:/app/data \
  alpine:latest sh -c "apk add --no-cache sqlite && \
  sqlite3 /app/data/recipes.db 'SELECT version, description FROM _sqlx_migrations;'"

# 2. If you must fix a checksum mismatch, delete the record and re-insert
#    (only if you're certain the migration's effects are already applied)
sudo docker run --rm -v /volume1/docker/recipe-vault/data:/app/data \
  alpine:latest sh -c "apk add --no-cache sqlite && \
  sqlite3 /app/data/recipes.db 'DELETE FROM _sqlx_migrations WHERE version = XXXXXXX;'"
```

## Backup Strategy

### Database + Photos Backup

The `data/` directory contains both the SQLite database and recipe photos:
```
/volume1/docker/recipe-vault/data/
├── recipes.db              # SQLite database
├── photos/                 # Recipe photos (JPG, PNG, WebP, GIF)
│   ├── recipe-id-1.jpg
│   ├── recipe-id-2.png
│   └── ...
├── backups/                # Automatic database backups (created by entrypoint)
│   ├── recipes_backup_TIMESTAMP.db
│   └── ...
└── .api_key               # API authentication key
```

### Backup Recommendations

**Option 1: Docker Volume Backup (Recommended)**
```bash
# Stop the container
cd /volume1/docker/recipe-vault
sudo docker-compose down

# Create compressed backup
sudo tar -czf recipe-vault-backup-$(date +%Y%m%d).tar.gz data/

# Restart container
sudo docker-compose up -d
```

**Option 2: Synology Hyperbackup**
- Configure Hyperbackup to include `/docker/recipe-vault/data/`
- Schedule regular backups (daily/weekly)
- Includes both database and photos automatically

**Option 3: Manual Backup Script**
```bash
#!/bin/bash
# Save as /volume1/docker/recipe-vault/backup.sh

BACKUP_DIR="/volume1/docker/recipe-vault/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/full-backup-$TIMESTAMP.tar.gz" \
  -C /volume1/docker/recipe-vault data/

# Keep only last 7 backups
ls -t "$BACKUP_DIR"/full-backup-*.tar.gz | tail -n +8 | xargs rm -f
```

### Restore from Backup

```bash
# Stop container
cd /volume1/docker/recipe-vault
sudo docker-compose down

# Restore data directory
sudo tar -xzf recipe-vault-backup-YYYYMMDD.tar.gz

# Verify photos directory exists
ls -la data/photos/

# Restart container
sudo docker-compose up -d
```

**Important**: The entrypoint creates automatic database backups before migrations in `data/backups/`. These backups do NOT include photos - use full `data/` backups to preserve photos.

### Post-Deployment Checklist

After deploying changes that include static assets (JS, CSS):
- **Purge Cloudflare cache**: Dashboard > Caching > Configuration > Purge Everything
- Shift-reload only bypasses browser cache, not Cloudflare's CDN cache
