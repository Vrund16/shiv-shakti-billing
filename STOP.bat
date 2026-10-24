@echo off
title Stop Billing Server
color 0C
echo.
echo  Stopping Billing Application Server (port 3000)...
echo.
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000 "') do (
    if not "%%a"=="0" (
        taskkill /PID %%a /F >nul 2>&1
        echo  Stopped process %%a
    )
)
echo.
echo  Server stopped successfully.
timeout /t 2 /nobreak >nul
