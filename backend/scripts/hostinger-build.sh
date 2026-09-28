#!/usr/bin/env bash
set -Eeuo pipefail

# Hostinger may deploy backend/ into public_html, or keep it under public_html/backend.
# This script intentionally does not move, copy, or rename .env or public/index.php.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f composer.json || ! -d public ]]; then
  echo "ERROR: run this script from the deployed Laravel root." >&2
  exit 1
fi

if [[ ! -f vendor/autoload.php ]]; then
  # Hostinger shared hosting disables proc_open; no-scripts still creates the
  # complete runtime autoloader without failing on Composer post-install hooks.
  composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts
else
  echo "Using existing Laravel vendor; skipping Composer install."
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

echo "Hostinger build complete. Prefer the domain document root at backend/public."
