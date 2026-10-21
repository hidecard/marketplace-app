#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="${APP_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
PARENT_DIR="$(cd "$ROOT_DIR/.." && pwd)"
PERSISTENT_STORAGE_DIR="${PERSISTENT_STORAGE_DIR:-$PARENT_DIR/.easyzaymm-storage-public}"
PUBLIC_STORAGE="$ROOT_DIR/storage/app/public"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

[[ -d "$ROOT_DIR/storage/app" ]] || fail "Missing $ROOT_DIR/storage/app."
[[ "$PERSISTENT_STORAGE_DIR" != "$ROOT_DIR"/* && "$PERSISTENT_STORAGE_DIR" != "$ROOT_DIR" ]] || fail "Persistent storage must be outside the application root."

mkdir -p "$PERSISTENT_STORAGE_DIR"

# On the first run, preserve any existing uploads before replacing the
# release-owned directory with a link to the persistent location.
if [[ -L "$PUBLIC_STORAGE" ]]; then
  TARGET="$(readlink -f "$PUBLIC_STORAGE" || true)"
  [[ -n "$TARGET" && "$TARGET" == "$PERSISTENT_STORAGE_DIR" ]] || fail "storage/app/public points to an unexpected target: ${TARGET:-empty}."
elif [[ -d "$PUBLIC_STORAGE" ]]; then
  if [[ -n "$(find "$PUBLIC_STORAGE" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]; then
    echo "Migrating existing uploads to $PERSISTENT_STORAGE_DIR..."
    cp -a "$PUBLIC_STORAGE"/. "$PERSISTENT_STORAGE_DIR"/
  fi
  rm -rf "$PUBLIC_STORAGE"
  ln -s "$PERSISTENT_STORAGE_DIR" "$PUBLIC_STORAGE"
elif [[ -e "$PUBLIC_STORAGE" ]]; then
  fail "$PUBLIC_STORAGE exists but is not a directory or symlink."
else
  ln -s "$PERSISTENT_STORAGE_DIR" "$PUBLIC_STORAGE"
fi

chmod 755 "$PERSISTENT_STORAGE_DIR" "$ROOT_DIR/storage/app" || true
printf 'Persistent public storage: %s -> %s\n' "$PUBLIC_STORAGE" "$PERSISTENT_STORAGE_DIR"
