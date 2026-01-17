# Setup Guide

## Prerequisites

- Node.js (v18+)
- MongoDB (local or Atlas)
- MQTT Broker (e.g., Mosquitto)

## Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```env
PORT=5000
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/iot-space
JWT_SECRET=your-secret-key
MQTT_BROKER_URL=mqtt://localhost:1883
```

Start the server:
```bash
npm start
```

## Frontend Setup

```bash
cd frontend
npm install
```

Create `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Start the development server:
```bash
npm run dev
```

## Access

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Troubleshooting

### MongoDB not connecting
- Ensure MongoDB is running: `sudo service mongodb start`

### MQTT not connecting
- Ensure MQTT broker is running: `sudo service mosquitto start`

### API calls failing
- Verify backend is running on port 5000
- Check `.env.local` has correct `NEXT_PUBLIC_API_URL`
