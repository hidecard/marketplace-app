#!/usr/bin/env bash
set -Eeuo pipefail

# Hostinger Git root must be: backend
# This script intentionally does not move, copy, or rename .env or public/index.php.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "$(basename "$ROOT_DIR")" != "backend" ]]; then
  echo "ERROR: run this script from the Laravel backend directory." >&2
  exit 1
fi

if [[ ! -f vendor/autoload.php ]]; then
  if [[ "$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')" < "8.4" ]]; then
    echo "ERROR: Composer dependencies require PHP 8.4+ on a fresh deployment. Set Hostinger PHP to 8.4 before deploying." >&2
    exit 1
  fi
  composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader
else
  echo "Using existing backend/vendor; skipping Composer install."
fi

if [[ -f package-lock.json ]]; then
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi
npm run build

# Fail early if the deployment layout is accidentally changed.
test -f public/index.php || { echo "ERROR: backend/public/index.php is missing." >&2; exit 1; }
test -f public/.htaccess || { echo "ERROR: backend/public/.htaccess is missing." >&2; exit 1; }
test ! -e public/.env || { echo "ERROR: .env must remain outside backend/public." >&2; exit 1; }

echo "Hostinger build complete. Keep the domain document root at backend/public."
