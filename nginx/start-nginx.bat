@echo off
echo ===================================================
echo Starting MediTrack Nginx Load Balancer on port 80
echo ===================================================
start "" "C:\nginx-1.30.5\nginx.exe" -c "d:\MediTrack\nginx\nginx.conf" -p "C:\nginx-1.30.5\"
echo.
echo [OK] Nginx Load Balancer is now running!
echo Traffic Routing:
echo   - http://localhost/api/     --^> Upstream Cluster [127.0.0.1:8080, 127.0.0.1:8081]
echo   - http://localhost/uploads/ --^> Upstream Cluster [127.0.0.1:8080, 127.0.0.1:8081]
echo   - http://localhost/ws/      --^> WebSocket Upstream [127.0.0.1:8080, 127.0.0.1:8081]
echo   - http://localhost/         --^> Frontend Dev Server [127.0.0.1:5173]
echo.
pause
