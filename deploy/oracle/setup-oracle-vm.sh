#!/bin/bash
# IoT Space - Oracle Cloud Free Tier VM Setup Script
# Run as root or with sudo on Ubuntu (Oracle Cloud Always Free ARM/AMD instance)
# Usage: sudo bash setup-oracle-vm.sh

set -e

echo "=========================================="
echo "  IoT Space - Oracle Cloud VM Setup"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo bash setup-oracle-vm.sh)"
  exit 1
fi

# Detect default user (oracle uses 'ubuntu' for Ubuntu images)
DEFAULT_USER="${SUDO_USER:-ubuntu}"
echo "Setting up for user: $DEFAULT_USER"

# Update system
echo "[1/10] Updating system packages..."
apt-get update && apt-get upgrade -y

# Install Node.js 20.x
echo "[2/10] Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

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

# Install Mosquitto MQTT Broker
echo "[6/10] Installing Mosquitto MQTT broker..."
apt-get install -y mosquitto mosquitto-clients

# Create application directories
echo "[7/10] Creating directories..."
mkdir -p /var/www/iotspace
mkdir -p /var/log/iotspace
mkdir -p /etc/iotspace/certs
mkdir -p /etc/iotspace/mosquitto
mkdir -p /var/www/certbot

# Set permissions
chown -R "$DEFAULT_USER:$DEFAULT_USER" /var/www/iotspace
chown -R "$DEFAULT_USER:$DEFAULT_USER" /var/log/iotspace
chmod 700 /etc/iotspace/certs

# Configure iptables firewall (Oracle Cloud Ubuntu uses iptables, not UFW)
echo "[8/10] Configuring iptables firewall..."
# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
# Allow loopback
iptables -A INPUT -i lo -j ACCEPT
# Allow SSH
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
# Allow HTTP
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
# Allow HTTPS
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
# Allow MQTT (standard)
iptables -A INPUT -p tcp --dport 1883 -j ACCEPT
# Allow MQTT over TLS
iptables -A INPUT -p tcp --dport 8883 -j ACCEPT

# Save iptables rules to persist across reboots
apt-get install -y iptables-persistent
netfilter-persistent save

echo ""
echo "  IMPORTANT: You must also open ports 80, 443, 1883, 8883"
echo "  in your Oracle Cloud Security List / Network Security Group:"
echo "  OCI Console > Networking > Virtual Cloud Networks > Subnet > Security Lists"
echo ""

# Configure PM2 startup
echo "[9/10] Configuring PM2 startup..."
pm2 startup systemd -u "$DEFAULT_USER" --hp "/home/$DEFAULT_USER"
env PATH=$PATH:/usr/bin pm2 startup systemd -u "$DEFAULT_USER" --hp "/home/$DEFAULT_USER"

# Configure log rotation
echo "[10/10] Configuring log rotation..."
cat > /etc/logrotate.d/iotspace << EOF
/var/log/iotspace/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $DEFAULT_USER $DEFAULT_USER
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Print summary
echo ""
echo "=========================================="
echo "  Oracle Cloud VM Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Open ports in OCI Security List (80, 443, 1883, 8883)"
echo "2. Point your domain DNS A record to this VM's public IP"
echo "3. Clone your repo to /var/www/iotspace/"
echo "4. Run: sudo bash setup-mosquitto.sh  (MQTT broker)"
echo "5. Run: sudo bash setup-ssl.sh        (SSL certs)"
echo "6. Create /var/www/iotspace/backend/.env.production"
echo "7. Run: cd /var/www/iotspace/backend && npm install && npm run build"
echo "8. Run: pm2 start ecosystem.config.js --env production"
echo "9. Run: pm2 save"
echo ""
echo "Installed versions:"
echo "  - Node.js: $(node -v)"
echo "  - npm: $(npm -v)"
echo "  - PM2: $(pm2 -v)"
echo "  - Nginx: $(nginx -v 2>&1)"
echo "  - Mosquitto: $(mosquitto -h 2>&1 | head -1)"
echo ""
