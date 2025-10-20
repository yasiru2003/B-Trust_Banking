@echo off
echo 🚀 Windows-compatible build script for B-Trust Banking
echo Building with memory optimization for Render deployment

REM Set memory limit for Node.js (Windows syntax)
set NODE_OPTIONS=--max-old-space-size=1536

echo 📦 Installing root dependencies...
npm install

echo 📦 Installing backend dependencies...
cd backend
npm install
cd ..

echo 📦 Installing frontend dependencies...
cd frontend
npm install

echo 🏗️ Building frontend...
npm run build

echo ✅ Build completed successfully!
echo 📁 Check if frontend/build directory was created
