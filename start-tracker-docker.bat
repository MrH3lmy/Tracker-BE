@echo off
setlocal enabledelayedexpansion

rem Full-stack local launcher: Postgres + MinIO + Redis + backend + Vite frontend, via
rem docker-compose.yml. Use stop-tracker-docker.bat to shut it down (it removes the one-off
rem containers "docker compose down" leaves behind).

cd /d "%~dp0"

where docker >nul 2>nul
if errorlevel 1 (
  echo ERROR: Docker is not installed or is not available on PATH.
  echo Install Docker Desktop, then run this script again.
  exit /b 1
)

docker info >nul 2>nul
if errorlevel 1 (
  echo ERROR: Docker is installed, but the Docker daemon is not running.
  echo Start Docker Desktop, then run this script again.
  exit /b 1
)

docker compose version >nul 2>nul
if errorlevel 1 (
  echo ERROR: Docker Compose is not available through "docker compose".
  echo Install a Docker version that includes the Compose plugin, then run this script again.
  exit /b 1
)

echo Starting Tracker with Docker Compose...

rem Port preflight, the Windows half of scripts/lib/tracker-compose.sh. It resolves every published
rem host port from the environment and .env (environment wins, same as Compose), removes leftover
rem one-off "docker compose run" containers of this project - which survive "docker compose down"
rem and are hidden from "docker compose ps" while still holding their ports - and refuses to start
rem when anything else owns a port we need. On success it writes the resolved ports to a temp file
rem for us to pick up, so this script and Compose agree on every port.
set "TRACKER_PORT_FILE=%TEMP%\tracker-ports-%RANDOM%%RANDOM%.cmd"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\tracker-compose.ps1" -Mode Preflight -EnvOut "%TRACKER_PORT_FILE%"
if errorlevel 1 (
  if exist "%TRACKER_PORT_FILE%" del "%TRACKER_PORT_FILE%" >nul 2>nul
  echo.
  echo Startup aborted before Docker was touched - no containers were created or changed.
  exit /b 1
)
if exist "%TRACKER_PORT_FILE%" (
  call "%TRACKER_PORT_FILE%"
  del "%TRACKER_PORT_FILE%" >nul 2>nul
)

if "%APP_PORT%"=="" set "APP_PORT=8080"
if "%FRONTEND_PORT%"=="" set "FRONTEND_PORT=5173"

set "FRONTEND_URL=http://localhost:%FRONTEND_PORT%"
set "BACKEND_URL=http://localhost:%APP_PORT%"
set "BACKEND_HEALTH_URL=%BACKEND_URL%/actuator/health"
set "SWAGGER_URL=%BACKEND_URL%/swagger-ui/index.html"
if "%STARTUP_TIMEOUT_SECONDS%"=="" set "STARTUP_TIMEOUT_SECONDS=900"
set /a MAX_ATTEMPTS=%STARTUP_TIMEOUT_SECONDS%/2

echo Frontend URL: %FRONTEND_URL%
echo Backend URL: %BACKEND_URL%
echo Backend health: %BACKEND_HEALTH_URL%
echo Swagger UI: %SWAGGER_URL%
if not "%MINIO_PORT%"=="" echo MinIO API host port: %MINIO_PORT% (internal app endpoint remains minio:9000)
if not "%MINIO_CONSOLE_PORT%"=="" echo MinIO console host port: %MINIO_CONSOLE_PORT%
echo.

rem --remove-orphans is the safety net for the same one-off/renamed-service litter the preflight
rem above cleans explicitly.
docker compose up --build -d --remove-orphans
if errorlevel 1 (
  echo.
  echo ERROR: "docker compose up" failed - see the Docker error above.
  exit /b %ERRORLEVEL%
)

rem "Container running" is not "ready": the app container has to finish its Maven build and Flyway
rem migrations before it binds its port, and the frontend container is up for the whole npm ci
rem before Vite listens. Poll the backend's Actuator health endpoint and the frontend over HTTP.
echo Waiting for the backend and frontend to become available ...
set "BACKEND_READY=0"
set "FRONTEND_READY=0"
for /l %%I in (1,1,%MAX_ATTEMPTS%) do (
  if "!BACKEND_READY!"=="0" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $response = Invoke-WebRequest -UseBasicParsing -Uri '%BACKEND_HEALTH_URL%' -TimeoutSec 2; if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
    if not errorlevel 1 (
      set "BACKEND_READY=1"
      echo Backend is ready at %BACKEND_URL%.
    )
  )
  if "!FRONTEND_READY!"=="0" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $response = Invoke-WebRequest -UseBasicParsing -Uri '%FRONTEND_URL%' -TimeoutSec 2; if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
    if not errorlevel 1 (
      set "FRONTEND_READY=1"
      echo Frontend is ready at %FRONTEND_URL%.
    )
  )
  if "!BACKEND_READY!"=="1" if "!FRONTEND_READY!"=="1" (
    echo Opening %FRONTEND_URL% ...
    start "" "%FRONTEND_URL%"
    echo Tracker is running. Use "docker compose logs -f" to follow logs or stop-tracker-docker.bat to stop it.
    exit /b 0
  )
  timeout /t 2 /nobreak >nul
)

echo ERROR: Timed out after %STARTUP_TIMEOUT_SECONDS%s waiting for the backend and/or frontend to become ready.
if "!BACKEND_READY!"=="0" (
  echo   - Backend never became healthy at %BACKEND_HEALTH_URL%.
  docker compose ps -a app
  docker compose logs --no-color --tail=60 app
)
if "!FRONTEND_READY!"=="0" (
  echo   - Frontend never responded at %FRONTEND_URL%.
  docker compose ps -a frontend
  docker compose logs --no-color --tail=60 frontend
)
echo Raise STARTUP_TIMEOUT_SECONDS if this machine is simply slow (current: %STARTUP_TIMEOUT_SECONDS%).
exit /b 1
