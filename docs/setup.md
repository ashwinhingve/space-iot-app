# Setup Guide

This guide covers setting up the IoT Space platform for local development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18.0.0 or higher ([Download](https://nodejs.org/))
- **npm** v9.0.0 or higher (comes with Node.js)
- **MongoDB** v6.0 or higher ([Download](https://www.mongodb.com/try/download/community))
- **MQTT Broker** (e.g., Mosquitto) ([Download](https://mosquitto.org/download/))
- **Git** ([Download](https://git-scm.com/downloads))

## Step 1: Clone the Repository

```bash
git clone https://github.com/your-repo/space-iot-app.git
cd space-iot-app
```

## Step 2: Backend Setup

### Install Dependencies

```bash
cd backend
npm install
```

### Configure Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/iot-space

# JWT Authentication
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# MQTT Broker
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Start the Backend Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

The backend API will be available at `http://localhost:5000`.

## Step 3: Frontend Setup

### Install Dependencies

```bash
cd ../frontend
npm install
```

### Configure Environment Variables

Create a `.env.local` file in the `frontend` directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000

# Socket.io Configuration
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

# Google OAuth (optional)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

### Start the Frontend Server

```bash
# Development mode
npm run dev

# Build for production
npm run build
npm start
```

The frontend will be available at `http://localhost:3000`.

## Step 4: Database Setup

### Start MongoDB

```bash
# macOS (using Homebrew)
brew services start mongodb-community

# Ubuntu/Debian
sudo systemctl start mongod

# Windows
net start MongoDB
```

### Verify Connection

The backend will automatically connect to MongoDB when started. Check the console output for:

```
MongoDB connected successfully
```

## Step 5: MQTT Broker Setup

### Start Mosquitto

```bash
# macOS (using Homebrew)
brew services start mosquitto

# Ubuntu/Debian
sudo systemctl start mosquitto

# Windows
net start mosquitto
```

### Test MQTT Connection

```bash
# Subscribe to a test topic
mosquitto_sub -h localhost -t "test/#"

# In another terminal, publish a message
mosquitto_pub -h localhost -t "test/hello" -m "Hello, MQTT!"
```

## Step 6: Verify Installation

1. **Backend Health Check**: Visit `http://localhost:5000/api/health`
2. **Frontend**: Visit `http://localhost:3000`
3. **Create Account**: Register a new user account
4. **Add Device**: Try adding a test device

## Common Issues

### MongoDB Connection Failed

```
MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution**: Ensure MongoDB is running:
```bash
sudo systemctl status mongod
```

### MQTT Connection Failed

```
Error: connect ECONNREFUSED 127.0.0.1:1883
```

**Solution**: Ensure Mosquitto is running:
```bash
sudo systemctl status mosquitto
```

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution**: Kill the process using the port:
```bash
# Find the process
lsof -i :5000

# Kill it
kill -9 <PID>
```

### CORS Errors

If you see CORS errors in the browser console, verify that:
1. `FRONTEND_URL` in backend `.env` matches your frontend URL
2. Both servers are running on the expected ports

## Next Steps

- Read the [Architecture Guide](./architecture.md) to understand the system design
- Check the [API Reference](./api-reference.md) for endpoint documentation
- Review the [Frontend Guide](./frontend-guide.md) for UI development
- Set up an [ESP32 device](../esp32/README.md) to test the full flow
