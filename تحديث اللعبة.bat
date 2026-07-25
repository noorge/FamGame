@echo off
cd /d "%~dp0"
echo checking for updates...
echo.
git pull
echo.
echo done, you can close this window now.
pause
