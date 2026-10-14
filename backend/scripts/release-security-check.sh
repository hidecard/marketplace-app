#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

# Runtime secrets and private keys must never be tracked. Public Firebase client
# configuration is intentionally excluded because it is not a credential.
if git ls-files | grep -E '(^|/)(\.env|.*\.pem|.*\.p12|.*\.key|.*service-account.*|.*credentials.*)$' | grep -vE '(^|/)\.env\.example$'; then
  fail "Tracked runtime secret/key file detected."
fi

if git grep -n -I -E -e '-----BEGIN (RSA|OPENSSH|EC|PRIVATE) KEY-----|(^|[^A-Za-z])(ghp|github_pat|sk_live|sk_test)_[A-Za-z0-9_]+' -- \
  ':!backend/vendor/**' ':!backend/public/build/**' ':!*.lock' ':!backend/scripts/release-security-check.sh'; then
  fail "Private key or provider secret pattern detected in tracked source."
fi

[[ ! -e backend/public/.env && ! -e backend/storage/.env ]] || fail "A runtime .env exists inside a public/runtime release subdirectory."
[[ -f backend/composer.lock && -f backend/package-lock.json ]] || fail "Dependency lock files are missing."
[[ -x backend/scripts/check-production-config.sh ]] || fail "Production config validator is not executable."
[[ -x backend/scripts/staging-smoke.sh ]] || fail "Staging smoke script is not executable."

echo "Release security baseline passed."
