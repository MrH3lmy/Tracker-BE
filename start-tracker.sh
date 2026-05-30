#!/usr/bin/env bash
set -euo pipefail

# BACKEND-ONLY launcher: this script starts the Spring Boot API only.
# Use start-tracker-docker.sh for the full app stack (PostgreSQL, backend, frontend).

JAR_PATH="target/taskpriority-0.0.1-SNAPSHOT.jar"
BACKEND_URL="http://localhost:8080"
SWAGGER_URL="http://localhost:8080/swagger-ui/index.html"

require_java_21() {
  if ! command -v java >/dev/null 2>&1; then
    echo "ERROR: Java is not available on PATH. Install JDK 21 and try again." >&2
    exit 1
  fi

  local version_line major_version
  version_line="$(java -version 2>&1 | head -n 1)"
  major_version="$(printf '%s\n' "$version_line" | sed -E 's/.*version "([0-9]+).*/\1/')"

  if [[ ! "$major_version" =~ ^[0-9]+$ ]] || (( major_version < 21 )); then
    echo "ERROR: Java 21 or newer is required. Found: ${version_line}" >&2
    exit 1
  fi
}

build_if_missing() {
  if [[ -f "$JAR_PATH" ]]; then
    return
  fi

  echo "JAR not found at ${JAR_PATH}. Building with Maven..."
  if [[ -x "./mvnw" ]]; then
    ./mvnw -DskipTests package
  elif command -v mvn >/dev/null 2>&1; then
    mvn -DskipTests package
  else
    echo "ERROR: Maven is not available on PATH and ./mvnw was not found." >&2
    exit 1
  fi
}

require_java_21
build_if_missing

export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-dev}"
export DB_URL="${DB_URL:-jdbc:postgresql://localhost:5432/taskpriority}"
export DB_USERNAME="${DB_USERNAME:-taskpriority}"
export DB_PASSWORD="${DB_PASSWORD:-taskpriority}"

echo "Starting Tracker backend (backend-only launcher)..."
echo "WARNING: PostgreSQL must already be running and reachable via DB_URL."
echo "WARNING: Start the frontend dev server separately from frontend/ for the UI."
echo "Backend URL: ${BACKEND_URL}"
echo "Swagger URL: ${SWAGGER_URL}"

java -jar "$JAR_PATH"
