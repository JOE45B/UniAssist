@echo off
rem Watches the project and deploys to Render automatically after you stop editing.
rem Close this window to turn auto-deploy off.
title UniAssist Auto-Deploy
cd /d "%~dp0"
node scriptsuto-deploy.js %*
pause
