@echo off
cd /d "%~dp0\..\.."

echo ========================================
echo   POS Billing - Build Android APK
echo ========================================
echo.
echo This creates an APK you can install on ANY Android phone
echo (no Expo Go needed).
echo.
echo FIRST TIME ONLY:
echo   1. Create free account at https://expo.dev
echo   2. Run: npm.cmd exec -- eas login
echo.
echo Then this script builds the APK in the cloud (about 10-15 min).
echo You will get a download link for the .apk file.
echo.
pause

call npm.cmd exec -- eas build --platform android --profile preview

echo.
echo When build finishes, download the APK from the link above.
echo Copy APK to phone and install (allow unknown sources if asked).
pause
