@echo off
cd /d "%~dp0\..\.."
echo ========================================
echo   NAM bill - Shareable Windows Zip
echo ========================================
echo.
echo Creates NAM-bill-Windows.zip on your Desktop.
echo Other Windows users: download, unzip, run NAM bill.exe
echo.
call npm.cmd run desktop:share
echo.
pause
