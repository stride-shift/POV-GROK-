#!/bin/bash

# POV Analysis API Backend Startup Script

echo "🚀 Starting POV Analysis API Backend..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run setup first:"
    echo "   python3 -m venv venv"
    echo "   source venv/bin/activate"
    echo "   pip install -r requirements.txt"
    exit 1
fi

# Activate virtual environment
echo "📦 Activating virtual environment..."
source venv/bin/activate

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Please create it with required environment variables."
fi

# Check if temp directory exists
if [ ! -d "temp" ]; then
    echo "📁 Creating temp directory..."
    mkdir temp
fi

# Start the server
echo "🌟 Starting FastAPI server on http://127.0.0.1:8081"
python main.py 