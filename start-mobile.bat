@echo off
cd /d "%~dp0"

echo ========================================
echo   POS Billing - Mobile (Expo Go)
echo ========================================

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8081" ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (set LAN_IP=%%a & goto :ip)
:ip
set LAN_IP=%LAN_IP: =%

echo PC IP: %LAN_IP%
echo Scan QR in Expo Go  OR  enter: exp://%LAN_IP%:8081
echo.
set REACT_NATIVE_PACKAGER_HOSTNAME=%LAN_IP%
call npm.cmd run mobile
