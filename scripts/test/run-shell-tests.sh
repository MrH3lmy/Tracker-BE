#!/usr/bin/env bash
# Runs every shell test in this directory. No Docker daemon, no network, no npm - the suites fake
# `docker`/`npm` through PATH.
#
#   scripts/test/run-shell-tests.sh
set -uo pipefail

SUITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
failed=0

for suite in "$SUITE_DIR"/*.test.sh; do
  echo
  if ! bash "$suite"; then
    failed=$((failed + 1))
  fi
done

echo
if [ "$failed" -ne 0 ]; then
  echo "${failed} shell test suite(s) failed."
  exit 1
fi
echo "All shell test suites passed."
