#!/usr/bin/env bash
set -Eeuo pipefail

# Deployments are built in GitHub Actions. This guard is intentionally not a
# Composer installer: running Composer on Hostinger caused vendor/ to be
# recreated after every Git sync and made releases slow and fragile.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f vendor/autoload.php ]]; then
  echo "ERROR: vendor/autoload.php is missing." >&2
  echo "Build and deploy through .github/workflows/hostinger.yml; do not run Composer on Hostinger." >&2
  exit 1
fi

if [[ ! -f public/index.php || ! -f public/.htaccess ]]; then
  echo "ERROR: Laravel public entrypoint is incomplete." >&2
  exit 1
fi

if [[ -e public/.env || -e .env ]]; then
  echo "ERROR: .env must remain server-only and outside public/." >&2
  exit 1
fi

echo "Hostinger release is valid. Composer was supplied by CI."
