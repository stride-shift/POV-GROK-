#!/bin/bash

# POV Analysis API Backend Setup Script

echo "🛠  Setting up POV Analysis API Backend..."

# Check Python version
python_version=$(python3 --version 2>&1 | grep -o '[0-9]\+\.[0-9]\+')
echo "🐍 Python version: $python_version"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Create temp directory
echo "📁 Creating temp directory..."
mkdir -p temp

# Check for .env file
if [ ! -f ".env" ]; then
    echo "📝 Creating .env template..."
    cat > .env << EOF
# POV Analysis API Environment Variables
API_KEY=your-api-key-here
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
OPENAI_API_KEY=your-openai-api-key

# Add other LLM API keys as needed
# ANTHROPIC_API_KEY=your-anthropic-key
# GOOGLE_API_KEY=your-google-key
EOF
    echo "⚠️  Please edit .env file with your actual API keys and database credentials"
else
    echo "✅ .env file already exists"
fi

# Check for Pandoc
if command -v pandoc &> /dev/null; then
    echo "✅ Pandoc is installed"
else
    echo "⚠️  Pandoc not found. Please install it for DOCX conversion:"
    echo "   macOS: brew install pandoc"
    echo "   Ubuntu: sudo apt-get install pandoc"
    echo "   Windows: Download from https://pandoc.org/installing.html"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your API keys and database credentials"
echo "2. Run the SQL setup commands in sql_setup/complete_sql_updates.sql"
echo "3. Start the server with: ./start.sh"
echo "" 