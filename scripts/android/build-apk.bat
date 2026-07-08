@echo off
cd /d "%~dp0\..\.."

echo ========================================
echo   GEET app - Build Android APK
echo ========================================
echo.
echo Builds an APK you can install on ANY Android phone
echo (no Expo Go needed).
echo.
echo Requires: free account at https://expo.dev
echo First time: npm.cmd exec -- eas login
echo.
echo Starting cloud build (about 10-20 min)...
echo.

call npm.cmd exec -- eas build --platform android --profile preview --non-interactive

echo.
echo When build finishes, download APK from the link above.
echo Or run: npm.cmd exec -- eas build:download --build-id BUILD_ID
echo Copy APK to phone and install (allow unknown sources if asked).
pause
