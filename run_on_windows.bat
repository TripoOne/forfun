@echo off
title CYBER-FLASH // WINDOWS_PORTABLE
setlocal enabledelayedexpansion

echo :: INITIALIZING CYBER-FLASH CORE...
echo :: CHECKING SYSTEM PYTHON...

python --version
if %errorlevel% neq 0 (
    echo [!] ERROR: Python not found on this system.
    echo Please install Python 3.x and ensure 'Add Python to PATH' is checked.
    pause
    exit /b
)

:: Create virtual environment on the flash drive if it doesn't exist
if not exist ".venv\Scripts\activate.bat" (
    echo :: BUILDING PORTABLE_ENVIRONMENT (One-time setup)...
    echo :: This may take a minute...
    python -m venv .venv
    if !errorlevel! neq 0 (
        echo [!] ERROR: Failed to create Virtual Environment.
        pause
        exit /b
    )
)

echo :: ACTIVATING CORE...
call .venv\Scripts\activate
if !errorlevel! neq 0 (
    echo [!] ERROR: Activation failed.
    pause
    exit /b
)

echo :: SYNCING MODULES...
pip install -r requirements.txt

echo :: LAUNCHING INTERFACE...
python app.py

if %errorlevel% neq 0 (
    echo [!] ERROR: Application crashed.
    pause
)
pause
