@echo off
echo Starting Glyph Count Migration...
echo.

cd /d "%~dp0"

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Run the migration script
echo Running migration script...
python migrate_counts.py

echo.
echo Migration completed. Check the output above for results.
pause
