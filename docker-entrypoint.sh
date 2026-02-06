#!/bin/bash
set -e

DB_FILE="/app/data/recipe-vault.db"
BACKUP_DIR="/app/data/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup existing database before running migrations
if [ -f "$DB_FILE" ]; then
    echo "📦 Creating database backup before migrations..."
    BACKUP_FILE="$BACKUP_DIR/recipe-vault-$TIMESTAMP.db"
    cp "$DB_FILE" "$BACKUP_FILE"
    echo "✅ Backup created: $BACKUP_FILE"

    # Keep only last 10 backups to prevent disk space issues
    echo "🧹 Cleaning up old backups (keeping last 10)..."
    ls -t "$BACKUP_DIR"/recipe-vault-*.db | tail -n +11 | xargs -r rm --
    echo "✅ Cleanup complete"
else
    echo "ℹ️  No existing database found, skipping backup (first-time deployment)"
fi

# Run migrations
echo "🔄 Running database migrations..."
sqlx migrate run
echo "✅ Migrations complete"

# Start the application
echo "🚀 Starting Recipe Vault..."
exec recipe-vault
