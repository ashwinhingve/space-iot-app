# Free Deployment Guide - Space IoT App

Deploy the entire Space IoT App stack for **$0/month** using free-tier services.

| Component | Service | Cost | Limits |
|-----------|---------|------|--------|
| Frontend | Vercel Free | $0 | 100GB bandwidth/mo |
| Backend | Oracle Cloud Free Tier | $0 | Always Free ARM VM (4 OCPU, 24GB RAM) |
| Database | MongoDB Atlas M0 | $0 | 512MB storage |
| MQTT | Mosquitto (self-hosted) | $0 | Runs on Oracle VM |
| SSL | Let's Encrypt | $0 | Auto-renewable |

---

## Prerequisites

- GitHub account (repo: `ashwinhingve/space-iot-app`)
- Domain name with DNS access (e.g., `spaceautotech.com`)
- Email address for SSL certificates

---

## 1. MongoDB Atlas M0 (Free Database)

### Create Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account
2. Create a new project (e.g., "IoT Space")
3. Click **Build a Database** → Select **M0 FREE** tier
4. Choose a cloud provider/region close to your Oracle VM
5. Name the cluster (e.g., `iotspace-free`)

### Configure Access

1. **Database Access** → Add Database User
   - Username: `iotspace_admin`
   - Password: generate a strong password (save it!)
   - Role: `readWriteAnyDatabase`

2. **Network Access** → Add IP Address
   - Add your Oracle VM's public IP
   - Optionally add `0.0.0.0/0` for development (restrict later)

3. **Connect** → Get connection string:
   ```
   mongodb+srv://iotspace_admin:<password>@iotspace-free.xxxxx.mongodb.net/iotspace?retryWrites=true&w=majority
   ```

---

## 2. Oracle Cloud Free Tier VM (Backend Server)

### Create Account

1. Go to [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
2. Sign up (requires credit card for verification, but won't be charged)
3. Select your home region (cannot change later)

### Create Always Free VM

1. **Compute** → **Create Instance**
2. **Image**: Ubuntu 22.04 (or latest)
3. **Shape**: Select **Always Free Eligible**:
   - **ARM (Ampere)**: Up to 4 OCPUs, 24GB RAM (recommended)
   - **AMD**: 1 OCPU, 1GB RAM (minimal)
4. **Networking**: Use default VCN or create one
5. **SSH Key**: Upload your public SSH key
6. Click **Create**

### Configure Networking

1. **Networking** → **Virtual Cloud Networks** → Your VCN → **Subnets** → Your subnet → **Security Lists**
2. Add **Ingress Rules**:

   | Source CIDR | Protocol | Dest Port | Description |
   |-------------|----------|-----------|-------------|
   | 0.0.0.0/0 | TCP | 80 | HTTP |
   | 0.0.0.0/0 | TCP | 443 | HTTPS |
   | 0.0.0.0/0 | TCP | 1883 | MQTT |
   | 0.0.0.0/0 | TCP | 8883 | MQTT TLS |

### Setup the VM

SSH into your VM and run the setup scripts:

```bash
# SSH into the VM
ssh ubuntu@<your-vm-public-ip>

# Clone the repo
git clone https://github.com/ashwinhingve/space-iot-app.git /var/www/iotspace

# Run VM setup
cd /var/www/iotspace/deploy/oracle
sudo bash setup-oracle-vm.sh
```

---

## 3. Configure DNS

Add these DNS A records pointing to your Oracle VM's public IP:

| Type | Name | Value |
|------|------|-------|
| A | `api.spaceautotech.com` | `<oracle-vm-ip>` |

Wait for DNS propagation (can take up to 24 hours, usually minutes).

Verify: `nslookup api.spaceautotech.com`

---

## 4. SSL Certificates

```bash
cd /var/www/iotspace/deploy/oracle
sudo bash setup-ssl.sh
```

This obtains a Let's Encrypt certificate and configures Nginx.

---

## 5. Mosquitto MQTT Broker

```bash
cd /var/www/iotspace/deploy/oracle
sudo bash setup-mosquitto.sh
```

You'll be prompted to set a password for the MQTT user. Save this for `.env.production`.

Test the broker:
```bash
# In one terminal - subscribe
mosquitto_sub -h localhost -u iotspace -P <password> -t 'test/#' -v

# In another terminal - publish
mosquitto_pub -h localhost -u iotspace -P <password> -t 'test/hello' -m 'world'
```

---

## 6. Backend Deployment

### Create Environment File

```bash
cd /var/www/iotspace/backend
cp .env.production.example .env.production
nano .env.production
```

Fill in the values:
```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://iot.spaceautotech.com

# MongoDB Atlas connection string (from step 1)
MONGODB_URI=mongodb+srv://iotspace_admin:<password>@iotspace-free.xxxxx.mongodb.net/iotspace?retryWrites=true&w=majority

# Generate secrets
JWT_SECRET=<run: openssl rand -hex 64>
WIFI_ENCRYPTION_KEY=<run: openssl rand -hex 32>

# Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>

# Mosquitto MQTT (from step 5)
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=iotspace
MQTT_PASSWORD=<your-mqtt-password>
```

### Build and Start

```bash
cd /var/www/iotspace/backend
npm install
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
```

### Verify Backend

```bash
curl https://api.spaceautotech.com/api/health
```

---

## 7. Frontend Deployment (Vercel)

### Connect to Vercel

1. Go to [Vercel](https://vercel.com) and sign in with GitHub
2. **Import Project** → Select `space-iot-app` repo
3. **Root Directory**: Set to `frontend`
4. **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | `https://api.spaceautotech.com` |
   | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `<your-google-client-id>` |

5. Click **Deploy**

### Configure Domain

1. In Vercel project → **Settings** → **Domains**
2. Add `iot.spaceautotech.com`
3. Add the CNAME record Vercel provides to your DNS

---

## 8. Subsequent Deployments

### Backend (Oracle VM)

```bash
ssh ubuntu@<oracle-vm-ip>
cd /var/www/iotspace/deploy/oracle
bash deploy.sh
```

Or manually:
```bash
cd /var/www/iotspace
git pull origin main
cd backend && npm install && npm run build
pm2 reload ecosystem.config.js --env production
```

### Frontend (Vercel)

Push to `main` branch - Vercel auto-deploys.

---

## Verification Checklist

- [ ] MongoDB Atlas M0 cluster is running and accessible
- [ ] Oracle VM is running with public IP
- [ ] DNS records point to correct IPs
- [ ] SSL certificate is valid: `curl -I https://api.spaceautotech.com`
- [ ] Mosquitto is running: `systemctl status mosquitto`
- [ ] Backend health check: `curl https://api.spaceautotech.com/api/health`
- [ ] Frontend loads: `https://iot.spaceautotech.com`
- [ ] Login/registration works
- [ ] MQTT messages flow between devices and dashboard
- [ ] PM2 persists after reboot: `sudo reboot` then `pm2 status`

---

## Troubleshooting

### Backend won't start
```bash
pm2 logs iotspace-backend --lines 50
cat /var/log/iotspace/error.log
```

### Can't connect to MongoDB
- Check Atlas Network Access includes your Oracle VM's IP
- Verify connection string in `.env.production`

### Mosquitto connection refused
```bash
sudo systemctl status mosquitto
sudo journalctl -u mosquitto -n 20
# Check if ports are open:
sudo ss -tlnp | grep -E '1883|8883'
```

### SSL certificate issues
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

### Oracle VM ports not accessible
1. Check iptables: `sudo iptables -L -n`
2. Check OCI Security List has ingress rules for ports 80, 443, 1883, 8883
3. Check Nginx is running: `sudo systemctl status nginx`

### PM2 not surviving reboot
```bash
pm2 startup
# Run the command it outputs
pm2 save
```
