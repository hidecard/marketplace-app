#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="${APP_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
PARENT_DIR="$(cd "$ROOT_DIR/.." && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-$PARENT_DIR/.easyzaymm-backups}"
BACKUP_DIR="${1:-}"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

[[ "${CONFIRM_RESTORE:-}" == "YES" ]] || fail "Set CONFIRM_RESTORE=YES to run a destructive restore."
[[ -n "$BACKUP_DIR" ]] || fail "Usage: CONFIRM_RESTORE=YES $0 /path/to/backup-directory"
[[ -d "$BACKUP_DIR" ]] || BACKUP_DIR="$BACKUP_ROOT/$BACKUP_DIR"
[[ -f "$BACKUP_DIR/database.sql.gz" && -f "$BACKUP_DIR/storage-app-public.tar.gz" ]] || fail "Backup directory is incomplete."
[[ -f "$BACKUP_DIR/manifest.txt" ]] || fail "Backup manifest is missing."

cd "$ROOT_DIR"
(cd "$BACKUP_DIR" && sha256sum --check <(grep -E ' (database\.sql\.gz|storage-app-public\.tar\.gz)$' manifest.txt))

ENV_FILE="${ENV_FILE:-$PARENT_DIR/.env}"
env_value() {
  local key="$1" value
  [[ -f "$ENV_FILE" ]] || return 0
  value="$(sed -n -E "s/^[[:space:]]*${key}[[:space:]]*=[[:space:]]*//p" "$ENV_FILE" | head -n 1)"
  value="${value%%#*}"
  value="${value%$'\r'}"
  value="${value#\"}"; value="${value%\"}"
  value="${value#\'}"; value="${value%\'}"
  printf '%s' "$value"
}
DB_HOST="${DB_HOST:-$(env_value DB_HOST)}"
DB_PORT="${DB_PORT:-$(env_value DB_PORT)}"
DB_DATABASE="${DB_DATABASE:-$(env_value DB_DATABASE)}"
DB_USERNAME="${DB_USERNAME:-$(env_value DB_USERNAME)}"
DB_PASSWORD="${DB_PASSWORD:-$(env_value DB_PASSWORD)}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"

command -v mysql >/dev/null 2>&1 || fail "mysql client is required for restore."
[[ -n "$DB_DATABASE" && -n "$DB_USERNAME" ]] || fail "DB_DATABASE and DB_USERNAME are required."

echo "Restoring database '$DB_DATABASE' from $BACKUP_DIR..."
gzip -dc "$BACKUP_DIR/database.sql.gz" | mysql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USERNAME" \
  --password="$DB_PASSWORD" \
  "$DB_DATABASE"

echo "Restoring storage/app/public..."
mkdir -p "$ROOT_DIR/storage/app"
TEMP_STORAGE="$ROOT_DIR/storage/app/.public-restore-$$"
rm -rf "$TEMP_STORAGE"
mkdir -p "$TEMP_STORAGE"
tar -xzf "$BACKUP_DIR/storage-app-public.tar.gz" -C "$TEMP_STORAGE"
rm -rf "$ROOT_DIR/storage/app/public"
mv "$TEMP_STORAGE/public" "$ROOT_DIR/storage/app/public"
rmdir "$TEMP_STORAGE"

echo "Restore completed. Run 'php artisan optimize:clear' and verify the application before reopening traffic."
