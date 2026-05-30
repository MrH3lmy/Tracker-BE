@echo off
setlocal

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
echo Backend URL: http://localhost:8080
echo Swagger UI: http://localhost:8080/swagger-ui/index.html
echo.

docker compose up --build
exit /b %ERRORLEVEL%
