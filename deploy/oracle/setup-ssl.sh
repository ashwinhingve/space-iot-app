#!/bin/bash
# IoT Space - SSL Setup Script for Oracle Cloud VM
# Run as root or with sudo
# Usage: sudo bash setup-ssl.sh

set -e

DOMAIN="api.spaceautotech.com"
EMAIL="admin@spaceautotech.com"  # Change this to your email

echo "=========================================="
echo "  IoT Space - SSL Setup (Oracle Cloud)"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo bash setup-ssl.sh)"
  exit 1
fi

# Check if domain is accessible
echo "[1/5] Checking domain accessibility..."
if ! host "$DOMAIN" > /dev/null 2>&1; then
  echo "Warning: Domain $DOMAIN may not be configured in DNS yet"
  echo "Make sure your DNS A record points to this server's public IP"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Stop Nginx temporarily
echo "[2/5] Stopping Nginx..."
systemctl stop nginx

# Obtain SSL certificate
echo "[3/5] Obtaining SSL certificate from Let's Encrypt..."
certbot certonly --standalone \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --non-interactive

# Copy Nginx configuration
echo "[4/5] Configuring Nginx..."
if [ -f /var/www/iotspace/deploy/nginx/iotspace-api.conf ]; then
  cp /var/www/iotspace/deploy/nginx/iotspace-api.conf /etc/nginx/sites-available/
  ln -sf /etc/nginx/sites-available/iotspace-api.conf /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
else
  echo "Warning: Nginx config not found at /var/www/iotspace/deploy/nginx/iotspace-api.conf"
  echo "Please copy it manually"
fi

# Test Nginx configuration
nginx -t

# Start Nginx
echo "[5/5] Starting Nginx..."
systemctl start nginx
systemctl enable nginx

# Setup auto-renewal
echo "Setting up auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

# Test renewal (dry run)
echo "Testing certificate renewal (dry run)..."
certbot renew --dry-run

echo ""
echo "=========================================="
echo "  SSL Setup Complete!"
echo "=========================================="
echo ""
echo "Certificate location:"
echo "  - Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "  - Private Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo ""
echo "Auto-renewal is configured and will run twice daily"
echo ""
echo "Test your SSL at: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo ""
