#!/usr/bin/env bash
set -euo pipefail

# Shuts down everything ./start-tracker-docker.sh starts.
#
# Why this exists instead of a bare `docker compose down`: `down` leaves one-off containers created
# by `docker compose run` in place (they are only collected by `--remove-orphans`), and `docker
# compose ps` hides them - so a leftover `compose run --service-ports` container keeps holding
# host port 5173 while the stack looks completely stopped, and the next start fails with
# "Bind for 0.0.0.0:5173 failed: port is already allocated".
#
# Any extra arguments are passed through to `docker compose down`, e.g.:
#   ./stop-tracker-docker.sh -v          # also drop the database/MinIO/node_modules volumes

cd "$(dirname "${BASH_SOURCE[0]}")"

# shellcheck source=scripts/lib/tracker-compose.sh
. scripts/lib/tracker-compose.sh

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: the Docker daemon is not running - nothing to stop."
  exit 1
fi

tracker_load_env_file .env
PROJECT_NAME="$(tracker_compose_project_name)"

echo "Stopping Tracker (Compose project '${PROJECT_NAME}')..."
docker compose down --remove-orphans "$@"

# Belt and braces: --remove-orphans above already collects one-off containers, but a one-off
# started against a *different* compose file (e.g. `docker compose -f other.yml run`) still carries
# this project label and would survive.
tracker_remove_stale_oneoff_containers "$PROJECT_NAME"
for id in $(tracker_project_container_ids "$PROJECT_NAME" "label=com.docker.compose.oneoff=True"); do
  name="$(tracker_container_field "$id" '{{.Name}}')"
  tracker_remove_container "$id"
  echo "Removed leftover one-off container ${name#/}."
done

echo "Tracker stopped."
