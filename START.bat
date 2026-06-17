@echo off
cd /d "%~dp0"
title POS Billing Launcher

:menu
cls
echo ========================================
echo        POS Billing - Launcher
echo ========================================
echo.
echo   1. Mobile  (Expo Go - scan QR)
echo   2. Web     (Browser)
echo   3. Desktop (PC App)
echo   4. Build Android APK (install on any phone)
echo   5. Fix connection (run as Admin first!)
echo   6. Exit
echo.
set /p choice=Enter choice (1-6): 

if "%choice%"=="1" goto mobile
if "%choice%"=="2" goto web
if "%choice%"=="3" goto desktop
if "%choice%"=="4" goto apk
if "%choice%"=="5" goto fix
if "%choice%"=="6" exit
goto menu

:apk
call BUILD-APK.bat
goto menu

:mobile
call start-mobile.bat
goto menu

:web
call start-browser.bat
goto menu

:desktop
call start-desktop.bat
goto menu

:fix
call fix-mobile-connection.bat
goto menu
