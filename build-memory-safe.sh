#!/bin/bash

echo "🚀 Memory-safe build script for Render.com"
echo "Using conservative memory limits for free tier"

# Set conservative memory limit
export NODE_OPTIONS="--max-old-space-size=1024"

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

# Build frontend with conservative memory limit
echo "🏗️ Building frontend with memory optimization (1024MB)..."
npm run build:low-memory

echo "✅ Build completed successfully!"
