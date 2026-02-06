# Database Rollback Procedure

## Overview

The Docker container automatically creates timestamped backups before running migrations. This document explains how to rollback to a previous backup if needed.

## Backup Location

Backups are stored in `/app/data/backups/` within the Docker container with the format:
```
recipe-vault-YYYYMMDD-HHMMSS.db
```

## Rollback Steps

### 1. List Available Backups

```bash
# SSH into your Synology NAS
ssh user@nas-ip

# List backups inside the container
sudo docker exec recipe-vault ls -lh /app/data/backups/

# Or list from the host volume
ls -lh /volume1/docker/recipe-vault/data/backups/
```

### 2. Stop the Container

```bash
sudo docker stop recipe-vault
```

### 3. Restore the Backup

Choose the backup you want to restore (use the timestamp to identify the right one):

```bash
# Option A: Restore from inside container backup
sudo docker exec recipe-vault cp /app/data/backups/recipe-vault-YYYYMMDD-HHMMSS.db /app/data/recipe-vault.db

# Option B: Restore from host volume
sudo cp /volume1/docker/recipe-vault/data/backups/recipe-vault-YYYYMMDD-HHMMSS.db \
         /volume1/docker/recipe-vault/data/recipe-vault.db
```

### 4. Restart the Container

```bash
sudo docker start recipe-vault
```

### 5. Verify the Restore

```bash
# Check the application logs
sudo docker logs recipe-vault

# Verify the web interface is working
# Navigate to your Recipe Vault URL
```

## Backup Retention

The entrypoint script automatically keeps only the last 10 backups to prevent disk space issues. Older backups are automatically deleted.

## Manual Backup

To create a manual backup outside the automatic process:

```bash
# Create a backup with current timestamp
sudo docker exec recipe-vault cp /app/data/recipe-vault.db \
    /app/data/backups/recipe-vault-manual-$(date +%Y%m%d-%H%M%S).db
```

## Testing Rollback (Development)

Before production deployment, test the rollback procedure:

```bash
# 1. Create a test backup
cp recipe-vault.db recipe-vault-test-backup.db

# 2. Run migrations
sqlx migrate run

# 3. Verify migration worked
sqlite3 recipe-vault.db "PRAGMA table_info(recipes);"

# 4. Test rollback
cp recipe-vault-test-backup.db recipe-vault.db

# 5. Verify old schema is restored
sqlite3 recipe-vault.db "PRAGMA table_info(recipes);"
```

## Troubleshooting

### Container won't start after restore

1. Check container logs: `sudo docker logs recipe-vault`
2. Verify file permissions: `sudo docker exec recipe-vault ls -l /app/data/`
3. Ensure database file is not corrupted:
   ```bash
   sudo docker exec recipe-vault sqlite3 /app/data/recipe-vault.db "PRAGMA integrity_check;"
   ```

### Backup file not found

1. Check if backup directory exists: `sudo docker exec recipe-vault ls -la /app/data/`
2. Verify Docker volume mount: `sudo docker inspect recipe-vault | grep Mounts -A 20`
