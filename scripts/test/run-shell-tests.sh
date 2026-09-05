#!/usr/bin/env bash
# Runs every local-dev script test suite: the bash ones for the macOS/Linux launchers, and the
# PowerShell one for the Windows launcher's helper. No Docker daemon, no network, no npm - the
# suites fake `docker`/`npm`.
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

# The Windows helper is real code the .bat launchers depend on, so its suite runs wherever
# PowerShell is available (GitHub's ubuntu runners ship pwsh; a macOS/Linux developer without it
# just sees the skip notice).
for suite in "$SUITE_DIR"/*.test.ps1; do
  [ -e "$suite" ] || continue
  echo
  if command -v pwsh >/dev/null 2>&1; then
    if ! pwsh -NoProfile -File "$suite"; then
      failed=$((failed + 1))
    fi
  else
    echo "SKIPPED $(basename "$suite"): pwsh is not installed (install PowerShell to run the Windows launcher tests)."
  fi
done

echo
if [ "$failed" -ne 0 ]; then
  echo "${failed} shell test suite(s) failed."
  exit 1
fi
echo "All shell test suites passed."
