@echo off
rem Starts the UniAssist API and website, then opens the browser.
rem Keep both windows open while using the app; close them to stop it.
cd /d "%~dp0"

if not exist "server\.env" (
  echo server\.env is missing. Copy server\.env.example to server\.env and set MONGO_URI.
  pause
  exit /b 1
)
if not exist "client\.env" copy "client\.env.example" "client\.env" >nul

if not exist "server\node_modules" (
  echo Installing server packages...
  pushd server && call npm install && popd
)
if not exist "client\node_modules" (
  echo Installing client packages...
  pushd client && call npm install && popd
)

start "UniAssist API" cmd /k "cd /d "%~dp0server" && npm run dev"
start "UniAssist Website" cmd /k "cd /d "%~dp0client" && npm run dev"

echo Starting UniAssist... the browser will open in a few seconds.
timeout /t 8 /nobreak >nul
start "" http://localhost:5173
