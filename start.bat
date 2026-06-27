@echo off
chcp 65001 >nul
title Mindwire

echo ========================================
echo   Mindwire - Mind Map System
echo ========================================
echo.

cd /d "%~dp0"

if not exist "server\node_modules" (
    echo [1/2] Installing dependencies...
    cd server
    call npm install
    cd ..
)

echo [1/2] Starting server (port 4010)...
start "Mindwire Server" /B /MIN node server\server.js

timeout /t 2 /nobreak >nul

echo [2/2] Opening http://localhost:4010 ...
start http://localhost:4010

echo.
echo Server running at http://localhost:4010
echo Close this window to stop the server.
echo.
pause
taskkill /FI "WINDOWTITLE eq Mindwire Server" >nul 2>&1
