@echo off
title Shiv Shakti Tiles - Billing Server
color 0A
cd /d "%~dp0"

echo.
echo  ==========================================
echo   SHIV SHAKTI TILES - BILLING SERVER
echo  ==========================================
echo.

echo  Step 1: Stopping any old server on port 4000...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":4000 "') do (
    if not "%%a"=="0" taskkill /PID %%a /F >nul 2>&1
)
timeout /t 2 /nobreak >nul

echo  Step 2: Checking Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Node.js is NOT installed!
    echo  Go to https://nodejs.org and install the LTS version.
    echo.
    pause
    exit /b 1
)

echo  Step 3: Installing packages if needed...
if not exist "node_modules" (
    echo  Running npm install...
    npm install
    echo.
)

echo  Step 4: Starting server...
echo.
echo  ==========================================
echo   Open Chrome and go to:
echo   http://localhost:4000
echo  ==========================================
echo.
echo  LOGIN CREDENTIALS:
echo    Username: admin     Password: shivshakti
echo    Username: suresh    Password: suresh123
echo    Username: vishnu    Password: vishnu123
echo.
echo  Keep this window open while using the app.
echo  Press Ctrl+C to stop the server.
echo  ==========================================
echo.

node server.js

echo.
echo  Server stopped. Press any key to close.
pause >nul
