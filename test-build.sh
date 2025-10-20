#!/bin/bash

echo "🧪 Testing build process locally..."

# Test if the build command works
echo "📦 Testing: npm install && cd backend && npm install && cd ../frontend && npm install && npm run build"

# Install root dependencies
echo "1️⃣ Installing root dependencies..."
npm install

# Install backend dependencies
echo "2️⃣ Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "3️⃣ Installing frontend dependencies..."
cd frontend
npm install

# Build frontend
echo "4️⃣ Building frontend..."
npm run build

echo "✅ Build test completed!"
echo "📁 Check if frontend/build directory was created"
