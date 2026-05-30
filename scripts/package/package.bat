@echo off
setlocal enabledelayedexpansion

if "%~1"=="-h" goto :usage
if "%~1"=="--help" goto :usage

if not defined APP_NAME set "APP_NAME=TaskPriority"
if not defined APP_ARTIFACT_ID set "APP_ARTIFACT_ID=taskpriority"
if not defined APP_VERSION set "APP_VERSION=0.0.1-SNAPSHOT"
if not defined JAR_NAME set "JAR_NAME=%APP_ARTIFACT_ID%-%APP_VERSION%.jar"
if not defined PACKAGE_TYPE set "PACKAGE_TYPE=%~1"
if "%PACKAGE_TYPE%"=="" set "PACKAGE_TYPE=app-image"
if not defined OUTPUT_DIR set "OUTPUT_DIR=build\jpackage"
if not defined MAVEN_ARGS set "MAVEN_ARGS=clean package"
set "INPUT_DIR=target\jpackage-input"

where java >nul 2>nul
if errorlevel 1 (
  echo Java is required. Install JDK 21 and ensure java is on PATH. 1>&2
  exit /b 1
)

for /f tokens^=3^ delims^=^" %%v in ('java -version 2^>^&1 ^| findstr /i "version"') do set "JAVA_VERSION=%%v"
for /f "tokens=1 delims=." %%m in ("%JAVA_VERSION%") do set "JAVA_MAJOR=%%m"
if not "%JAVA_MAJOR%"=="21" (
  echo JDK 21 is required for this packaging workflow; found Java version '%JAVA_VERSION%'. 1>&2
  exit /b 1
)

where jpackage >nul 2>nul
if errorlevel 1 (
  echo jpackage was not found. Install a full JDK 21 and ensure its bin directory is on PATH. 1>&2
  exit /b 1
)

if exist mvnw.cmd (
  set "MAVEN_CMD=mvnw.cmd"
) else (
  where mvn >nul 2>nul
  if errorlevel 1 (
    echo Maven is required. Install Maven or add the Maven wrapper to the repository. 1>&2
    exit /b 1
  )
  set "MAVEN_CMD=mvn"
)

echo Building %JAR_NAME% with Maven...
call %MAVEN_CMD% %MAVEN_ARGS%
if errorlevel 1 exit /b %errorlevel%

if not exist "target\%JAR_NAME%" (
  echo Expected JAR target\%JAR_NAME% was not found. 1>&2
  echo Set JAR_NAME, APP_ARTIFACT_ID, or APP_VERSION if the artifact name changed. 1>&2
  exit /b 1
)

if exist "%INPUT_DIR%" rmdir /s /q "%INPUT_DIR%"
mkdir "%INPUT_DIR%" >nul 2>nul
mkdir "%OUTPUT_DIR%" >nul 2>nul
copy /y "target\%JAR_NAME%" "%INPUT_DIR%\%JAR_NAME%" >nul

echo Packaging launcher with jpackage (%PACKAGE_TYPE%)...
echo Launcher command will run the JAR equivalently to: java -jar %JAR_NAME%
jpackage --type "%PACKAGE_TYPE%" --name "%APP_NAME%" --input "%INPUT_DIR%" --main-jar "%JAR_NAME%" --dest "%OUTPUT_DIR%" %JPACKAGE_OPTIONS%
if errorlevel 1 exit /b %errorlevel%

echo Package output written to %OUTPUT_DIR%
exit /b 0

:usage
echo Usage: %~nx0 [package-type]
echo.
echo Builds the Spring Boot JAR with Maven and packages it with jpackage from JDK 21.
echo.
echo Package types are platform-specific:
echo   Windows: exe, msi, app-image
echo   macOS:   app-image, dmg
echo   Linux:   app-image, deb, rpm
echo.
echo Environment overrides: APP_NAME, APP_ARTIFACT_ID, APP_VERSION, JAR_NAME, OUTPUT_DIR, MAVEN_ARGS, JPACKAGE_OPTIONS
echo Example: %~nx0 msi
exit /b 0
