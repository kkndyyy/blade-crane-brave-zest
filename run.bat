@echo off
setlocal
cd /d "%~dp0"

if not exist package.json (
  echo [ERROR] package.json not found.
  echo Unzip hellforge-editor.zip first, then double-click run.bat
  echo Folder: %CD%
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install LTS from https://nodejs.org
  start https://nodejs.org
  pause
  exit /b 1
)

echo Checking update.zip ...
if exist scripts\self-update.mjs (
  node scripts\self-update.mjs
)

echo npm install ...
call npm install
if errorlevel 1 (
  echo [ERROR] npm install failed. Delete node_modules and retry.
  pause
  exit /b 1
)

if not exist node_modules\vite\bin\vite.js (
  echo [ERROR] vite missing. Delete node_modules and retry.
  pause
  exit /b 1
)

echo Open http://127.0.0.1:8080
start "" http://127.0.0.1:8080
node scripts\local-run.mjs
if errorlevel 1 node node_modules\vite\bin\vite.js --host 127.0.0.1 --port 8080
pause
