# IoT Space Application - Production Deployment Guide

This guide covers deploying the IoT Space application to production using:
- **Frontend**: Vercel (iot.spaceautotech.com)
- **Backend**: AWS EC2 + PM2 (api.spaceautotech.com)
- **Database**: MongoDB Atlas
- **MQTT**: AWS IoT Core
- **SSL**: Let's Encrypt

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [MongoDB Atlas Setup](#mongodb-atlas-setup)
3. [AWS IoT Core Setup](#aws-iot-core-setup)
4. [EC2 Server Setup](#ec2-server-setup)
5. [Backend Deployment](#backend-deployment)
6. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
7. [Verification](#verification)
8. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

- AWS Account with EC2 and IoT Core access
- MongoDB Atlas account
- Vercel account
- Domain name (spaceautotech.com) with DNS control
- Google Cloud Console access for OAuth

### DNS Configuration

Configure these DNS records before starting:

| Record Type | Host | Value |
|-------------|------|-------|
| A | api.spaceautotech.com | EC2 Public IP |
| CNAME | iot.spaceautotech.com | cname.vercel-dns.com |

---

## MongoDB Atlas Setup

### 1. Create Cluster

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Click "Build a Database"
3. Select tier:
   - **M0 (Free)**: Development/testing (512MB)
   - **M10+ (Paid)**: Production (recommended)
4. Cloud provider: **AWS**
5. Region: Same as your EC2 (e.g., us-east-1)
6. Cluster name: `iotspace-production`

### 2. Create Database User

1. Go to **Database Access** → **Add New Database User**
2. Authentication: Password
3. Username: `iotspace_admin`
4. Password: Generate a secure password
5. Privileges: "Read and write to any database"

### 3. Configure Network Access

1. Go to **Network Access** → **Add IP Address**
2. Add your EC2 instance's public IP
3. For testing, you can use `0.0.0.0/0` (less secure)

### 4. Get Connection String

1. Go to **Database** → **Connect** → **Connect your application**
2. Driver: Node.js, Version 5.5+
3. Copy and customize:

```
mongodb+srv://iotspace_admin:<password>@iotspace-production.xxxxx.mongodb.net/iotspace?retryWrites=true&w=majority
```

### 5. Create Indexes (Optional, improves performance)

Run these in MongoDB Compass or Atlas Shell:

```javascript
db.devices.createIndex({ "owner": 1 });
db.devices.createIndex({ "mqttTopic": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.wificonfigs.createIndex({ "deviceId": 1 });
```

---

## AWS IoT Core Setup

### 1. Create IoT Thing

1. Go to **AWS Console** → **IoT Core**
2. Navigate to **Manage** → **Things**
3. Click **Create things** → **Create single thing**
4. Thing name: `iotspace-backend`
5. No shadow, click **Next**

### 2. Create Certificates

1. Select "Auto-generate a new certificate"
2. Click **Create thing**
3. **Download all files**:
   - `xxx.pem.crt` (Device certificate)
   - `xxx.private.pem.key` (Private key)
   - `AmazonRootCA1.pem` (CA certificate)
4. Click **Activate** then **Done**

### 3. Create & Attach Policy

1. Go to **Security** → **Policies**
2. Create policy `iotspace-backend-policy`:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["iot:Connect", "iot:Publish", "iot:Subscribe", "iot:Receive"],
    "Resource": "*"
  }]
}
```

3. Go to your certificate → **Attach policies** → Select `iotspace-backend-policy`

### 4. Get Endpoint

1. Go to **Settings** (bottom left sidebar)
2. Copy "Device data endpoint" (e.g., `abc123.iot.us-east-1.amazonaws.com`)

---

## EC2 Server Setup

### 1. Launch EC2 Instance

- **AMI**: Ubuntu 22.04 LTS
- **Instance type**: t3.small or larger
- **Storage**: 20GB+ SSD
- **Security Group**:
  - SSH (22): Your IP
  - HTTP (80): 0.0.0.0/0
  - HTTPS (443): 0.0.0.0/0

### 2. Connect and Run Setup Script

```bash
# SSH into your instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Download and run setup script
curl -O https://raw.githubusercontent.com/ashwinhingve/space-iot-app/main/deploy/scripts/setup-ec2.sh
sudo bash setup-ec2.sh
```

Or manually run the steps in `deploy/scripts/setup-ec2.sh`.

### 3. Upload AWS IoT Certificates

```bash
# Create certs directory
sudo mkdir -p /etc/iotspace/certs
sudo chown ubuntu:ubuntu /etc/iotspace/certs
chmod 700 /etc/iotspace/certs

# Upload certificates (from your local machine)
scp -i your-key.pem device.pem.crt ubuntu@your-ec2-ip:/etc/iotspace/certs/
scp -i your-key.pem private.pem.key ubuntu@your-ec2-ip:/etc/iotspace/certs/
scp -i your-key.pem AmazonRootCA1.pem ubuntu@your-ec2-ip:/etc/iotspace/certs/

# Set permissions
chmod 600 /etc/iotspace/certs/*
```

---

## Backend Deployment

### 1. Clone Repository

```bash
cd /var/www/iotspace
git clone https://github.com/ashwinhingve/space-iot-app.git .
```

### 2. Generate Secrets

```bash
# Generate JWT_SECRET (128 hex chars)
openssl rand -hex 64

# Generate WIFI_ENCRYPTION_KEY (64 hex chars for AES-256)
openssl rand -hex 32
```

### 3. Create Environment File

```bash
cd /var/www/iotspace/backend
cp .env.production.example .env.production
nano .env.production  # Edit with your values
```

Fill in all values from your MongoDB Atlas, AWS IoT Core setup, and generated secrets.

### 4. Build and Start

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
```

### 5. Setup SSL

```bash
sudo bash /var/www/iotspace/deploy/scripts/setup-ssl.sh
```

### 6. Verify

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs iotspace-backend

# Test health endpoint
curl https://api.spaceautotech.com/api/health
```

---

## Frontend Deployment (Vercel)

### 1. Connect Repository

1. Go to [Vercel](https://vercel.com)
2. Import your GitHub repository
3. Select the `frontend` directory as the root

### 2. Configure Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://api.spaceautotech.com` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Your Google Client ID |

### 3. Configure Domain

1. Go to Project Settings → Domains
2. Add `iot.spaceautotech.com`
3. Configure DNS as instructed by Vercel

### 4. Deploy

Push to main branch or trigger manual deployment.

---

## Verification

Run through these checks after deployment:

### Backend Checks

```bash
# Health endpoint
curl https://api.spaceautotech.com/api/health

# Should return:
# {"status":"ok","services":{"database":"connected","mqtt":"connected"}}

# Debug endpoints should return 404 in production
curl https://api.spaceautotech.com/api/debug/devices
# Should return: {"error":"Not found"}
```

### Frontend Checks

1. Visit https://iot.spaceautotech.com
2. Verify Google OAuth login works
3. Test device creation and control

### End-to-End Test

1. Power on an ESP32 device
2. Verify it connects to AWS IoT Core
3. Check device appears online in dashboard
4. Send a control command
5. Verify device receives command

---

## Monitoring & Maintenance

### PM2 Commands

```bash
pm2 status              # View all processes
pm2 logs                # View logs
pm2 monit               # Real-time monitoring
pm2 reload all          # Zero-downtime reload
pm2 restart all         # Full restart
```

### Log Locations

- **Application logs**: `/var/log/iotspace/`
- **Nginx logs**: `/var/log/nginx/iotspace-api-*.log`
- **PM2 logs**: `pm2 logs`

### SSL Certificate Renewal

Let's Encrypt certificates auto-renew via certbot timer. To manually renew:

```bash
sudo certbot renew
```

### Updating the Application

```bash
cd /var/www/iotspace
git pull origin main
cd backend
npm install
npm run build
pm2 reload ecosystem.config.js --env production
```

### Backup MongoDB Atlas

1. Go to Atlas → Your Cluster → **...** → **Take Snapshot**
2. Or configure automated backups in cluster settings

---

## Troubleshooting

### Backend won't start

```bash
# Check environment validation errors
cd /var/www/iotspace/backend
NODE_ENV=production node dist/server.js

# Check PM2 error logs
pm2 logs iotspace-backend --err --lines 50
```

### AWS IoT Core connection issues

1. Verify certificate paths in `.env.production`
2. Check certificate permissions: `ls -la /etc/iotspace/certs/`
3. Verify IoT policy is attached to certificate
4. Check AWS IoT endpoint in environment

### MongoDB connection issues

1. Verify connection string in `.env.production`
2. Check IP whitelist in MongoDB Atlas → Network Access
3. Test connection: `mongosh "your-connection-string"`

### SSL certificate issues

```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

---

## Security Checklist

- [ ] `.env.production` file is NOT committed to git
- [ ] JWT_SECRET is at least 64 characters
- [ ] WIFI_ENCRYPTION_KEY is exactly 64 hex characters
- [ ] AWS IoT certificates have 600 permissions
- [ ] Debug endpoints return 404 in production
- [ ] MongoDB Atlas IP whitelist only includes EC2 IP
- [ ] Google OAuth credentials are for production domain
- [ ] SSL certificate is valid and auto-renewing
- [ ] UFW firewall is enabled with only necessary ports
