@echo off
echo ===================================================
echo Starting Mailpit Local SMTP Server & Web Inbox
echo ===================================================
echo.
echo SMTP Port:  1025 (localhost:1025)
echo Web UI:     http://localhost:8025
echo.
start "" "%~dp0mailpit.exe" --listen 0.0.0.0:8025 --smtp 0.0.0.0:1025 --db-file "%~dp0mailpit.db"
timeout /t 1 /nobreak >nul
start http://localhost:8025
echo [OK] Mailpit is running in the background.
echo You can view all outgoing OTP and order emails at http://localhost:8025
pause
