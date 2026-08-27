@echo off
setlocal EnableExtensions
cd /d "%~dp0"

if exist "update.bat.new" (
  copy /y "update.bat.new" "update.bat" >nul
  del /q "update.bat.new" >nul 2>nul
)
if exist "run.bat.new" (
  copy /y "run.bat.new" "run.bat" >nul
  del /q "run.bat.new" >nul 2>nul
  call "%~f0"
  exit /b
)

REM Flatten a leftover GitHub zip folder from older updaters
for /d %%D in (*-main) do (
  if exist "%%~fD\public\version.json" (
    echo Applying nested folder %%D ...
    robocopy "%%~fD" "." /E /NFL /NDL /NJH /NJS /NC /NS /NP /XD node_modules .git dist screenshots artifacts /XF update.bat run.bat
    if exist "%%~fD\update.bat" copy /y "%%~fD\update.bat" "update.bat.new" >nul
    rmdir /s /q "%%~fD"
  )
)

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

echo Checking GitHub for latest...
if exist scripts\pull-latest.mjs (
  node scripts\pull-latest.mjs
) else if exist scripts\self-update.mjs (
  node scripts\self-update.mjs
)

if exist "update.bat.new" (
  copy /y "update.bat.new" "update.bat" >nul
  del /q "update.bat.new" >nul 2>nul
)
if exist "run.bat.new" (
  copy /y "run.bat.new" "run.bat" >nul
  del /q "run.bat.new" >nul 2>nul
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
