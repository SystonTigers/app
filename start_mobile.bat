@echo off
echo ===================================================
echo   STARTING APP FOR MOBILE VIEWING
echo ===================================================
echo.
echo 1. Starting Backend (Port 8787)...
start "Backend Server" /D "c:\dev\app-FRESH\backend" npm run dev -- --host 0.0.0.0

echo 2. Starting Frontend (Port 3000)...
start "Frontend Server" /D "c:\dev\app-FRESH\web-app" npm run dev -- -H 0.0.0.0

echo.
echo ===================================================
echo   SUCCESS! The app is starting in new windows.
echo.
echo   OPEN THIS URL ON YOUR PHONE:
echo   http://192.168.0.229:3000
echo.
echo   (Make sure your phone is on the same Wi-Fi)
echo ===================================================
pause
