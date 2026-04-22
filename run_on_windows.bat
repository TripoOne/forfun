@echo off
title CYBER-FLASH // WINDOWS_PORTABLE
echo :: INITIALIZING CYBER-FLASH CORE...
echo :: CHECKING DEPENDENCIES...

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] ERROR: Python not found. Please install Python to run this tool on Windows.
    pause
    exit /b
)

echo :: SYNCING ENVIRONMENT...
pip install -r requirements.txt >nul 2>&1

echo :: LAUNCHING INTERFACE...
python app.py
pause
