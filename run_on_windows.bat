@echo off
setlocal enabledelayedexpansion
title CYBER-FLASH // ULTRA_PORTABLE

:: Get the directory of the batch file
set "BASE_DIR=%~dp0"
cd /d "%BASE_DIR%"

echo :: INITIALIZING PORTABLE CORE...
echo :: CURRENT LOCATION: %BASE_DIR%

:: 1. DETECT DRIVE LETTER CHANGE & REFRESH VENV
echo :: CHECKING ENVIRONMENT INTEGRITY...
if exist ".venv\pyvenv.cfg" (
    :: Get the drive letter (e.g., E:)
    set "DRIVE_LETTER=%BASE_DIR:~0,2%"
    findstr /C:"home = !DRIVE_LETTER!" ".venv\pyvenv.cfg" >nul
    if !errorlevel! neq 0 (
        echo [!] DRIVE LETTER CHANGE DETECTED. REFRESHING ENVIRONMENT...
        :: Close any potential locks (optional but safe)
        taskkill /F /IM python.exe /T >nul 2>&1
        rd /s /q ".venv"
    )
)
echo :: ENVIRONMENT CHECK COMPLETE.

:: 2. SET LOCAL PATHS TO PREVENT SYSTEM WARNINGS
set "PATH=%BASE_DIR%;%BASE_DIR%.venv\Scripts;%PATH%"

:: 3. CONFIGURE UV TO STAY ON THE FLASH DRIVE
set "UV_PYTHON_INSTALL_DIR=%BASE_DIR%.python"
set "UV_CACHE_DIR=%BASE_DIR%.uv_cache"
set "UV_PROJECT_ENVIRONMENT=%BASE_DIR%.venv"
set "UV_PYTHON_PREFERENCE=only-managed"

:: 4. CHECK FOR LOCAL UV BINARY
if not exist "uv.exe" (
    echo [!] ERROR: uv.exe not found on flash drive root.
    pause
    exit /b
)

echo :: ENSURING PORTABLE PYTHON IS READY...
.\uv.exe python install 3.12
if !errorlevel! neq 0 (
    echo [!] ERROR: Failed to setup portable Python.
    pause
    exit /b
)

echo :: SYNCING MODULES (Storing on USB)...
.\uv.exe sync
if !errorlevel! neq 0 (
    echo [!] WARNING: Sync had issues, attempting to run anyway...
    pause
)

echo :: LAUNCHING INTERFACE...
.\uv.exe run app.py

if !errorlevel! neq 0 (
    echo [!] ERROR: Application crashed.
    pause
)

echo :: SESSION FINISHED.
pause
