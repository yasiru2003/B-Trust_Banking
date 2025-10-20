#!/bin/bash

# B-Trust Banking Deployment Script for Fly.io with Neon DB
# This script automates the deployment process

set -e  # Exit on any error

echo "🚀 Starting B-Trust Banking deployment to Fly.io with Neon DB..."

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl is not installed. Please install it first:"
    echo "   curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if user is logged in to Fly.io
if ! flyctl auth whoami &> /dev/null; then
    echo "❌ Not logged in to Fly.io. Please login first:"
    echo "   flyctl auth login"
    exit 1
fi

echo "✅ Fly.io CLI is ready"

# Check if Neon DB credentials are provided
if [ -z "$NEON_DATABASE_URL" ]; then
    echo "❌ NEON_DATABASE_URL environment variable is not set."
    echo "Please set your Neon DB connection string:"
    echo "   export NEON_DATABASE_URL='postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require'"
    exit 1
fi

echo "✅ Neon DB connection string found"

# Set environment variables
echo "🔧 Setting environment variables..."
flyctl secrets set \
    NODE_ENV=production \
    PORT=3000 \
    DATABASE_URL="$NEON_DATABASE_URL" \
    JWT_SECRET="$(openssl rand -base64 32)" \
    SESSION_SECRET="$(openssl rand -base64 32)" \
    FRONTEND_URL="https://b-trust-banking.fly.dev"

# Deploy the application
echo "🚀 Deploying application..."
flyctl deploy --remote-only

echo "✅ Deployment completed!"
echo "🌐 Your app is available at: https://b-trust-banking.fly.dev"
echo ""
echo "📋 Next steps:"
echo "1. Run database migrations using Neon DB connection"
echo "2. Check logs: flyctl logs"
echo "3. Monitor app: flyctl status"
echo "4. Test health endpoint: curl https://b-trust-banking.fly.dev/health"
