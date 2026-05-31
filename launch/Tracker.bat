@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%.."
set "START_SCRIPT=%REPO_ROOT%\start-tracker-docker.bat"

pushd "%REPO_ROOT%" >nul 2>nul
if errorlevel 1 (
  echo ERROR: Could not enter the Tracker folder.
  echo Expected folder: %REPO_ROOT%
  echo.
  pause
  exit /b 1
)

if not exist "%START_SCRIPT%" (
  echo ERROR: Could not find %START_SCRIPT%.
  echo Make sure start-tracker-docker.bat exists next to the Tracker project files.
  echo.
  popd >nul 2>nul
  pause
  exit /b 1
)

call "%START_SCRIPT%"
set "STATUS=%ERRORLEVEL%"

if not "%STATUS%"=="0" (
  echo.
  echo Tracker did not start successfully.
  echo If the message above mentions Docker, install Docker Desktop or start it, then try again.
  echo.
  pause
)

popd >nul 2>nul
exit /b %STATUS%
