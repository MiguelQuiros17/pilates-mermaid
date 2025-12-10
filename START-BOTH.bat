@echo off
setlocal enabledelayedexpansion
echo Starting both servers...
echo.
cd /d "%~dp0"

echo Checking and killing processes on ports 3000 and 3001...
echo.

REM Kill processes on port 3000 (Frontend)
echo Checking port 3000...
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% == 0 (
    echo Port 3000 is in use. Finding and killing process...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
        set PID=%%a
        if not "!PID!"=="" (
            echo Killing process with PID !PID! on port 3000...
            taskkill /F /PID !PID! >nul 2>&1
            if !errorlevel! == 0 (
                echo Successfully killed process on port 3000.
            )
        )
    )
    timeout /t 1 /nobreak >nul
) else (
    echo Port 3000 is free.
)

REM Kill processes on port 3001 (Backend)
echo Checking port 3001...
netstat -ano | findstr :3001 | findstr LISTENING >nul
if %errorlevel% == 0 (
    echo Port 3001 is in use. Finding and killing process...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
        set PID=%%a
        if not "!PID!"=="" (
            echo Killing process with PID !PID! on port 3001...
            taskkill /F /PID !PID! >nul 2>&1
            if !errorlevel! == 0 (
                echo Successfully killed process on port 3001.
            )
        )
    )
    timeout /t 1 /nobreak >nul
) else (
    echo Port 3001 is free.
)

echo.
echo Waiting 2 seconds for ports to be released...
timeout /t 2 /nobreak >nul
echo.

echo Starting Express Backend on port 3001...
echo IMPORTANT: Watch the "Express Backend" window for any errors!
start "Express Backend" cmd /k "node server/index.js"
echo.
echo Waiting for Express server to start (this may take a few seconds)...
echo Please check the "Express Backend" window - you should see:
echo   "🚀 PilatesMermaid API server running on port 3001"
echo.
timeout /t 5 /nobreak >nul

REM Check if Express server is running by checking if port 3001 is listening
echo Checking if Express server is ready...
set max_attempts=15
set attempt=0
:check_backend
set /a attempt+=1
netstat -ano | findstr :3001 | findstr LISTENING >nul
if %errorlevel% == 0 (
    echo ✅ Express server is ready on port 3001!
    goto server_ready
)
if %attempt% geq %max_attempts% (
    echo.
    echo ⚠️  WARNING: Express server may not have started properly after 30 seconds.
    echo Please check the "Express Backend" window for errors.
    echo Common issues:
    echo   - Database file locked or missing
    echo   - Port 3001 already in use
    echo   - Missing dependencies (run: npm install)
    echo.
    echo Continuing anyway - you can check the backend window manually...
    goto server_ready
)
echo Waiting for Express server... (attempt %attempt%/%max_attempts%)
timeout /t 2 /nobreak >nul
goto check_backend
:server_ready

echo.
echo Starting Next.js Frontend on port 3000...
start "Next.js Frontend" cmd /k "npx next dev --port 3000"
echo.
echo Both servers are starting in separate windows.
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:3001
echo.
echo IMPORTANT: Make sure both windows stay open!
echo If you see errors in the Express Backend window, the API won't work.
echo.
pause
