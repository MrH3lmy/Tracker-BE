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

rem Compose reads .env itself; this script has to read it too, or a FRONTEND_PORT set there would
rem publish the UI on one port while we poll another. Values already in the environment win, same
rem as Compose.
if exist ".env" (
  for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do (
    set "KEY=%%A"
    set "VAL=%%B"
    set "KEY=!KEY: =!"
    set "VAL=!VAL: =!"
    if "!KEY!"=="APP_PORT" if "!APP_PORT!"=="" set "APP_PORT=!VAL!"
    if "!KEY!"=="FRONTEND_PORT" if "!FRONTEND_PORT!"=="" set "FRONTEND_PORT=!VAL!"
  )
)
if "%APP_PORT%"=="" set "APP_PORT=8080"
if "%FRONTEND_PORT%"=="" set "FRONTEND_PORT=5173"

set "FRONTEND_URL=http://localhost:%FRONTEND_PORT%"
set "BACKEND_URL=http://localhost:%APP_PORT%"
set "BACKEND_HEALTH_URL=%BACKEND_URL%/actuator/health"
set "SWAGGER_URL=%BACKEND_URL%/swagger-ui/index.html"
if "%STARTUP_TIMEOUT_SECONDS%"=="" set "STARTUP_TIMEOUT_SECONDS=900"
set /a MAX_ATTEMPTS=%STARTUP_TIMEOUT_SECONDS%/2

echo Starting Tracker with Docker Compose...
echo Frontend URL: %FRONTEND_URL%
echo Backend URL: %BACKEND_URL%
echo Backend health: %BACKEND_HEALTH_URL%
echo Swagger UI: %SWAGGER_URL%
echo.

rem --remove-orphans collects the one-off containers "docker compose run" leaves behind - they are
rem invisible to "docker compose ps" and keep holding host ports such as 5173, which surfaces as
rem "Bind for 0.0.0.0:5173 failed: port is already allocated" on the next start.
docker compose up --build -d --remove-orphans
if errorlevel 1 (
  echo.
  echo ERROR: "docker compose up" failed - see the Docker error above.
  echo If it mentions "port is already allocated", find the owner with:
  echo     docker ps -a --filter publish=%FRONTEND_PORT%
  echo and either remove that container or start Tracker on another port:
  echo     set FRONTEND_PORT=5174 ^&^& start-tracker-docker.bat
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
  docker compose logs --no-color --tail=60 app
)
if "!FRONTEND_READY!"=="0" (
  echo   - Frontend never responded at %FRONTEND_URL%.
  docker compose logs --no-color --tail=60 frontend
)
exit /b 1
