#!/usr/bin/env bash
set -Eeuo pipefail

# Hostinger Git replaces the contents of public_html on every deployment.
# Keep vendor one level above public_html so it survives the replacement.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT_DIR="$(cd "$ROOT_DIR/.." && pwd)"
PERSISTENT_VENDOR_DIR="$PARENT_DIR/.easyzaymm-vendor"
LOCK_HASH_FILE="$PERSISTENT_VENDOR_DIR/.composer-lock.sha256"
cd "$ROOT_DIR"

if [[ ! -f composer.json || ! -f composer.lock || ! -d public ]]; then
  echo "ERROR: run this script from the deployed Laravel root." >&2
  exit 1
fi

CURRENT_LOCK_HASH="$(sha256sum composer.lock | awk '{print $1}')"
CACHED_LOCK_HASH=""
[[ -f "$LOCK_HASH_FILE" ]] && CACHED_LOCK_HASH="$(cat "$LOCK_HASH_FILE")"

if [[ ! -f "$PERSISTENT_VENDOR_DIR/autoload.php" || "$CURRENT_LOCK_HASH" != "$CACHED_LOCK_HASH" ]]; then
  echo "Installing Composer dependencies into persistent cache: $PERSISTENT_VENDOR_DIR"
  rm -rf "$PERSISTENT_VENDOR_DIR"
  mkdir -p "$PERSISTENT_VENDOR_DIR"
  COMPOSER_VENDOR_DIR="$PERSISTENT_VENDOR_DIR" composer install \
    --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts
  printf '%s\n' "$CURRENT_LOCK_HASH" > "$LOCK_HASH_FILE"
else
  echo "Composer dependencies unchanged; reusing persistent vendor cache."
fi

# Recreate the application vendor link after every Git deployment.
if [[ -e "$ROOT_DIR/vendor" && ! -L "$ROOT_DIR/vendor" ]]; then
  rm -rf "$ROOT_DIR/vendor"
fi
ln -sfn "$PERSISTENT_VENDOR_DIR" "$ROOT_DIR/vendor"

# Composer scripts are disabled during the cache install because the app link
# does not exist yet. Discover Laravel packages after the link is restored.
php artisan package:discover --ansi

if [[ -f package-lock.json ]] && command -v npm >/dev/null 2>&1; then
  npm ci --no-audit --no-fund
  npm run build
fi

# Never move or delete .env, storage, or uploaded media.
test -f vendor/autoload.php
test -f public/index.php
test -f public/.htaccess
test ! -e public/.env
echo "Hostinger build complete; persistent vendor cache is active."
