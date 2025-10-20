#!/bin/bash

echo "🚀 Optimized build script for Render.com"
echo "Memory optimization: --max-old-space-size=2048"

# Set memory limit for Node.js
export NODE_OPTIONS="--max-old-space-size=2048"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install

# Build frontend with memory optimization
echo "🏗️ Building frontend with memory optimization..."
npm run build

echo "✅ Build completed successfully!"
