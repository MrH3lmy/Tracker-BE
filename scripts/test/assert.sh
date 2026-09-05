#!/usr/bin/env bash
# Minimal assertion helpers for the shell tests in this directory. No external test framework is
# installed for this repo (no bats), and these suites only need equality/contains/exit-code checks.

TESTS_RUN=0
TESTS_FAILED=0
CURRENT_TEST=""

start_test() {
  CURRENT_TEST="$1"
  TESTS_RUN=$((TESTS_RUN + 1))
}

fail() {
  TESTS_FAILED=$((TESTS_FAILED + 1))
  echo "  FAIL: ${CURRENT_TEST}"
  echo "        $1"
}

pass() {
  echo "  ok: ${CURRENT_TEST}"
}

assert_equals() {
  local expected="$1" actual="$2"
  if [ "$expected" = "$actual" ]; then
    pass
  else
    fail "expected [${expected}] but got [${actual}]"
  fi
}

assert_contains() {
  local haystack="$1" needle="$2"
  case "$haystack" in
    *"$needle"*) pass ;;
    *) fail "expected output to contain [${needle}] but got [${haystack}]" ;;
  esac
}

assert_not_contains() {
  local haystack="$1" needle="$2"
  case "$haystack" in
    *"$needle"*) fail "expected output NOT to contain [${needle}] but got [${haystack}]" ;;
    *) pass ;;
  esac
}

assert_nonzero_status() {
  if [ "$1" -ne 0 ]; then pass; else fail "expected a non-zero exit code but got 0"; fi
}

assert_file_exists() {
  if [ -f "$1" ]; then pass; else fail "expected file to exist: $1"; fi
}

assert_file_missing() {
  if [ -f "$1" ]; then fail "expected file NOT to exist: $1"; else pass; fi
}

finish_suite() {
  echo
  if [ "$TESTS_FAILED" -eq 0 ]; then
    echo "${1}: ${TESTS_RUN} passed"
    exit 0
  fi
  echo "${1}: ${TESTS_FAILED} of ${TESTS_RUN} FAILED"
  exit 1
}
