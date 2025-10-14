#!/usr/bin/env node

/**
 * B-Trust Banking System - Database Setup Script
 * This script helps you set up the environment and test the database connection
 */

const fs = require('fs');
const path = require('path');

console.log('🏦 B-Trust Banking System - Database Setup');
console.log('==========================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, 'backend', '.env');
const configPath = path.join(__dirname, 'backend', 'config.env');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(configPath)) {
    console.log('📋 Creating .env file from config.env...');
    fs.copyFileSync(configPath, envPath);
    console.log('✅ .env file created successfully!\n');
  } else {
    console.log('❌ No configuration file found!');
    console.log('Please create backend/.env file with your database credentials.\n');
    process.exit(1);
  }
} else {
  console.log('✅ .env file already exists!\n');
}

// Display connection information
console.log('🔗 Database Connection Details:');
console.log('Host: ep-dawn-frost-adjj0va4-pooler.c-2.us-east-1.aws.neon.tech');
console.log('Database: neondb');
console.log('User: neondb_owner');
console.log('SSL: Required\n');

console.log('🚀 Next Steps:');
console.log('1. Navigate to backend directory: cd backend');
console.log('2. Install dependencies: npm install');
console.log('3. Start the server: npm run dev');
console.log('4. In another terminal, navigate to frontend: cd frontend');
console.log('5. Install frontend dependencies: npm install');
console.log('6. Start the frontend: npm start\n');

console.log('🌐 Access URLs:');
console.log('Frontend: http://localhost:3000');
console.log('Backend API: http://localhost:5001');
console.log('Health Check: http://localhost:5001/health\n');

console.log('🔐 Demo Credentials:');
console.log('Employee: employee@bt.com / password123');
console.log('Customer: customer@bt.com / password123');
console.log('User: user@bt.com / password123\n');

console.log('✨ Setup complete! Happy banking! 🏦');
