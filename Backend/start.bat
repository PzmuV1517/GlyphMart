@echo off

REM Install Python dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

REM Check if .env file exists
if not exist .env (
    echo Warning: .env file not found. Please create one based on the provided example
    pause
    exit /b 1
)

REM Start the Flask development server
echo Starting Flask backend on http://127.0.0.1:5000
python app.py
pause
