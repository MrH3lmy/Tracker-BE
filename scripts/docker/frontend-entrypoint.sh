#!/bin/sh
# Entrypoint for the `frontend` service in docker-compose.yml (node:22-alpine, so POSIX sh only).
#
# Two jobs, in order:
#   1. install node_modules, but only when they actually need installing;
#   2. hand the container over to Vite as its main process.
#
# Why a checksum marker instead of comparing lockfiles: the previous inline command compared
# `package-lock.json` with npm's internal `node_modules/.package-lock.json`. Those two files are
# different formats by design - the hidden lockfile is npm's flattened record of what is on disk
# and omits the root ("") package entry that the project lockfile has - so `cmp` never matched and
# every single container start paid for a full `npm ci` (~3 minutes on this project). The marker
# below is ours, so we control exactly what it means: "npm ci completed successfully for these
# exact manifest bytes".
set -eu

APP_DIR="${APP_DIR:-/app}"
NODE_MODULES_DIR="$APP_DIR/node_modules"
# Lives inside the node_modules volume on purpose: dropping the volume must also drop the marker,
# otherwise an empty volume would look "already installed".
DEPS_MARKER="$NODE_MODULES_DIR/.tracker-deps-checksum"
NPM_BIN="${NPM_BIN:-npm}"
VITE_PORT="${VITE_PORT:-5173}"

log() {
  echo "[frontend] $*"
}

# sha256sum on Linux/BusyBox, shasum on macOS - the script only runs in the container, but the
# shell test around it runs on whatever the developer/CI has.
sha256_of_stdin() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum | cut -d ' ' -f 1
  else
    shasum -a 256 | cut -d ' ' -f 1
  fi
}

# Fingerprint every input `npm ci` reads. package.json is included as well as the lockfile: npm ci
# aborts when the two are out of sync, and a package.json-only edit is still a dependency change.
dependency_checksum() {
  cat "$APP_DIR/package-lock.json" "$APP_DIR/package.json" | sha256_of_stdin
}

install_reason() {
  if [ ! -d "$NODE_MODULES_DIR" ] || [ ! -x "$NODE_MODULES_DIR/.bin/vite" ]; then
    echo "node_modules is empty or incomplete"
  elif [ ! -f "$DEPS_MARKER" ]; then
    echo "no completed install is recorded for this node_modules volume"
  elif [ "$(cat "$DEPS_MARKER")" != "$1" ]; then
    echo "package.json/package-lock.json changed since the last install"
  fi
}

cd "$APP_DIR"

expected_checksum="$(dependency_checksum)"
reason="$(install_reason "$expected_checksum")"

if [ -n "$reason" ]; then
  log "Installing dependencies: $reason."
  log "Running 'npm ci' - on a cold node_modules volume this takes a few minutes."
  "$NPM_BIN" ci
  # Only written after npm ci exits 0. An install that fails or is interrupted leaves no marker,
  # so the next start retries it instead of booting Vite against a half-installed tree.
  printf '%s\n' "$expected_checksum" >"$DEPS_MARKER"
  log "Dependencies installed (checksum ${expected_checksum})."
else
  log "Dependencies already match package-lock.json - skipping 'npm ci'."
fi

log "Starting Vite on 0.0.0.0:${VITE_PORT} ..."
# exec matters: as `sh -c "... && npm run dev"`, the shell stayed PID 1 and never forwarded
# SIGTERM, so `docker compose stop/down/restart` waited out the 10s grace period and the container
# died of SIGKILL - exit code 137 with OOMKilled=false. With exec, Vite receives the signal and
# exits cleanly (143) in well under a second.
exec "$NPM_BIN" run dev -- --host 0.0.0.0 --port "$VITE_PORT" --strictPort
