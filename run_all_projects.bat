```bat
@echo off
title Student Performance Prediction System

set "PROJECT=C:\Users\Dell\OneDrive\Desktop\student"

echo Starting Student Performance Prediction System...

start "Student Backend" cmd /k "cd /d ""%PROJECT%\backend"" && python app.py"

timeout /t 5 /nobreak >nul

start "Student Frontend" cmd /k "cd /d ""%PROJECT%\frontend"" && npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort"

timeout /t 5 /nobreak >nul

start "" "http://localhost:5173/"

echo.
echo Startup complete. Keep both server windows open.
pause
```