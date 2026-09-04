#!/usr/bin/env bash
set -euo pipefail

# Full-stack local launcher: Postgres + MinIO + Redis + backend + Vite frontend, via
# docker-compose.yml. Use ./stop-tracker-docker.sh to shut it down (it removes the one-off
# containers `docker compose down` leaves behind).

cd "$(dirname "${BASH_SOURCE[0]}")"

# shellcheck source=scripts/lib/tracker-compose.sh
. scripts/lib/tracker-compose.sh

STARTUP_TIMEOUT_SECONDS="${STARTUP_TIMEOUT_SECONDS:-900}"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker is not installed or is not available on PATH."
  echo "Install Docker Desktop or Docker Engine, then run this script again."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker is installed, but the Docker daemon is not running."
  echo "Start Docker Desktop or the Docker service, then run this script again."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose is not available through 'docker compose'."
  echo "Install a Docker version that includes the Compose plugin, then run this script again."
  exit 1
fi

# Compose reads ./.env by itself; this script has to read it too, otherwise a FRONTEND_PORT set
# there would publish the UI on one port while we poll another.
tracker_load_env_file .env

DB_PORT="${DB_PORT:-5432}"
REDIS_PORT="${REDIS_PORT:-6379}"
APP_PORT="${APP_PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
export DB_PORT REDIS_PORT APP_PORT FRONTEND_PORT

PROJECT_NAME="$(tracker_compose_project_name)"
FRONTEND_URL="http://localhost:${FRONTEND_PORT}"
BACKEND_URL="http://localhost:${APP_PORT}"
BACKEND_HEALTH_URL="${BACKEND_URL}/actuator/health"
SWAGGER_URL="${BACKEND_URL}/swagger-ui/index.html"

find_free_port() {
  local candidate="$1"
  while tracker_port_has_listener "$candidate"; do
    candidate=$((candidate + 1))
  done
  printf '%s' "$candidate"
}

port_conflict_error() {
  local var="$1" port="$2" label="$3" kind="$4" detail="$5"

  echo
  echo "ERROR: host port ${port} (${label}) is already in use."
  case "$kind" in
    other-container)
      echo "  Owner: Docker container ${detail}, which is not part of the '${PROJECT_NAME}' Compose project."
      echo "  Free it with 'docker rm -f ${detail%% *}', or publish Tracker elsewhere:"
      ;;
    host-process)
      echo "  Owner: a process on this machine - ${detail}."
      echo "  Stop that process, or publish Tracker elsewhere:"
      ;;
    *)
      echo "  Something is listening on ${port}, but it could not be attributed to a container or process."
      echo "  Stop it, or publish Tracker elsewhere:"
      ;;
  esac
  echo
  echo "    ${var}=<free port> ./start-tracker-docker.sh"
  echo
  echo "  (or set ${var} in .env - see .env.example. Only the host-side port changes; containers"
  echo "  keep talking to each other on their internal ports.)"
}

# Returns 0 when the port is usable (free, already ours, or reclaimed), 1 on an unresolvable clash.
require_port() {
  local var="$1" port="$2" label="$3"
  local kind detail

  IFS=$'\t' read -r kind detail <<EOF
$(tracker_port_owner "$port" "$PROJECT_NAME")
EOF

  case "$kind" in
    free)
      return 0
      ;;
    tracker-service)
      # Our own service container; `docker compose up` recreates it in place without a clash.
      return 0
      ;;
    tracker-oneoff)
      echo "Host port ${port} was held by leftover one-off container '${detail}' (from 'docker compose run')."
      echo "  Removing it so ${label} can bind ${port} again."
      tracker_remove_container "$detail"
      return 0
      ;;
    *)
      port_conflict_error "$var" "$port" "$label" "$kind" "$detail"
      return 1
      ;;
  esac
}

# docker-compose.yml keeps the traditional MinIO host ports as defaults so a plain `docker compose
# up` stays predictable. This launcher is more forgiving: when a *foreign* process owns 9000/9001
# and the developer has not pinned the variable, publish MinIO on free high ports instead. Only
# host publishing changes - app -> MinIO traffic is always http://minio:9000 on the Compose network.
autoshift_minio_port() {
  local var="$1" default="$2" first_candidate="$3"
  local kind detail chosen

  eval "[ -n \"\${$var+set}\" ]" && return 0

  IFS=$'\t' read -r kind detail <<EOF
$(tracker_port_owner "$default" "$PROJECT_NAME")
EOF

  case "$kind" in
    free|tracker-service|tracker-oneoff) return 0 ;;
  esac

  chosen="$(find_free_port "$first_candidate")"
  eval "$var=\$chosen"
  eval "export $var"
  echo "Host port ${default} is in use by ${detail:-another listener}; using ${var}=${chosen} for this run."
}

echo "Starting Tracker with Docker Compose (project '${PROJECT_NAME}')..."

# `docker compose down` does NOT collect one-off `docker compose run` containers, and `docker
# compose ps` does not show them - so an interrupted `compose run --service-ports` session can keep
# holding 5173 while everything looks stopped. Clear the dead ones before touching ports.
tracker_remove_stale_oneoff_containers "$PROJECT_NAME"

autoshift_minio_port MINIO_PORT 9000 19000
autoshift_minio_port MINIO_CONSOLE_PORT 9001 19001
if [ "${MINIO_PORT:-9000}" = "${MINIO_CONSOLE_PORT:-9001}" ]; then
  MINIO_CONSOLE_PORT="$(find_free_port $((${MINIO_PORT:-9000} + 1)))"
  export MINIO_CONSOLE_PORT
fi

port_check_failed=false
require_port APP_PORT "$APP_PORT" "backend API" || port_check_failed=true
require_port FRONTEND_PORT "$FRONTEND_PORT" "frontend dev server" || port_check_failed=true
require_port DB_PORT "$DB_PORT" "PostgreSQL" || port_check_failed=true
require_port REDIS_PORT "$REDIS_PORT" "Redis" || port_check_failed=true
require_port MINIO_PORT "${MINIO_PORT:-9000}" "MinIO API" || port_check_failed=true
require_port MINIO_CONSOLE_PORT "${MINIO_CONSOLE_PORT:-9001}" "MinIO console" || port_check_failed=true

if [ "$port_check_failed" = true ]; then
  echo
  echo "Startup aborted before Docker was touched - no containers were created or changed."
  exit 1
fi

echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL: $BACKEND_URL"
echo "Backend health: $BACKEND_HEALTH_URL"
echo "Swagger UI: $SWAGGER_URL"
if [ -n "${MINIO_PORT:-}" ]; then
  echo "MinIO API host port: ${MINIO_PORT} (internal app endpoint remains minio:9000)"
fi
if [ -n "${MINIO_CONSOLE_PORT:-}" ]; then
  echo "MinIO console host port: ${MINIO_CONSOLE_PORT}"
fi
echo

can_poll_http() {
  command -v curl >/dev/null 2>&1 || command -v wget >/dev/null 2>&1
}

http_ok() {
  if command -v curl >/dev/null 2>&1; then
    curl --fail --silent --show-error --max-time 2 "$1" >/dev/null 2>&1
  elif command -v wget >/dev/null 2>&1; then
    wget --quiet --spider --timeout=2 "$1" >/dev/null 2>&1
  else
    return 2
  fi
}

# Use the same Actuator health endpoint as the image HEALTHCHECK. Swagger/OpenAPI generation is
# application functionality, not a liveness/readiness signal, and can be slower than the app itself.
backend_is_ready() { http_ok "$BACKEND_HEALTH_URL"; }
# "Container running" is not "frontend ready": the container is up for the whole dependency install
# while nothing is listening on 5173 yet. Only a real HTTP response from Vite counts.
frontend_is_ready() { http_ok "$FRONTEND_URL/"; }

service_container_exited() {
  [ -n "$(docker compose ps --status=exited --format '{{.Name}}' "$1" 2>/dev/null || true)" ]
}

service_health_status() {
  local container_id
  container_id="$(docker compose ps -q "$1" 2>/dev/null || true)"
  if [ -z "$container_id" ]; then
    printf '%s' "not-running"
    return
  fi
  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || printf '%s' "unknown"
}

print_service_diagnostics() {
  local service="$1"
  echo "${service} diagnostics:"
  docker compose ps -a "$service" 2>/dev/null || true
  echo
  echo "Last 60 ${service} log lines:"
  docker compose logs --no-color --tail=60 "$service" 2>&1 || true
  echo
  echo "Run 'docker compose logs ${service}' for the full log."
}

frontend_is_installing() {
  docker compose logs --no-color --tail=20 frontend 2>/dev/null | grep -q "Installing dependencies"
}

open_frontend() {
  case "$(uname -s)" in
    Darwin*)
      open "$FRONTEND_URL"
      ;;
    Linux*)
      if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$FRONTEND_URL" >/dev/null 2>&1 &
      else
        echo "Frontend is ready, but xdg-open is not available. Open $FRONTEND_URL in your browser."
      fi
      ;;
    *)
      echo "Frontend is ready. Open $FRONTEND_URL in your browser."
      ;;
  esac
}

# --remove-orphans is the safety net for the same one-off/renamed-service litter cleaned above.
if ! docker compose up --build -d --remove-orphans; then
  echo
  echo "ERROR: 'docker compose up' failed - see the Docker error above."
  exit 1
fi

echo "Waiting for the backend and frontend to become available ..."
if ! can_poll_http; then
  echo "curl/wget is not available, so readiness cannot be polled automatically."
  echo "Open $FRONTEND_URL once 'docker compose ps' reports both app and frontend as healthy."
  exit 0
fi

backend_ready=false
frontend_ready=false
deadline=$(( $(date +%s) + STARTUP_TIMEOUT_SECONDS ))
attempt=0

while [ "$(date +%s)" -lt "$deadline" ]; do
  attempt=$((attempt + 1))

  for service in app frontend; do
    if service_container_exited "$service"; then
      echo
      echo "ERROR: ${service} container exited during startup."
      print_service_diagnostics "$service"
      exit 1
    fi
  done

  if [ "$backend_ready" = false ] && backend_is_ready; then
    backend_ready=true
    echo "Backend is ready at $BACKEND_URL."
  fi

  if [ "$frontend_ready" = false ] && frontend_is_ready; then
    frontend_ready=true
    echo "Frontend is ready at $FRONTEND_URL."
  fi

  if [ "$backend_ready" = true ] && [ "$frontend_ready" = true ]; then
    echo "Opening $FRONTEND_URL ..."
    open_frontend
    echo "Tracker is running. Use 'docker compose logs -f' to follow logs or ./stop-tracker-docker.sh to stop it."
    exit 0
  fi

  if [ $((attempt % 10)) -eq 0 ]; then
    if [ "$backend_ready" = false ]; then
      health_status="$(service_health_status app)"
      echo "Still waiting for backend health at $BACKEND_HEALTH_URL (container health: $health_status)..."
      if [ "$health_status" = "unhealthy" ]; then
        echo
        echo "ERROR: Backend container is unhealthy."
        print_service_diagnostics app
        exit 1
      fi
    fi
    if [ "$frontend_ready" = false ]; then
      if frontend_is_installing; then
        echo "Still waiting for the frontend: npm ci is installing dependencies (first run on a fresh node_modules volume)..."
      else
        echo "Still waiting for the frontend at $FRONTEND_URL (container health: $(service_health_status frontend))..."
      fi
    fi
  fi

  sleep 2
done

echo "ERROR: Timed out after ${STARTUP_TIMEOUT_SECONDS}s waiting for the backend and/or frontend to become ready."
if [ "$backend_ready" = false ]; then
  echo "  - Backend never became healthy at $BACKEND_HEALTH_URL."
  print_service_diagnostics app
fi
if [ "$frontend_ready" = false ]; then
  echo "  - Frontend never responded at $FRONTEND_URL."
  print_service_diagnostics frontend
fi
echo "Raise STARTUP_TIMEOUT_SECONDS if this machine is simply slow (current: ${STARTUP_TIMEOUT_SECONDS})."
exit 1
