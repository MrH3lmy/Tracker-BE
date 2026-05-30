#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-TaskPriority}"
APP_ARTIFACT_ID="${APP_ARTIFACT_ID:-taskpriority}"
APP_VERSION="${APP_VERSION:-0.0.1-SNAPSHOT}"
JAR_NAME="${JAR_NAME:-${APP_ARTIFACT_ID}-${APP_VERSION}.jar}"
PACKAGE_TYPE="${1:-${PACKAGE_TYPE:-app-image}}"
OUTPUT_DIR="${OUTPUT_DIR:-build/jpackage}"
INPUT_DIR="target/jpackage-input"

usage() {
  cat <<USAGE
Usage: $0 [package-type]

Builds the Spring Boot JAR with Maven and packages it with jpackage from JDK 21.

Package types are platform-specific:
  Windows: exe, msi, app-image
  macOS:   app-image, dmg
  Linux:   app-image, deb, rpm

Environment overrides:
  APP_NAME          Display name for the native launcher (default: TaskPriority)
  APP_ARTIFACT_ID   Maven artifact id / JAR prefix (default: taskpriority)
  APP_VERSION       Maven project version / JAR version (default: 0.0.1-SNAPSHOT)
  JAR_NAME          Built JAR file name (default: taskpriority-0.0.1-SNAPSHOT.jar)
  OUTPUT_DIR        jpackage destination directory (default: build/jpackage)
  MAVEN_ARGS        Maven arguments (default: clean package)
  JPACKAGE_OPTIONS  Additional options appended to jpackage

Example:
  $0 dmg
  PACKAGE_TYPE=deb JPACKAGE_OPTIONS="--linux-shortcut" $0
USAGE
}

if [[ "${PACKAGE_TYPE}" == "-h" || "${PACKAGE_TYPE}" == "--help" ]]; then
  usage
  exit 0
fi

if ! command -v java >/dev/null 2>&1; then
  echo "Java is required. Install JDK 21 and ensure java is on PATH." >&2
  exit 1
fi

JAVA_MAJOR="$(java -version 2>&1 | awk -F'[".]' '/version/ {print $2; exit}')"
if [[ "${JAVA_MAJOR}" != "21" ]]; then
  echo "JDK 21 is required for this packaging workflow; found Java major version '${JAVA_MAJOR}'." >&2
  exit 1
fi

if ! command -v jpackage >/dev/null 2>&1; then
  echo "jpackage was not found. Install a full JDK 21 and ensure its bin directory is on PATH." >&2
  exit 1
fi

if [[ -x ./mvnw ]]; then
  MAVEN_CMD=(./mvnw)
elif command -v mvn >/dev/null 2>&1; then
  MAVEN_CMD=(mvn)
else
  echo "Maven is required. Install Maven or add the Maven wrapper to the repository." >&2
  exit 1
fi

read -r -a MAVEN_ARGS_ARRAY <<< "${MAVEN_ARGS:-clean package}"

echo "Building ${JAR_NAME} with Maven..."
"${MAVEN_CMD[@]}" "${MAVEN_ARGS_ARRAY[@]}"

if [[ ! -f "target/${JAR_NAME}" ]]; then
  echo "Expected JAR target/${JAR_NAME} was not found." >&2
  echo "Set JAR_NAME, APP_ARTIFACT_ID, or APP_VERSION if the artifact name changed." >&2
  exit 1
fi

rm -rf "${INPUT_DIR}"
mkdir -p "${INPUT_DIR}" "${OUTPUT_DIR}"
cp "target/${JAR_NAME}" "${INPUT_DIR}/${JAR_NAME}"

JPACKAGE_CMD=(
  jpackage
  --type "${PACKAGE_TYPE}"
  --name "${APP_NAME}"
  --input "${INPUT_DIR}"
  --main-jar "${JAR_NAME}"
  --dest "${OUTPUT_DIR}"
)

if [[ -n "${JPACKAGE_OPTIONS:-}" ]]; then
  # shellcheck disable=SC2206
  EXTRA_OPTIONS=(${JPACKAGE_OPTIONS})
  JPACKAGE_CMD+=("${EXTRA_OPTIONS[@]}")
fi

echo "Packaging launcher with jpackage (${PACKAGE_TYPE})..."
echo "Launcher command will run the JAR equivalently to: java -jar ${JAR_NAME}"
"${JPACKAGE_CMD[@]}"

echo "Package output written to ${OUTPUT_DIR}"
