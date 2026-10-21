@echo off
echo Stopping MediTrack Nginx Load Balancer...
"C:\nginx-1.30.5\nginx.exe" -s stop -p "C:\nginx-1.30.5\"
echo [OK] Nginx stopped.
pause
