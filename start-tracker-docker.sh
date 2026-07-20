#!/usr/bin/env bash
set -euo pipefail

FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:8080"
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

# The frontend container just runs `npm run dev`, which is ready in a couple
# of seconds. The app container has to run a full `mvn clean package` build
# plus Flyway migrations before it binds port 8080, which routinely takes far
# longer. Polling only the frontend meant this script opened the browser,
# and users hit register/login, while the backend was still starting -
# surfacing as ERR_CONNECTION_REFUSED. Poll the API docs endpoint (only
# served once the Spring context is fully up) so we wait for both.
backend_is_ready() {
  if command -v curl >/dev/null 2>&1; then
    curl --fail --silent --show-error --max-time 2 "$BACKEND_URL/v3/api-docs" >/dev/null 2>&1
  elif command -v wget >/dev/null 2>&1; then
    wget --quiet --spider --timeout=2 "$BACKEND_URL/v3/api-docs" >/dev/null 2>&1
  else
    return 2
  fi
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
echo "Swagger UI: $SWAGGER_URL"
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
  sleep 2
done

echo "ERROR: Timed out waiting for the backend and/or frontend to become ready."
if [ "$backend_ready" = false ]; then
  echo "  - Backend never responded at $BACKEND_URL/v3/api-docs. Run 'docker compose logs app' to inspect backend startup logs."
fi
if [ "$frontend_ready" = false ]; then
  echo "  - Frontend never responded at $FRONTEND_URL. Run 'docker compose logs frontend' to inspect frontend startup logs."
fi
exit 1
