#!/bin/bash
# IoT Space - EC2 Setup Script
# Run as root or with sudo
# Usage: sudo bash setup-ec2.sh

set -e

echo "=========================================="
echo "  IoT Space - EC2 Server Setup"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo bash setup-ec2.sh)"
  exit 1
fi

# Update system
echo "[1/10] Updating system packages..."
apt-get update && apt-get upgrade -y

# Install Node.js 20.x
echo "[2/10] Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify Node.js installation
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Install PM2 globally
echo "[3/10] Installing PM2..."
npm install -g pm2

# Install Nginx
echo "[4/10] Installing Nginx..."
apt-get install -y nginx

# Install Certbot for Let's Encrypt
echo "[5/10] Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx

# Create application directories
echo "[6/10] Creating directories..."
mkdir -p /var/www/iotspace
mkdir -p /var/log/iotspace
mkdir -p /etc/iotspace/certs
mkdir -p /var/www/certbot

# Set permissions
chown -R ubuntu:ubuntu /var/www/iotspace
chown -R ubuntu:ubuntu /var/log/iotspace
chmod 700 /etc/iotspace/certs

# Configure firewall (UFW)
echo "[7/10] Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Configure PM2 startup
echo "[8/10] Configuring PM2 startup..."
pm2 startup systemd -u ubuntu --hp /home/ubuntu
env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Configure log rotation
echo "[9/10] Configuring log rotation..."
cat > /etc/logrotate.d/iotspace << 'EOF'
/var/log/iotspace/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ubuntu ubuntu
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Create systemd service for cleanup (optional)
echo "[10/10] Final configuration..."

# Print summary
echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Upload your code to /var/www/iotspace/"
echo "2. Upload AWS IoT certificates to /etc/iotspace/certs/"
echo "3. Create /var/www/iotspace/backend/.env.production"
echo "4. Run: cd /var/www/iotspace/backend && npm install && npm run build"
echo "5. Run: pm2 start ecosystem.config.js --env production"
echo "6. Run: pm2 save"
echo "7. Setup SSL with: sudo bash setup-ssl.sh"
echo ""
echo "Installed versions:"
echo "  - Node.js: $(node -v)"
echo "  - npm: $(npm -v)"
echo "  - PM2: $(pm2 -v)"
echo "  - Nginx: $(nginx -v 2>&1)"
echo ""
