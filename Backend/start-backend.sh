#!/bin/bash

# GlyphMart Backend Production Startup Script
# Usage: ./start-backend.sh

set -e

echo "🚀 Starting GlyphMart Backend"
echo "=========================="

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found! Please create it first."
    exit 1
fi

# Create uploads directory if it doesn't exist
mkdir -p uploads/images uploads/apks uploads/profile

# Check if gunicorn is installed
if ! pip show gunicorn > /dev/null 2>&1; then
    echo "📦 Installing gunicorn..."
    pip install gunicorn
fi

# Start the application with gunicorn
echo "🌟 Starting Flask backend with gunicorn..."
echo "🌐 Backend will be available at: http://127.0.0.1:5000"
echo "📝 Logs will be shown below. Press Ctrl+C to stop."
echo ""

exec gunicorn \
    --bind 127.0.0.1:5000 \
    --workers 2 \
    --worker-class sync \
    --worker-connections 1000 \
    --timeout 30 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    app:app
