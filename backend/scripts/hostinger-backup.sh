#!/usr/bin/env bash
set -Eeuo pipefail

# Run from a deployed Laravel root. Backups must live outside the release tree
# because Hostinger Git replaces the application directory on every sync.
ROOT_DIR="${APP_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
PARENT_DIR="$(cd "$ROOT_DIR/.." && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-$PARENT_DIR/.easyzaymm-backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
LOCK_FILE="${BACKUP_LOCK_FILE:-$PARENT_DIR/.easyzaymm-backup.lock}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TEMP_DIR="$BACKUP_ROOT/.incomplete-$TIMESTAMP-$$"
FINAL_DIR="$BACKUP_ROOT/$TIMESTAMP"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

[[ -f "$ROOT_DIR/artisan" && -d "$ROOT_DIR/storage" ]] || fail "APP_ROOT must point to the deployed Laravel root."
[[ "$BACKUP_ROOT" != "$ROOT_DIR"/* && "$BACKUP_ROOT" != "$ROOT_DIR" ]] || fail "BACKUP_ROOT must be outside the deployed application root."
[[ "$RETENTION_DAYS" =~ ^[0-9]+$ && "$RETENTION_DAYS" -ge 7 ]] || fail "BACKUP_RETENTION_DAYS must be an integer of at least 7."

if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK_FILE"
  flock -n 9 || fail "Another backup is already running."
fi

mkdir -p "$BACKUP_ROOT"
umask 077
mkdir -p "$TEMP_DIR"

# Read simple KEY=value entries from the external Laravel .env without putting
# credentials in process arguments other than the password passed to mysqldump.
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

DB_CONNECTION="${DB_CONNECTION:-$(env_value DB_CONNECTION)}"
DB_HOST="${DB_HOST:-$(env_value DB_HOST)}"
DB_PORT="${DB_PORT:-$(env_value DB_PORT)}"
DB_DATABASE="${DB_DATABASE:-$(env_value DB_DATABASE)}"
DB_USERNAME="${DB_USERNAME:-$(env_value DB_USERNAME)}"
DB_PASSWORD="${DB_PASSWORD:-$(env_value DB_PASSWORD)}"
DB_CONNECTION="${DB_CONNECTION:-mysql}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"

if [[ "$DB_CONNECTION" == "mysql" || "$DB_CONNECTION" == "mariadb" ]]; then
  command -v mysqldump >/dev/null 2>&1 || fail "mysqldump is required for MySQL backups."
  [[ -n "$DB_DATABASE" && -n "$DB_USERNAME" ]] || fail "DB_DATABASE and DB_USERNAME are required."
  echo "Creating MySQL backup for $DB_DATABASE..."
  MYSQL_DUMP="$TEMP_DIR/database.sql.gz"
  mysqldump \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    --hex-blob \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --user="$DB_USERNAME" \
    --password="$DB_PASSWORD" \
    "$DB_DATABASE" | gzip -9 > "$MYSQL_DUMP"
else
  fail "Unsupported DB_CONNECTION '$DB_CONNECTION'; refusing to create an incomplete production backup."
fi

PUBLIC_STORAGE="$ROOT_DIR/storage/app/public"
[[ -d "$PUBLIC_STORAGE" ]] || fail "Missing storage/app/public; refusing to create an incomplete backup."
echo "Creating uploaded storage backup..."
tar -C "$ROOT_DIR/storage/app" -czf "$TEMP_DIR/storage-app-public.tar.gz" public

cat > "$TEMP_DIR/manifest.txt" <<EOF
created_at_utc=$TIMESTAMP
app_root=$ROOT_DIR
db_connection=$DB_CONNECTION
db_database=$DB_DATABASE
storage_source=$PUBLIC_STORAGE
EOF
(
  cd "$TEMP_DIR"
  sha256sum database.sql.gz storage-app-public.tar.gz >> manifest.txt
)

mv "$TEMP_DIR" "$FINAL_DIR"
trap - EXIT
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20??????T??????Z' -mtime "+$RETENTION_DAYS" -exec rm -rf -- {} +

echo "Backup completed: $FINAL_DIR"
ls -lh "$FINAL_DIR"
