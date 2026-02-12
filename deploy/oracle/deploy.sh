#!/bin/bash
# IoT Space - One-Command Deploy Script for Oracle Cloud VM
# Usage: bash deploy.sh
#
# Pulls latest code, installs deps, builds, and reloads PM2

set -e

APP_DIR="/var/www/iotspace"
BACKEND_DIR="$APP_DIR/backend"

echo "=========================================="
echo "  IoT Space - Deploying..."
echo "=========================================="

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
  echo "Error: $APP_DIR does not exist"
  echo "Clone the repo first: git clone <repo-url> $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

# Pull latest code
echo "[1/5] Pulling latest code..."
git pull origin main

# Install backend dependencies
echo "[2/5] Installing backend dependencies..."
cd "$BACKEND_DIR"
npm install --production=false

# Build backend
echo "[3/5] Building backend..."
npm run build

# Reload PM2 (zero-downtime)
echo "[4/5] Reloading PM2..."
if pm2 list | grep -q "iotspace-backend"; then
  pm2 reload ecosystem.config.js --env production
else
  pm2 start ecosystem.config.js --env production
fi

# Save PM2 process list
echo "[5/5] Saving PM2 state..."
pm2 save

echo ""
echo "=========================================="
echo "  Deploy Complete!"
echo "=========================================="
echo ""
pm2 status
echo ""
