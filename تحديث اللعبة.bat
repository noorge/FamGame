@echo off
cd /d "%~dp0"
echo جارِ التحقق من وجود تحديثات...
echo.
git pull
echo.
echo تم! يمكنك إغلاق هذه النافذة الآن.
pause
