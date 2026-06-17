@echo off
cd /d "%~dp0\..\.."
echo ========================================
echo   POS Billing - Windows Installer Build
echo ========================================
echo.
echo This builds the Expo web bundle into .\dist and creates an installer in .\release
echo.
call npm.cmd run desktop:installer
