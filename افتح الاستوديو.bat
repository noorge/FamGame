@echo off
set "HTMLFILE=%~dp0game-studio.html"
set "CHROME1=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set "CHROME2=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
set "CHROME3=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if exist "%CHROME1%" (
    start "" "%CHROME1%" "%HTMLFILE%"
) else if exist "%CHROME2%" (
    start "" "%CHROME2%" "%HTMLFILE%"
) else if exist "%CHROME3%" (
    start "" "%CHROME3%" "%HTMLFILE%"
) else (
    start "" "%HTMLFILE%"
)
exit
