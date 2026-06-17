@echo off
cd /d "%~dp0"
echo USB mode - connect Android phone with USB debugging ON
where adb >nul 2>&1 || (echo Install Android Platform Tools first & pause & exit /b 1)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8081" ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
adb reverse tcp:8081 tcp:8081
start "Expo" cmd /k "npm.cmd run mobile"
timeout /t 20 /nobreak >nul
echo In Expo Go enter: exp://127.0.0.1:8081
pause
