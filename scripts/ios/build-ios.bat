@echo off
cd /d "%~dp0\..\.."

echo ========================================
echo   POS Billing - Build iOS App (EAS)
echo ========================================
echo.
echo This builds in the cloud using EAS Build.
echo NOTE:
echo   - You need an Apple Developer account to install on real iPhones.
echo   - The "preview" profile is configured for an iOS Simulator build by default.
echo.
echo FIRST TIME ONLY:
echo   1. Create free account at https://expo.dev
echo   2. Run: npm.cmd exec -- eas login
echo.
pause

call npm.cmd exec -- eas build --platform ios --profile preview

echo.
echo When build finishes, download from the link above.
pause
