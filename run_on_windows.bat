@echo off
title CYBER-FLASH // WINDOWS_PORTABLE
setlocal enabledelayedexpansion

echo :: INITIALIZING CYBER-FLASH CORE...
echo :: CHECKING DEPENDENCIES...

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] ERROR: Python not found. Please install Python to run this tool on Windows.
    pause
    exit /b
)

:: Create virtual environment on the flash drive if it doesn't exist
if not exist ".venv" (
    echo :: BUILDING PORTABLE_ENVIRONMENT (One-time setup)...
    python -m venv .venv
)

echo :: ACTIVATING CORE...
call .venv\Scripts\activate

echo :: SYNCING MODULES...
pip install -r requirements.txt --quiet

echo :: LAUNCHING INTERFACE...
python app.py
pause
