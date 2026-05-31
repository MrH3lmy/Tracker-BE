#!/usr/bin/env bash

set -u

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
START_SCRIPT="$REPO_ROOT/start-tracker-docker.sh"

cd "$REPO_ROOT" || exit 1

if [[ ! -x "$START_SCRIPT" ]]; then
  echo "ERROR: Could not run $START_SCRIPT."
  echo "Make sure start-tracker-docker.sh exists and is executable."
  echo
  read -r -p "Press Enter to close this window..." _
  exit 1
fi

"$START_SCRIPT"
status=$?

if [[ $status -ne 0 ]]; then
  echo
  echo "Tracker did not start successfully."
  echo "If the message above mentions Docker, install Docker Desktop or start it, then try again."
  echo
  read -r -p "Press Enter to close this window..." _
fi

exit "$status"
