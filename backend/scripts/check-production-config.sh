#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="${APP_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
PARENT_DIR="$(cd "$ROOT_DIR/.." && pwd)"
ENV_FILE="${ENV_FILE:-$PARENT_DIR/.env}"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

[[ -f "$ENV_FILE" ]] || fail "Production environment file not found outside the release: $ENV_FILE"
[[ ! -e "$ROOT_DIR/.env" && ! -e "$ROOT_DIR/public/.env" ]] || fail "Production .env must not exist inside the deployed release."

env_value() {
  local key="$1" value
  value="$(sed -n -E "s/^[[:space:]]*${key}[[:space:]]*=[[:space:]]*//p" "$ENV_FILE" | head -n 1)"
  value="${value%%#*}"
  value="${value%$'\r'}"
  value="${value#\"}"; value="${value%\"}"
  value="${value#\'}"; value="${value%\'}"
  printf '%s' "$value"
}

require_value() {
  local key="$1" value
  value="$(env_value "$key")"
  [[ -n "$value" ]] || fail "$key is missing or empty in $ENV_FILE"
}

[[ "$(env_value APP_ENV)" == 'production' ]] || fail "APP_ENV must be production."
require_value APP_KEY
require_value APP_URL
require_value DB_DATABASE
require_value DB_USERNAME
require_value DB_PASSWORD

APP_KEY="$(env_value APP_KEY)"
APP_URL="$(env_value APP_URL)"
APP_DEBUG="$(env_value APP_DEBUG)"
DB_CONNECTION="$(env_value DB_CONNECTION)"
[[ "$APP_KEY" == base64:* ]] || fail "APP_KEY must be a generated base64 Laravel key."
[[ "$APP_URL" == https://* ]] || fail "APP_URL must use HTTPS."
[[ "$APP_DEBUG" != 'true' && "$APP_DEBUG" != '1' ]] || fail "APP_DEBUG must be false in production."
[[ "$DB_CONNECTION" == 'mysql' || "$DB_CONNECTION" == 'mariadb' ]] || fail "DB_CONNECTION must be mysql or mariadb."

for key in SEED_ADMIN_PASSWORD SEED_SELLER_PASSWORD SEED_USER_PASSWORD; do
  value="$(env_value "$key")"
  if [[ -n "$value" && ${#value} -lt 12 ]]; then
    fail "$key must be at least 12 characters when configured."
  fi
done

echo "Production configuration validation passed for $ENV_FILE."
