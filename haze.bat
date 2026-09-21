@echo off
setlocal
cd /d "%~dp0"

rem ---- pick a node runtime: bundled copy first, else node_runtime, else download ----
set "NODE_DIR=_setup\node-v22.14.0-win-x64"
if exist "%NODE_DIR%\node.exe" goto :runtime
set "NODE_DIR=node_runtime"
if exist "%NODE_DIR%\node.exe" goto :runtime
echo [haze] fetching node runtime...
powershell -NoProfile -Command "irm https://nodejs.org/dist/v22.14.0/node-v22.14.0-win-x64.zip -OutFile node.zip; Expand-Archive node.zip -DestinationPath . -Force; Rename-Item node-v22.14.0-win-x64 node_runtime; Remove-Item node.zip"
set "NODE_DIR=node_runtime"

:runtime
set "PATH=%~dp0%NODE_DIR%;%PATH%"
set "COREPACK_ENABLE_DOWNLOAD_PROMPT=0"

rem ---- install deps once (scramjet tarball requires pnpm) ----
if exist node_modules\express goto :start
echo [haze] installing dependencies...
corepack pnpm install
if errorlevel 1 (
  echo [haze] pnpm failed, trying npm...
  call npm.cmd install --no-audit --no-fund
)

:start
if not "%PORT%"=="" goto :run
set "PORT=8000"
:run
echo [haze] starting on http://localhost:%PORT%
node.exe server.js
