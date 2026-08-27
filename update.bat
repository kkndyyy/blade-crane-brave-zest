@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo Hellforge updater
echo Downloading latest from GitHub...

set "URL=https://github.com/kkndyyy/blade-crane-brave-zest/archive/refs/heads/main.zip"
set "TMPZIP=%TEMP%\hf-update.zip"
set "TMPDIR=%TEMP%\hf-update-src"

if exist "%TMPZIP%" del /f /q "%TMPZIP%"
if exist "%TMPDIR%" rmdir /s /q "%TMPDIR%"
mkdir "%TMPDIR%"

where curl.exe >nul 2>nul
if not errorlevel 1 (
  curl.exe -L --fail --retry 2 -A "Mozilla/5.0" -o "%TMPZIP%" "%URL%"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -OutFile '%TMPZIP%'"
)

if not exist "%TMPZIP%" (
  echo [ERROR] Download failed.
  echo Make the repo PUBLIC: github.com/kkndyyy/blade-crane-brave-zest
  pause
  exit /b 1
)

echo Extracting...
tar -xf "%TMPZIP%" -C "%TMPDIR%"
if errorlevel 1 (
  echo [ERROR] unzip failed
  pause
  exit /b 1
)

set "SRC="
for /d %%D in ("%TMPDIR%\*-main") do set "SRC=%%~fD"
if not defined SRC (
  echo [ERROR] unexpected zip layout
  dir "%TMPDIR%"
  pause
  exit /b 1
)

echo Copying files...
robocopy "%SRC%" "." /E /NFL /NDL /NJH /NJS /NC /NS /NP /XD node_modules .git dist screenshots artifacts /XF update.bat
if %ERRORLEVEL% GEQ 8 (
  echo [ERROR] copy failed
  pause
  exit /b 1
)

copy /y "%TMPZIP%" "update.zip" >nul
echo Update applied. Starting...
if exist "run.bat" call "run.bat"
pause
