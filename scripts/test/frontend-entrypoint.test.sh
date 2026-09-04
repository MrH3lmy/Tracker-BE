#!/usr/bin/env bash
# Tests for scripts/docker/frontend-entrypoint.sh - the dependency-freshness logic that decides
# whether the frontend container has to run `npm ci` on start.
#
# `npm` is faked through NPM_BIN so the suite runs in milliseconds and needs neither Docker nor a
# network. Run with: scripts/test/run-shell-tests.sh
set -uo pipefail

SUITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SUITE_DIR/../.." && pwd)"
ENTRYPOINT="$REPO_ROOT/scripts/docker/frontend-entrypoint.sh"

# shellcheck source=scripts/test/assert.sh
. "$SUITE_DIR/assert.sh"

WORK_ROOT="$(mktemp -d)"
trap 'rm -rf "$WORK_ROOT"' EXIT

make_fake_npm() {
  local path="$1"
  cat >"$path" <<'FAKE'
#!/bin/sh
# Stand-in for npm: records its arguments and, for `ci`, recreates node_modules the way the real
# npm ci does (it wipes the tree first, which is why the checksum marker has to be rewritten after).
echo "$@" >>"$NPM_LOG"
case "$1" in
  ci)
    if [ "${FAKE_NPM_CI_FAILS:-0}" = "1" ]; then
      echo "npm ci exploded" >&2
      exit 1
    fi
    rm -rf node_modules
    mkdir -p node_modules/.bin
    printf '#!/bin/sh\n' >node_modules/.bin/vite
    chmod +x node_modules/.bin/vite
    ;;
esac
exit 0
FAKE
  chmod +x "$path"
}

new_app_dir() {
  local dir
  dir="$(mktemp -d "$WORK_ROOT/app.XXXXXX")"
  printf '{"name":"frontend","dependencies":{"vite":"^8.0.0"}}\n' >"$dir/package.json"
  printf '{"lockfileVersion":3,"packages":{"":{"name":"frontend"}}}\n' >"$dir/package-lock.json"
  printf '%s' "$dir"
}

# Runs the entrypoint against $1 (app dir). Combined output lands in RUN_OUTPUT and the exit code
# in RUN_STATUS - deliberately not via command substitution, which would run this in a subshell and
# throw the exit code away.
run_entrypoint() {
  local app_dir="$1"
  local npm_bin="$WORK_ROOT/fake-npm"
  make_fake_npm "$npm_bin"
  NPM_LOG="$app_dir/npm-invocations.log"
  export NPM_LOG
  : >>"$NPM_LOG"
  RUN_OUTPUT="$(APP_DIR="$app_dir" NPM_BIN="$npm_bin" sh "$ENTRYPOINT" 2>&1)"
  RUN_STATUS=$?
}

npm_ci_count() {
  grep -c '^ci$' "$1/npm-invocations.log" 2>/dev/null || echo 0
}

echo "frontend-entrypoint.test.sh"

# --- 1. cold volume: dependencies must be installed -------------------------------------------
APP="$(new_app_dir)"
run_entrypoint "$APP"
OUT="$RUN_OUTPUT"
start_test "cold node_modules volume runs npm ci"
assert_equals "1" "$(npm_ci_count "$APP")"
start_test "cold volume start execs the dev server afterwards"
assert_contains "$(cat "$APP/npm-invocations.log")" "run dev -- --host 0.0.0.0"
start_test "successful install records the checksum marker"
assert_file_exists "$APP/node_modules/.tracker-deps-checksum"
start_test "cold start explains why it is installing"
assert_contains "$OUT" "Installing dependencies"

# --- 2. plain restart: nothing changed --------------------------------------------------------
# This is the regression the whole change is about: comparing package-lock.json with npm's internal
# node_modules/.package-lock.json never matched, so every restart paid for a full npm ci.
run_entrypoint "$APP"
OUT="$RUN_OUTPUT"
start_test "unchanged dependencies do not reinstall on restart"
assert_equals "1" "$(npm_ci_count "$APP")"
start_test "restart says it is skipping the install"
assert_contains "$OUT" "skipping 'npm ci'"
start_test "restart still starts Vite"
assert_contains "$OUT" "Starting Vite"

# --- 3. package-lock.json change must reinstall -----------------------------------------------
printf '{"lockfileVersion":3,"packages":{"":{"name":"frontend"},"node_modules/left-pad":{}}}\n' >"$APP/package-lock.json"
run_entrypoint "$APP"
OUT="$RUN_OUTPUT"
start_test "a package-lock.json change triggers a fresh npm ci"
assert_equals "2" "$(npm_ci_count "$APP")"
start_test "the reinstall names the lockfile change as the reason"
assert_contains "$OUT" "package.json/package-lock.json changed"

# --- 4. package.json change must reinstall too ------------------------------------------------
printf '{"name":"frontend","dependencies":{"vite":"^8.0.0","left-pad":"^1.3.0"}}\n' >"$APP/package.json"
run_entrypoint "$APP"
start_test "a package.json change triggers a fresh npm ci"
assert_equals "3" "$(npm_ci_count "$APP")"

# --- 5. an emptied node_modules volume reinstalls ---------------------------------------------
rm -rf "$APP/node_modules"
run_entrypoint "$APP"
start_test "an emptied node_modules volume reinstalls"
assert_equals "4" "$(npm_ci_count "$APP")"

# --- 6. an incomplete tree (marker present, binaries gone) reinstalls --------------------------
rm -f "$APP/node_modules/.bin/vite"
run_entrypoint "$APP"
OUT="$RUN_OUTPUT"
start_test "an incomplete node_modules tree reinstalls"
assert_equals "5" "$(npm_ci_count "$APP")"
start_test "the incomplete tree is reported as the reason"
assert_contains "$OUT" "node_modules is empty or incomplete"

# --- 7. a failed install must not be remembered as good ---------------------------------------
APP2="$(new_app_dir)"
FAKE_NPM_CI_FAILS=1
export FAKE_NPM_CI_FAILS
run_entrypoint "$APP2"
OUT="$RUN_OUTPUT"
start_test "a failing npm ci fails the container start"
assert_nonzero_status "$RUN_STATUS"
start_test "a failing npm ci writes no checksum marker"
assert_file_missing "$APP2/node_modules/.tracker-deps-checksum"
start_test "a failing npm ci never starts the dev server"
assert_not_contains "$(cat "$APP2/npm-invocations.log")" "run dev"
unset FAKE_NPM_CI_FAILS

# The next start retries instead of booting Vite against a half-installed tree.
run_entrypoint "$APP2"
OUT="$RUN_OUTPUT"
start_test "the start after a failed install retries npm ci"
assert_equals "2" "$(npm_ci_count "$APP2")"

finish_suite "frontend-entrypoint.test.sh"
