@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
title Campus Job Platform - Start All Services

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo ==========================================
echo   Campus Job Platform - Start All Services
echo ==========================================
echo.
echo This script will start:
echo   1. Main API       http://localhost:3001
echo   2. AI Backend     http://localhost:8000
echo   3. Frontend       http://localhost:4202
echo   4. Admin Panel    http://localhost:4201
echo.
echo Make sure MySQL is already running.
echo.

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm was not found in PATH.
  echo.
  pause
  exit /b 1
)

set "AI_PYTHON_CMD="
set "AI_PYTHON_DISPLAY="
set "AI_PYTHON_KIND="

if exist "%ROOT%\Ai\backend\.venv\Scripts\python.exe" (
  set "AI_PYTHON_CMD=%ROOT%\Ai\backend\.venv\Scripts\python.exe"
  set "AI_PYTHON_DISPLAY=%ROOT%\Ai\backend\.venv\Scripts\python.exe"
  set "AI_PYTHON_KIND=exe"
) else (
  where python >nul 2>&1
  if not errorlevel 1 (
    set "AI_PYTHON_CMD=python"
    set "AI_PYTHON_DISPLAY=python"
    set "AI_PYTHON_KIND=cmd"
  ) else (
    where py >nul 2>&1
    if not errorlevel 1 (
      set "AI_PYTHON_CMD=py -3"
      set "AI_PYTHON_DISPLAY=py -3"
      set "AI_PYTHON_KIND=cmd"
    ) else (
      if exist "C:\Users\12938\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" (
        set "AI_PYTHON_CMD=C:\Users\12938\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
        set "AI_PYTHON_DISPLAY=C:\Users\12938\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
        set "AI_PYTHON_KIND=exe"
      )
    )
  )
)

if not defined AI_PYTHON_CMD (
  echo [ERROR] Python 3 was not found.
  echo Install Python or make sure python / py is available.
  echo.
  pause
  exit /b 1
)

if not exist "%ROOT%\campus_job_api\.env" (
  echo [WARN] campus_job_api\.env was not found.
  echo        The main API may fail to connect to the database.
  echo.
)

if not exist "%ROOT%\Ai\backend\.env" (
  echo [ERROR] Ai\backend\.env was not found.
  echo Copy Ai\backend\.env.example to .env before starting.
  echo.
  pause
  exit /b 1
)

if /i "%AI_PYTHON_KIND%"=="exe" (
  "%AI_PYTHON_CMD%" -m uvicorn --version >nul 2>&1
) else (
  %AI_PYTHON_CMD% -m uvicorn --version >nul 2>&1
)

if errorlevel 1 (
  echo [ERROR] The AI Python environment is missing uvicorn or required packages.
  echo Run this first:
  echo   %AI_PYTHON_DISPLAY% -m pip install -r "%ROOT%\Ai\backend\requirements.txt"
  echo.
  pause
  exit /b 1
)

echo [OK] npm is available
echo [OK] AI Python: %AI_PYTHON_DISPLAY%
echo.
echo Opening service windows...
echo.

start "Campus API (3001)" cmd /k "cd /d ""%ROOT%\campus_job_api"" && npm.cmd run dev"
timeout /t 2 /nobreak >nul

if /i "%AI_PYTHON_KIND%"=="exe" (
  start "AI Backend (8000)" /D "%ROOT%\Ai\backend" "%AI_PYTHON_CMD%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000
) else (
  start "AI Backend (8000)" cmd /k "cd /d ""%ROOT%\Ai\backend"" && %AI_PYTHON_CMD% -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
)
timeout /t 2 /nobreak >nul

start "Frontend (4202)" cmd /k "cd /d ""%ROOT%\frontend"" && npm.cmd start"
timeout /t 2 /nobreak >nul

start "Admin (4201)" cmd /k "cd /d ""%ROOT%\admin"" && npm.cmd start"

echo Started:
echo   Frontend:   http://localhost:4202
echo   Admin:      http://localhost:4201
echo   Main API:   http://localhost:3001
echo   AI Docs:    http://localhost:8000/docs
echo.
echo If any window reports an error, read that window directly.
endlocal
exit /b 0
