@echo off
cd /d "%~dp0"
start "POS Web" cmd /k "npm.cmd run web"
timeout /t 20 /nobreak >nul
start http://127.0.0.1:8085
