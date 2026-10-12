@echo off
rem Starts the UniAssist API, website and auto-deploy, then opens the browser.
rem Keep the windows open while using the app; close them to stop it.
rem The Auto-Deploy window uploads your saved changes to GitHub, and Render redeploys the live site.
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
start "UniAssist Auto-Deploy" cmd /k "cd /d "%~dp0" && node scripts\auto-deploy.js"

echo Starting UniAssist... the browser will open in a few seconds.
timeout /t 8 /nobreak >nul
start "" http://localhost:5173
