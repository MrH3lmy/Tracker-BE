@echo off
rem BACKEND-ONLY launcher: this script starts the Spring Boot API only.
rem Use start-tracker-docker.bat for the full app stack (PostgreSQL, backend, frontend).
setlocal EnableExtensions EnableDelayedExpansion

set "JAR_PATH=target\taskpriority-0.0.1-SNAPSHOT.jar"
set "BACKEND_URL=http://localhost:8080"
set "SWAGGER_URL=http://localhost:8080/swagger-ui/index.html"

where java >nul 2>nul
if errorlevel 1 (
    echo ERROR: Java is not available on PATH. Install JDK 21 and try again.
    exit /b 1
)

for /f "tokens=3" %%V in ('java -version 2^>^&1 ^| findstr /i "version"') do (
    set "JAVA_VERSION=%%~V"
    goto :version_found
)

:version_found
if not defined JAVA_VERSION (
    echo ERROR: Unable to determine Java version.
    exit /b 1
)

for /f "tokens=1 delims=." %%M in ("%JAVA_VERSION%") do set "JAVA_MAJOR=%%M"

set /a JAVA_MAJOR_NUM=%JAVA_MAJOR% 2>nul
if errorlevel 1 (
    echo ERROR: Unable to determine Java major version from %JAVA_VERSION%.
    exit /b 1
)

if %JAVA_MAJOR_NUM% LSS 21 (
    echo ERROR: Java 21 or newer is required. Found: %JAVA_VERSION%.
    exit /b 1
)

if not exist "%JAR_PATH%" (
    echo JAR not found at %JAR_PATH%. Building with Maven...
    if exist "mvnw.cmd" (
        call mvnw.cmd -DskipTests package
    ) else if exist "mvnw" (
        call mvnw -DskipTests package
    ) else (
        where mvn >nul 2>nul
        if errorlevel 1 (
            echo ERROR: Maven is not available on PATH and Maven wrapper was not found.
            exit /b 1
        )
        call mvn -DskipTests package
    )
    if errorlevel 1 exit /b 1
)

if not defined SPRING_PROFILES_ACTIVE set "SPRING_PROFILES_ACTIVE=dev"
if not defined DB_URL set "DB_URL=jdbc:postgresql://localhost:5432/taskpriority"
if not defined DB_USERNAME set "DB_USERNAME=taskpriority"
if not defined DB_PASSWORD set "DB_PASSWORD=taskpriority"

echo Starting Tracker backend (backend-only launcher)...
echo WARNING: PostgreSQL must already be running and reachable via DB_URL.
echo WARNING: Start the frontend dev server separately from frontend/ for the UI.
echo Backend URL: %BACKEND_URL%
echo Swagger URL: %SWAGGER_URL%

java -jar "%JAR_PATH%"
