#!/usr/bin/env bash
set -euo pipefail

FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:8080"
BACKEND_HEALTH_URL="$BACKEND_URL/actuator/health"
SWAGGER_URL="http://localhost:8080/swagger-ui/index.html"

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

port_is_in_use() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1
    return $?
  fi

  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$port" >/dev/null 2>&1
    return $?
  fi

  docker ps --format '{{.Ports}}' 2>/dev/null | grep -Eq "(^|, )(0\\.0\\.0\\.0|\\[::\\]):${port}->"
}

find_free_port() {
  local candidate="$1"
  while port_is_in_use "$candidate"; do
    candidate=$((candidate + 1))
  done
  printf '%s' "$candidate"
}

compose_service_is_running() {
  docker compose ps --status=running --services 2>/dev/null | grep -qx "$1"
}

# docker-compose.yml intentionally keeps the traditional MinIO host ports as defaults so direct
# `docker compose up` remains predictable. The convenience launcher is more forgiving: when the
# defaults are already owned by another local process, select free high ports automatically. This
# only changes host publishing; app -> MinIO traffic remains http://minio:9000 on the Compose network.
# Explicit shell overrides always win.
if ! compose_service_is_running minio; then
  if [ -z "${MINIO_PORT+x}" ] && port_is_in_use 9000; then
    MINIO_PORT="$(find_free_port 19000)"
    export MINIO_PORT
    echo "Host port 9000 is already in use; using MINIO_PORT=$MINIO_PORT for this run."
  fi

  if [ -z "${MINIO_CONSOLE_PORT+x}" ] && port_is_in_use 9001; then
    MINIO_CONSOLE_PORT="$(find_free_port 19001)"
    if [ "${MINIO_PORT:-}" = "$MINIO_CONSOLE_PORT" ]; then
      MINIO_CONSOLE_PORT="$(find_free_port $((MINIO_CONSOLE_PORT + 1)))"
    fi
    export MINIO_CONSOLE_PORT
    echo "Host port 9001 is already in use; using MINIO_CONSOLE_PORT=$MINIO_CONSOLE_PORT for this run."
  fi
fi

can_poll_frontend() {
  command -v curl >/dev/null 2>&1 || command -v wget >/dev/null 2>&1
}

frontend_is_ready() {
  if command -v curl >/dev/null 2>&1; then
    curl --fail --silent --show-error --max-time 2 "$FRONTEND_URL" >/dev/null 2>&1
  elif command -v wget >/dev/null 2>&1; then
    wget --quiet --spider --timeout=2 "$FRONTEND_URL" >/dev/null 2>&1
  else
    return 2
  fi
}

# Use the same Actuator health endpoint as the image HEALTHCHECK. Swagger/OpenAPI generation is
# application functionality, not a liveness/readiness signal, and can be slower than the app itself.
backend_is_ready() {
  if command -v curl >/dev/null 2>&1; then
    curl --fail --silent --show-error --max-time 2 "$BACKEND_HEALTH_URL" >/dev/null 2>&1
  elif command -v wget >/dev/null 2>&1; then
    wget --quiet --spider --timeout=2 "$BACKEND_HEALTH_URL" >/dev/null 2>&1
  else
    return 2
  fi
}

backend_container_exited() {
  local status
  status="$(docker compose ps --status=exited --format '{{.Name}}' app 2>/dev/null || true)"
  [ -n "$status" ]
}

backend_container_health_status() {
  local container_id
  container_id="$(docker compose ps -q app 2>/dev/null || true)"
  if [ -z "$container_id" ]; then
    printf '%s' "not-running"
    return
  fi

  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || printf '%s' "unknown"
}

print_backend_diagnostics() {
  echo "Backend diagnostics:"
  docker compose ps app 2>/dev/null || true
  echo
  echo "Last 60 backend log lines:"
  docker compose logs --no-color --tail=60 app 2>&1 || true
  echo
  echo "Run 'docker compose logs app' for the full log."
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

echo "Starting Tracker with Docker Compose..."
echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL: $BACKEND_URL"
echo "Backend health: $BACKEND_HEALTH_URL"
echo "Swagger UI: $SWAGGER_URL"
if [ -n "${MINIO_PORT:-}" ]; then
  echo "MinIO API host port: $MINIO_PORT (internal app endpoint remains minio:9000)"
fi
if [ -n "${MINIO_CONSOLE_PORT:-}" ]; then
  echo "MinIO console host port: $MINIO_CONSOLE_PORT"
fi
echo

docker compose up --build -d

echo "Waiting for the backend and frontend to become available ..."
if ! can_poll_frontend; then
  echo "curl/wget is not available, so readiness cannot be polled automatically."
  echo "Waiting 20 seconds before opening the browser..."
  sleep 20
  open_frontend
  echo "Tracker is running. Use 'docker compose logs -f' to follow logs or 'docker compose down' to stop it."
  exit 0
fi

backend_ready=false
frontend_ready=false
for attempt in {1..150}; do
  if [ "$backend_ready" = false ] && backend_container_exited; then
    echo
    echo "ERROR: Backend container exited during startup."
    print_backend_diagnostics
    exit 1
  fi

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
    echo "Tracker is running. Use 'docker compose logs -f' to follow logs or 'docker compose down' to stop it."
    exit 0
  fi

  if [ "$backend_ready" = false ] && [ $((attempt % 10)) -eq 0 ]; then
    health_status="$(backend_container_health_status)"
    echo "Still waiting for backend health at $BACKEND_HEALTH_URL (container health: $health_status)..."
    if [ "$health_status" = "unhealthy" ]; then
      echo
      echo "ERROR: Backend container is unhealthy."
      print_backend_diagnostics
      exit 1
    fi
  fi

  sleep 2
done

echo "ERROR: Timed out waiting for the backend and/or frontend to become ready."
if [ "$backend_ready" = false ]; then
  echo "  - Backend never became healthy at $BACKEND_HEALTH_URL."
  print_backend_diagnostics
fi
if [ "$frontend_ready" = false ]; then
  echo "  - Frontend never responded at $FRONTEND_URL. Run 'docker compose logs frontend' to inspect frontend startup logs."
fi
exit 1
