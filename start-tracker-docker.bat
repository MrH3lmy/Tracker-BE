@echo off
setlocal

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

echo Waiting for frontend to become available at %FRONTEND_URL% ...
for /l %%I in (1,1,120) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $response = Invoke-WebRequest -UseBasicParsing -Uri '%FRONTEND_URL%' -TimeoutSec 2; if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
  if not errorlevel 1 (
    echo Frontend is ready. Opening %FRONTEND_URL% ...
    start "" "%FRONTEND_URL%"
    echo Tracker is running. Use "docker compose logs -f" to follow logs or "docker compose down" to stop it.
    exit /b 0
  )
  timeout /t 2 /nobreak >nul
)

echo ERROR: Timed out waiting for the frontend at %FRONTEND_URL%.
echo Run "docker compose logs frontend" to inspect frontend startup logs.
exit /b 1
