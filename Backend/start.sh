#!/bin/bash

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Warning: .env file not found. Please create one based on .env.example"
    exit 1
fi

# Start the Flask development server
echo "Starting Flask backend on http://127.0.0.1:5000"
python app.py
