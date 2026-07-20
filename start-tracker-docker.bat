@echo off
setlocal enabledelayedexpansion

set "FRONTEND_URL=http://localhost:5173"
set "BACKEND_URL=http://localhost:8080"
set "SWAGGER_URL=http://localhost:8080/swagger-ui/index.html"

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
echo Frontend URL: %FRONTEND_URL%
echo Backend URL: %BACKEND_URL%
echo Swagger UI: %SWAGGER_URL%
echo.

docker compose up --build -d
if errorlevel 1 exit /b %ERRORLEVEL%

rem The frontend container just runs "npm run dev", which is ready in a
rem couple of seconds. The app container has to run a full "mvn clean
rem package" build plus Flyway migrations before it binds port 8080, which
rem routinely takes far longer. Polling only the frontend meant this script
rem opened the browser, and users hit register/login, while the backend was
rem still starting - surfacing as a connection-refused error. Wait for both.
echo Waiting for the backend and frontend to become available ...
set "BACKEND_READY=0"
set "FRONTEND_READY=0"
for /l %%I in (1,1,150) do (
  if "!BACKEND_READY!"=="0" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $response = Invoke-WebRequest -UseBasicParsing -Uri '%BACKEND_URL%/v3/api-docs' -TimeoutSec 2; if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
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
    echo Tracker is running. Use "docker compose logs -f" to follow logs or "docker compose down" to stop it.
    exit /b 0
  )
  timeout /t 2 /nobreak >nul
)

echo ERROR: Timed out waiting for the backend and/or frontend to become ready.
if "!BACKEND_READY!"=="0" echo   - Backend never responded at %BACKEND_URL%/v3/api-docs. Run "docker compose logs app" to inspect backend startup logs.
if "!FRONTEND_READY!"=="0" echo   - Frontend never responded at %FRONTEND_URL%. Run "docker compose logs frontend" to inspect frontend startup logs.
exit /b 1
