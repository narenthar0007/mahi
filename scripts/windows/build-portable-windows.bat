@echo off
cd /d "%~dp0\..\.."
echo ========================================
echo   NAM bill - Windows Portable Build
echo ========================================
echo.
echo Builds a single .exe you can share.
echo Output folder: %%LOCALAPPDATA%%\POSBilling\release
echo Also copies the file to your Desktop.
echo.
call npm.cmd run desktop:portable
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

set "OUT=%LOCALAPPDATA%\POSBilling\release"
set "DESKTOP=%USERPROFILE%\Desktop"
if exist "%USERPROFILE%\OneDrive\Desktop" set "DESKTOP=%USERPROFILE%\OneDrive\Desktop"

for %%F in ("%OUT%\*Portable*.exe" "%OUT%\NAM*.exe" "%OUT%\POS*.exe") do (
  if exist "%%~fF" (
    if /I not "%%~nxF"=="POS Billing Setup 1.0.0.exe" (
      if /I "%%~nxF" NEQ "*Setup*" (
        copy /Y "%%~fF" "%DESKTOP%\NAM-bill-Windows.exe" >nul
        echo.
        echo Copied to Desktop: NAM-bill-Windows.exe
        echo Share that file. Other Windows users can download and run it.
        echo Full path: %DESKTOP%\NAM-bill-Windows.exe
        goto :done
      )
    )
  )
)

echo.
echo Build finished. Check: %OUT%
echo Copy the portable .exe from there to share.
:done
echo.
pause
