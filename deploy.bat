@echo off
rem Uploads your changes to GitHub. Render then redeploys the live site automatically.
cd /d "%~dp0"

git add -A
git diff --cached --quiet
if not errorlevel 1 (
  echo No changes to deploy.
  pause
  exit /b 0
)

echo Changed files:
git diff --cached --name-status
echo.

echo Checking the website code for errors...
pushd client
call npx tsc -b
if errorlevel 1 (
  popd
  git reset -q
  echo.
  echo Type errors found above. Nothing was deployed. Fix them and run deploy.bat again.
  pause
  exit /b 1
)
popd

set "MSG="
set /p "MSG=Describe your changes (Enter for a default message): "
if not defined MSG set "MSG=Update UniAssist"

git commit -q -m "%MSG%"
git push
if errorlevel 1 (
  echo.
  echo Upload failed. Check your internet connection or GitHub sign-in and try again.
  pause
  exit /b 1
)

echo.
echo Uploaded. Render is now rebuilding the live site; it is usually live in 3-5 minutes.
echo Watch progress at https://dashboard.render.com (uniassist service, Events tab).
pause
