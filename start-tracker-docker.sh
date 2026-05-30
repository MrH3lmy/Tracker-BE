#!/usr/bin/env bash
set -euo pipefail

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

echo "Starting Tracker with Docker Compose..."
echo "Backend URL: http://localhost:8080"
echo "Swagger UI: http://localhost:8080/swagger-ui/index.html"
echo

docker compose up --build
