#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${STAGING_BASE_URL:-${1:-}}"
TIMEOUT_SECONDS="${STAGING_HTTP_TIMEOUT:-20}"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

[[ -n "$BASE_URL" ]] || fail "Set STAGING_BASE_URL or pass the staging URL as the first argument."
BASE_URL="${BASE_URL%/}"
[[ "$BASE_URL" =~ ^https:// ]] || fail "STAGING_BASE_URL must use HTTPS."
command -v curl >/dev/null 2>&1 || fail "curl is required."

check_url() {
  local path="$1" expected="${2:-200}" status
  status="$(curl --silent --show-error --location --max-time "$TIMEOUT_SECONDS" \
    --output /dev/null --write-out '%{http_code}' "$BASE_URL$path")"
  [[ "$status" == "$expected" ]] || fail "$path returned HTTP $status; expected $expected."
  echo "PASS $path ($status)"
}

check_url '/up'
check_url '/api/health'
check_url '/'
check_url '/products'
check_url '/build/manifest.json'

# This account must be staging-only. The login is read-only and the token is
# kept in a temporary file that is removed on exit; it is never printed.
if [[ -n "${STAGING_TEST_EMAIL:-}" || -n "${STAGING_TEST_PASSWORD:-}" ]]; then
  [[ -n "${STAGING_TEST_EMAIL:-}" && -n "${STAGING_TEST_PASSWORD:-}" ]] || fail "Provide both STAGING_TEST_EMAIL and STAGING_TEST_PASSWORD."
  COOKIE_JAR="$(mktemp)"
  RESPONSE_FILE="$(mktemp)"
  TOKEN_FILE="$(mktemp)"
  trap 'rm -f "$COOKIE_JAR" "$RESPONSE_FILE" "$TOKEN_FILE"' EXIT

  curl --silent --show-error --fail-with-body --location --max-time "$TIMEOUT_SECONDS" \
    --cookie-jar "$COOKIE_JAR" --cookie "$COOKIE_JAR" \
    --header 'Accept: application/json' --header 'Content-Type: application/json' \
    --data "$(STAGING_EMAIL="$STAGING_TEST_EMAIL" STAGING_PASSWORD="$STAGING_TEST_PASSWORD" python3 - <<'PY'
import json
import os
print(json.dumps({"email": os.environ["STAGING_EMAIL"], "password": os.environ["STAGING_PASSWORD"]}))
PY
)" \
    "$BASE_URL/api/auth/login" > "$RESPONSE_FILE"

  python3 - "$RESPONSE_FILE" "$TOKEN_FILE" <<'PY'
import json
import sys
from pathlib import Path
payload = json.loads(Path(sys.argv[1]).read_text())
token = payload.get("token")
if not isinstance(token, str) or not token:
    raise SystemExit("staging login response did not contain a token")
Path(sys.argv[2]).write_text(token)
PY

  TOKEN="$(cat "$TOKEN_FILE")"
  ME_STATUS="$(curl --silent --show-error --location --max-time "$TIMEOUT_SECONDS" \
    --output /dev/null --write-out '%{http_code}' \
    --header 'Accept: application/json' --header "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/auth/me")"
  [[ "$ME_STATUS" == '200' ]] || fail "/api/auth/me returned HTTP $ME_STATUS; expected 200."
  echo "PASS /api/auth/me (200)"
else
  echo "SKIP authenticated staging smoke: STAGING_TEST_EMAIL/PASSWORD not set."
fi

echo "Staging smoke checks completed successfully."
