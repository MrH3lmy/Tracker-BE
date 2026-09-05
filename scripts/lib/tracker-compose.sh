#!/usr/bin/env bash
# Shared helpers for the local Docker Compose launchers (start-tracker-docker.sh /
# stop-tracker-docker.sh). Sourced, never executed directly, and covered by
# scripts/test/tracker-compose.test.sh - keep every function here free of side effects that a test
# cannot fake through PATH (i.e. talk to the outside world only through `docker`, `lsof`, `ss`).
#
# Bash 3.2 compatible on purpose: that is what macOS still ships as /bin/bash.

# Host-port variables docker-compose.yml reads, plus the one variable that decides which containers
# belong to us. Only these are honoured from .env - the file is parsed, never sourced/eval'd.
TRACKER_ENV_KEYS="COMPOSE_PROJECT_NAME DB_PORT MINIO_PORT MINIO_CONSOLE_PORT REDIS_PORT APP_PORT FRONTEND_PORT"

# Compose reads ./.env itself; these scripts have to read it too, or a developer who sets
# FRONTEND_PORT=5174 there gets a stack published on 5174 while the launcher polls 5173 forever.
# Precedence matches Compose: a value already in the environment wins over the file.
tracker_load_env_file() {
  local env_file="${1:-.env}"
  local line key value

  [ -f "$env_file" ] || return 0

  while IFS= read -r line || [ -n "$line" ]; do
    line="${line#"${line%%[![:space:]]*}"}"   # ltrim
    case "$line" in
      ''|'#'*) continue ;;
    esac
    line="${line#export }"
    case "$line" in
      *=*) ;;
      *) continue ;;
    esac

    key="${line%%=*}"
    value="${line#*=}"
    key="$(printf '%s' "$key" | tr -d '[:space:]')"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    case "$value" in
      \"*\") value="${value#\"}"; value="${value%\"}" ;;
      \'*\') value="${value#\'}"; value="${value%\'}" ;;
    esac

    # Whitelist, not `source`/`eval` of the file: a stray line in .env can never run a command.
    case " $TRACKER_ENV_KEYS " in
      *" $key "*) ;;
      *) continue ;;
    esac

    # Already exported in the shell -> the shell wins, same as Compose.
    eval "[ -n \"\${$key+set}\" ]" && continue
    eval "$key=\$value"
    eval "export $key"
  done <"$env_file"
}

# Mirrors compose-go's NormalizeProjectName: lowercase, drop everything outside [a-z0-9_-], then
# trim leading separators. Needed because one-off `docker compose run` containers are named
# <project>-<service>-run-<hash> and are only findable by their project label.
tracker_compose_project_name() {
  if [ -n "${COMPOSE_PROJECT_NAME:-}" ]; then
    printf '%s' "$COMPOSE_PROJECT_NAME"
    return 0
  fi
  basename "$PWD" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9_-' | sed 's/^[_-]*//'
}

# Every container Compose considers part of this project, including one-off `run` containers, which
# `docker compose ps` hides unless you pass -a.
tracker_project_container_ids() {
  local project="$1"
  local extra_filter="${2:-}"
  if [ -n "$extra_filter" ]; then
    docker ps -a --filter "label=com.docker.compose.project=${project}" --filter "$extra_filter" --format '{{.ID}}' 2>/dev/null || true
  else
    docker ps -a --filter "label=com.docker.compose.project=${project}" --format '{{.ID}}' 2>/dev/null || true
  fi
}

tracker_container_field() {
  docker inspect --format "$2" "$1" 2>/dev/null || true
}

# Prints "<kind>\t<description>" for whoever holds a host port:
#   free            - nothing is listening
#   tracker-service - a normal container of this Compose project (compose up recreates it in place)
#   tracker-oneoff  - a leftover `docker compose run` container of this project (safe to remove)
#   other-container - some other container on this daemon
#   host-process    - a plain process on the host
#   busy-unknown    - something is listening but we cannot attribute it
tracker_port_owner() {
  local port="$1"
  local project="${2:-}"
  local ids id info label_project label_oneoff name image pid_line

  [ -n "$project" ] || project="$(tracker_compose_project_name)"

  ids="$(docker ps --filter "publish=${port}" --format '{{.ID}}' 2>/dev/null || true)"
  for id in $ids; do
    info="$(tracker_container_field "$id" '{{index .Config.Labels "com.docker.compose.project"}}|{{index .Config.Labels "com.docker.compose.oneoff"}}|{{.Name}}|{{.Config.Image}}')"
    IFS='|' read -r label_project label_oneoff name image <<EOF
$info
EOF
    name="${name#/}"
    [ -n "$name" ] || name="$id"
    if [ "$label_project" = "$project" ]; then
      if [ "$label_oneoff" = "True" ]; then
        printf 'tracker-oneoff\t%s\n' "$name"
      else
        printf 'tracker-service\t%s\n' "$name"
      fi
    else
      printf 'other-container\t%s (image %s)\n' "$name" "$image"
    fi
    return 0
  done

  if ! tracker_port_has_listener "$port"; then
    printf 'free\t\n'
    return 0
  fi

  pid_line="$(tracker_host_listener_description "$port")"
  if [ -n "$pid_line" ]; then
    printf 'host-process\t%s\n' "$pid_line"
  else
    printf 'busy-unknown\t\n'
  fi
}

tracker_port_has_listener() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1 && return 0
    return 1
  fi
  if command -v ss >/dev/null 2>&1; then
    ss -lnt 2>/dev/null | grep -Eq "[:.]${port}[[:space:]]" && return 0
    return 1
  fi
  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$port" >/dev/null 2>&1 && return 0
    return 1
  fi
  (exec 3<>"/dev/tcp/127.0.0.1/${port}") >/dev/null 2>&1 && return 0
  return 1
}

tracker_host_listener_description() {
  local port="$1" out

  if command -v lsof >/dev/null 2>&1; then
    out="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -F pc 2>/dev/null | tr '\n' ' ' || true)"
    if [ -n "$out" ]; then
      printf 'pid %s' "$(printf '%s' "$out" | sed -E 's/p([0-9]+) c([^ ]+).*/\1 (\2)/')"
      return 0
    fi
  fi
  if command -v ss >/dev/null 2>&1; then
    out="$(ss -lntp 2>/dev/null | grep -E "[:.]${port}[[:space:]]" | head -n 1 || true)"
    [ -n "$out" ] && printf '%s' "$out" && return 0
  fi
  return 0
}

# One-off `docker compose run` containers survive `docker compose down` (only `down
# --remove-orphans` collects them) and are invisible to `docker compose ps`, so a killed
# `compose run --service-ports` session keeps its published ports until someone notices. Anything
# not running is pure litter; the running ones are only removed when they sit on a port we need.
tracker_remove_stale_oneoff_containers() {
  local project="$1"
  local ids id name

  ids="$(tracker_project_container_ids "$project" "label=com.docker.compose.oneoff=True")"
  for id in $ids; do
    case "$(tracker_container_field "$id" '{{.State.Status}}')" in
      running|restarting|paused) continue ;;
    esac
    name="$(tracker_container_field "$id" '{{.Name}}')"
    docker rm -f "$id" >/dev/null 2>&1 || true
    echo "Removed stale one-off container ${name#/} (left behind by 'docker compose run')."
  done
  return 0
}

tracker_remove_container() {
  docker rm -f "$1" >/dev/null 2>&1 || true
}
