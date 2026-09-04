@echo off
setlocal

rem Shuts down everything start-tracker-docker.bat starts.
rem
rem Why not a bare "docker compose down": it leaves one-off containers created by
rem "docker compose run" in place (only --remove-orphans collects them) and "docker compose ps"
rem hides them - so a leftover one-off container keeps holding host port 5173 while the stack looks
rem completely stopped, and the next start fails with "port is already allocated".
rem
rem Extra arguments are passed through, e.g. stop-tracker-docker.bat -v to drop the volumes too.

cd /d "%~dp0"

docker info >nul 2>nul
if errorlevel 1 (
  echo ERROR: the Docker daemon is not running - nothing to stop.
  exit /b 1
)

echo Stopping Tracker...
docker compose down --remove-orphans %*
if errorlevel 1 exit /b %ERRORLEVEL%

echo Tracker stopped.
