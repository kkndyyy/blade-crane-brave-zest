@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo Hellforge updater
echo Downloading latest from GitHub...

set "URL=https://github.com/kkndyyy/blade-crane-brave-zest/archive/refs/heads/main.zip"
set "TMPZIP=%TEMP%\hf-update.zip"
if exist "%TMPZIP%" del /f /q "%TMPZIP%"

where curl.exe >nul 2>nul
if not errorlevel 1 (
  curl.exe -L --fail --retry 2 -A "Mozilla/5.0" -o "%TMPZIP%" "%URL%"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -OutFile '%TMPZIP%'"
)

if not exist "%TMPZIP%" (
  echo [ERROR] Download failed.
  echo The GitHub repo must be PUBLIC:
  echo   github.com/kkndyyy/blade-crane-brave-zest
  echo Settings - General - Change repository visibility - Public
  pause
  exit /b 1
)

copy /y "%TMPZIP%" "update.zip" >nul
echo Applying update...
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js required. Install LTS from https://nodejs.org
  pause
  exit /b 1
)
if not exist "scripts\self-update.mjs" (
  tar -xf "update.zip"
  echo Extracted GitHub zip. Move files out of the *-main folder if needed.
) else (
  node "scripts\self-update.mjs"
)

echo.
if exist "run.bat" call "run.bat"
pause
