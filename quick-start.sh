#!/bin/bash

# QR Code Studio - Quick Start Script
# This script helps you get started with development quickly

set -e

echo "🚀 QR Code Studio - Quick Start"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found!"
    echo "📝 Creating .env.local file..."
    echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env.local
    echo "✅ Created .env.local"
    echo "⚠️  IMPORTANT: Edit .env.local and add your actual Gemini API key!"
    echo ""
else
    echo "✅ .env.local exists"
    echo ""
fi

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
    echo ""
else
    echo "✅ Dependencies already installed"
    echo ""
fi

# Build the project to test
echo "🔨 Testing production build..."
npm run build
echo "✅ Build successful"
echo ""

# Show next steps
echo "🎉 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local and add your Gemini API key"
echo "2. Run 'npm run dev' to start development"
echo "3. Open http://localhost:5173 in your browser"
echo ""
echo "Quick commands:"
echo "  npm run dev      - Start development server"
echo "  npm run build    - Build for production"
echo "  npm run preview  - Preview production build"
echo ""
echo "📚 Read DEPLOYMENT_GUIDE.md for deployment options"
echo ""