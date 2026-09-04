#!/usr/bin/env bash
# Tests for scripts/lib/tracker-compose.sh - the .env/port/container-ownership helpers the Docker
# launchers rely on.
#
# `docker` is faked through PATH and described by fixture files, so the suite needs no Docker
# daemon. Run with: scripts/test/run-shell-tests.sh
set -uo pipefail

SUITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SUITE_DIR/../.." && pwd)"

# shellcheck source=scripts/test/assert.sh
. "$SUITE_DIR/assert.sh"
# shellcheck source=scripts/lib/tracker-compose.sh
. "$REPO_ROOT/scripts/lib/tracker-compose.sh"

WORK_ROOT="$(mktemp -d)"
FAKE_BIN="$WORK_ROOT/bin"
FAKE_DOCKER_DIR="$WORK_ROOT/containers"
mkdir -p "$FAKE_BIN" "$FAKE_DOCKER_DIR"
export FAKE_DOCKER_DIR
export FAKE_DOCKER_REMOVED="$WORK_ROOT/removed.log"
: >"$FAKE_DOCKER_REMOVED"
trap 'rm -rf "$WORK_ROOT"' EXIT

# A fake `docker` that answers exactly the four calls the library makes, from one file per
# container: id, project/oneoff labels, name, image, state and published port.
cat >"$FAKE_BIN/docker" <<'FAKE'
#!/usr/bin/env bash
get() { grep "^$2=" "$FAKE_DOCKER_DIR/$1" 2>/dev/null | head -n 1 | cut -d= -f2-; }

case "$1 $2" in
  "ps -a")
    want_project=""; want_oneoff=""
    for arg in "$@"; do
      case "$arg" in
        label=com.docker.compose.project=*) want_project="${arg#label=com.docker.compose.project=}" ;;
        label=com.docker.compose.oneoff=*) want_oneoff="${arg#label=com.docker.compose.oneoff=}" ;;
      esac
    done
    for f in "$FAKE_DOCKER_DIR"/*; do
      [ -e "$f" ] || continue
      id="$(basename "$f")"
      [ -n "$want_project" ] && [ "$(get "$id" project)" != "$want_project" ] && continue
      [ -n "$want_oneoff" ] && [ "$(get "$id" oneoff)" != "$want_oneoff" ] && continue
      echo "$id"
    done
    ;;
  "ps --filter"*|"ps --filter")
    want_port=""
    for arg in "$@"; do
      case "$arg" in publish=*) want_port="${arg#publish=}" ;; esac
    done
    for f in "$FAKE_DOCKER_DIR"/*; do
      [ -e "$f" ] || continue
      id="$(basename "$f")"
      [ "$(get "$id" state)" = "running" ] || continue
      [ "$(get "$id" publish)" = "$want_port" ] || continue
      echo "$id"
    done
    ;;
  "inspect --format")
    format="$3"; id="$4"
    case "$format" in
      *State.Status*) get "$id" state ;;
      *compose.project*) printf '%s|%s|/%s|%s\n' "$(get "$id" project)" "$(get "$id" oneoff)" "$(get "$id" name)" "$(get "$id" image)" ;;
      *.Name*) printf '/%s\n' "$(get "$id" name)" ;;
    esac
    ;;
  "rm -f")
    echo "$3" >>"$FAKE_DOCKER_REMOVED"
    rm -f "$FAKE_DOCKER_DIR/$3"
    ;;
esac
exit 0
FAKE
chmod +x "$FAKE_BIN/docker"
PATH="$FAKE_BIN:$PATH"

add_container() {
  local id="$1"; shift
  printf '%s\n' "$@" >"$FAKE_DOCKER_DIR/$id"
}

reset_containers() {
  rm -f "$FAKE_DOCKER_DIR"/*
  : >"$FAKE_DOCKER_REMOVED"
}

echo "tracker-compose.test.sh"

# --- tracker_load_env_file --------------------------------------------------------------------
ENV_FILE="$WORK_ROOT/.env"
cat >"$ENV_FILE" <<'ENV'
# Host port overrides
FRONTEND_PORT=5199

  APP_PORT = 8099
DB_PORT="5499"
export REDIS_PORT=6399
MINIO_PORT=$(touch /tmp/tracker-env-injection-canary)
SOME_OTHER_KEY=ignored
no-equals-sign-line
ENV

(
  unset FRONTEND_PORT APP_PORT DB_PORT REDIS_PORT MINIO_PORT SOME_OTHER_KEY
  tracker_load_env_file "$ENV_FILE"
  printf '%s|%s|%s|%s|%s|%s\n' "${FRONTEND_PORT:-}" "${APP_PORT:-}" "${DB_PORT:-}" "${REDIS_PORT:-}" "${MINIO_PORT:-}" "${SOME_OTHER_KEY:-unset}"
) >"$WORK_ROOT/env-result"
start_test ".env values are read for every known port variable"
assert_equals '5199|8099|5499|6399|$(touch /tmp/tracker-env-injection-canary)|unset' "$(cat "$WORK_ROOT/env-result")"

start_test ".env is parsed, never executed"
assert_file_missing "/tmp/tracker-env-injection-canary"

(
  export FRONTEND_PORT=6000
  tracker_load_env_file "$ENV_FILE"
  printf '%s\n' "$FRONTEND_PORT"
) >"$WORK_ROOT/env-precedence"
start_test "a shell variable beats the .env file, like Compose"
assert_equals "6000" "$(cat "$WORK_ROOT/env-precedence")"

start_test "a missing .env file is not an error"
( tracker_load_env_file "$WORK_ROOT/definitely-absent" ) && pass || fail "expected exit 0"

# --- tracker_compose_project_name -------------------------------------------------------------
start_test "COMPOSE_PROJECT_NAME wins when set"
assert_equals "custom-name" "$(COMPOSE_PROJECT_NAME=custom-name tracker_compose_project_name)"

mkdir -p "$WORK_ROOT/Tracker-BE"
start_test "the project name is derived from the directory the way Compose derives it"
assert_equals "tracker-be" "$(cd "$WORK_ROOT/Tracker-BE" && COMPOSE_PROJECT_NAME='' tracker_compose_project_name)"

mkdir -p "$WORK_ROOT/_My Tracker!"
start_test "directory names are normalised (lowercased, stripped, leading separators trimmed)"
assert_equals "mytracker" "$(cd "$WORK_ROOT/_My Tracker!" && COMPOSE_PROJECT_NAME='' tracker_compose_project_name)"

# --- tracker_port_owner -----------------------------------------------------------------------
reset_containers
# Nothing published and nothing listening on the host.
tracker_port_has_listener() { return 1; }
start_test "an unused port is reported free"
assert_equals "free" "$(tracker_port_owner 5173 tracker-be | cut -f1)"

start_test "a host process holding the port is reported as such"
tracker_port_has_listener() { return 0; }
tracker_host_listener_description() { printf 'pid 4242 (node)'; }
assert_equals "host-process	pid 4242 (node)" "$(tracker_port_owner 5173 tracker-be)"

tracker_port_has_listener() { return 1; }

add_container svc1 "project=tracker-be" "oneoff=False" "name=taskpriority-frontend" "image=node:22-alpine" "state=running" "publish=5173"
start_test "our own service container is recognised (compose up recreates it in place)"
assert_equals "tracker-service	taskpriority-frontend" "$(tracker_port_owner 5173 tracker-be)"

reset_containers
add_container run1 "project=tracker-be" "oneoff=True" "name=tracker-be-frontend-run-abc123" "image=node:22-alpine" "state=running" "publish=5173"
start_test "a leftover 'docker compose run' container is recognised as reclaimable"
assert_equals "tracker-oneoff	tracker-be-frontend-run-abc123" "$(tracker_port_owner 5173 tracker-be)"

reset_containers
add_container other1 "project=someone-else" "oneoff=False" "name=other-app-web" "image=nginx:latest" "state=running" "publish=5173"
start_test "a container from another project is reported as a foreign owner"
assert_equals "other-container	other-app-web (image nginx:latest)" "$(tracker_port_owner 5173 tracker-be)"

start_test "an unrelated container on a different port leaves ours free"
assert_equals "free" "$(tracker_port_owner 8080 tracker-be | cut -f1)"

# --- tracker_remove_stale_oneoff_containers ---------------------------------------------------
reset_containers
add_container dead1 "project=tracker-be" "oneoff=True" "name=tracker-be-frontend-run-dead" "image=node:22-alpine" "state=exited" "publish=5173"
add_container live1 "project=tracker-be" "oneoff=True" "name=tracker-be-frontend-run-live" "image=node:22-alpine" "state=running" "publish=5174"
add_container svc2 "project=tracker-be" "oneoff=False" "name=taskpriority-app" "image=tracker/app" "state=exited" "publish=8080"
add_container foreign "project=other" "oneoff=True" "name=other-run" "image=x" "state=exited" "publish=9999"

OUT="$(tracker_remove_stale_oneoff_containers tracker-be)"
REMOVED="$(cat "$FAKE_DOCKER_REMOVED")"
start_test "an exited one-off container is cleaned up"
assert_contains "$REMOVED" "dead1"
start_test "a running one-off container is left alone (it may be a deliberate session)"
assert_not_contains "$REMOVED" "live1"
start_test "our own stopped service containers are never removed"
assert_not_contains "$REMOVED" "svc2"
start_test "another project's containers are never touched"
assert_not_contains "$REMOVED" "foreign"
start_test "the cleanup says what it removed"
assert_contains "$OUT" "tracker-be-frontend-run-dead"

finish_suite "tracker-compose.test.sh"
