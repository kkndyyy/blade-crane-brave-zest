@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo ========================================
echo  Hellforge updater
echo ========================================

if not exist "package.json" (
  echo [ERROR] package.json not found.
  echo Put this .bat in the same folder as run.bat
  pause
  exit /b 1
)

set "URL=https://github.com/kkndyyy/blade-crane-brave-zest/archive/refs/heads/main.zip"
set "TMPZIP=%TEMP%\hf-update.zip"
set "TMPDIR=%TEMP%\hf-update-src"

echo Downloading latest from GitHub...
if exist "%TMPZIP%" del /f /q "%TMPZIP%"
if exist "%TMPDIR%" rmdir /s /q "%TMPDIR%"
mkdir "%TMPDIR%"

where curl.exe >nul 2>nul
if not errorlevel 1 (
  curl.exe -L --fail --retry 3 -A "Mozilla/5.0" -o "%TMPZIP%" "%URL%"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -OutFile '%TMPZIP%'"
)

if not exist "%TMPZIP%" (
  echo [ERROR] Download failed.
  echo Make the repo PUBLIC: github.com/kkndyyy/blade-crane-brave-zest
  pause
  exit /b 1
)

for %%A in ("%TMPZIP%") do echo Downloaded %%~zA bytes
echo Extracting...
tar -xf "%TMPZIP%" -C "%TMPDIR%" 2>nul
if errorlevel 1 (
  echo tar failed, trying PowerShell Expand-Archive...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%TMPZIP%' -DestinationPath '%TMPDIR%' -Force"
)

set "SRC="
if exist "%TMPDIR%\public\version.json" set "SRC=%TMPDIR%"
pushd "%TMPDIR%"
for /d %%D in (*-main) do (
  if exist "%%~fD\public\version.json" set "SRC=%%~fD"
)
popd

if not defined SRC (
  echo [ERROR] unexpected zip layout
  dir /s /b "%TMPDIR%\version.json"
  pause
  exit /b 1
)

echo Copying from:
echo   %SRC%
echo to:
echo   %CD%

if exist "%SRC%\update.bat" copy /y "%SRC%\update.bat" "%CD%\update.bat.new" >nul
if exist "%SRC%\run.bat" copy /y "%SRC%\run.bat" "%CD%\run.bat.new" >nul
if exist "%SRC%\GET-LATEST.bat" copy /y "%SRC%\GET-LATEST.bat" "%CD%\GET-LATEST.bat" >nul

robocopy "%SRC%" "." /E /NFL /NDL /NJH /NJS /NC /NS /NP /XD node_modules .git dist screenshots artifacts /XF update.bat
if %ERRORLEVEL% GEQ 8 (
  echo [ERROR] copy failed %ERRORLEVEL%
  pause
  exit /b 1
)

if exist "run.bat.new" (
  copy /y "run.bat.new" "run.bat" >nul
  del /q "run.bat.new" >nul 2>nul
)

copy /y "%TMPZIP%" "update.zip" >nul

echo.
echo Applied version.json:
if exist "public\version.json" type "public\version.json"
echo.
echo Update applied. Header should show v1.6.0.
echo.

if exist "update.bat.new" (
  start "" /D "%CD%" cmd /c "timeout /t 2 /nobreak >nul & copy /y update.bat.new update.bat >nul & del /q update.bat.new >nul"
)

if exist "run.bat" call "run.bat"
pause
