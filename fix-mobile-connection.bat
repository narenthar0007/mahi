@echo off
echo Fixing Wi-Fi + Firewall for Expo mobile...
powershell -Command "Set-NetConnectionProfile -InterfaceAlias 'Wi-Fi' -NetworkCategory Private" 2>nul
netsh advfirewall firewall add rule name="Expo Metro 8081" dir=in action=allow protocol=TCP localport=8081
echo Done! Now run start-mobile.bat
pause
