@echo off
echo Stopping Mailpit...
taskkill /F /IM mailpit.exe 2>nul
echo [OK] Mailpit stopped.
pause
