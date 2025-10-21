#!/bin/bash

# Neon DB Setup Script for B-Trust Banking
# This script helps set up the database schema on Neon DB

set -e  # Exit on any error

echo "🗄️  Setting up B-Trust Banking database on Neon DB..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set."
    echo "Please set your Neon DB connection string:"
    echo "   export DATABASE_URL='postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require'"
    exit 1
fi

echo "✅ Database connection string found"

# Test database connection
echo "🔍 Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Failed to connect to database. Please check your connection string."
    exit 1
fi

# Run database migrations
echo "📊 Running database migrations..."

# Create tables
echo "Creating main tables..."
psql "$DATABASE_URL" -f backend/scripts/create-tables.sql

# Create additional tables
echo "Creating fraud detection tables..."
psql "$DATABASE_URL" -f backend/scripts/create-fraud-tables.sql

echo "Creating notifications table..."
psql "$DATABASE_URL" -f backend/scripts/create-notifications-table.sql

echo "Creating OTP tables..."
psql "$DATABASE_URL" -f backend/scripts/create-otp-verification-table.sql
psql "$DATABASE_URL" -f backend/scripts/create-otp-audit-table.sql

echo "Creating FD interest accrual table..."
psql "$DATABASE_URL" -f backend/scripts/create-fd-interest-accrual.sql

# Insert default data
echo "Inserting default data..."
psql "$DATABASE_URL" -f backend/scripts/insert-defaults.sql

# Create admin user
echo "Creating admin user..."
node backend/scripts/create-admin-user.js

echo "✅ Database setup completed successfully!"
echo ""
echo "📋 Database is ready for production use."
echo "🔗 Connection string: $DATABASE_URL"


