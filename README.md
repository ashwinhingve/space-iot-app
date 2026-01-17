# IoT Space

A real-time IoT device monitoring and control platform built with Next.js, Node.js, and MQTT.

## Features

- Real-time device monitoring via MQTT
- Dashboard with customizable widgets
- User authentication (email/password and Google OAuth)
- Manifold valve control system
- ESP32 device integration

## Project Structure

```
├── backend/      # Node.js/Express API server
├── frontend/     # Next.js web application
├── esp32/        # ESP32 Arduino sketches
└── docs/         # Documentation
```

## Quick Start

1. Start MongoDB and MQTT broker
2. Run backend: `cd backend && npm install && npm start`
3. Run frontend: `cd frontend && npm install && npm run dev`
4. Open http://localhost:3000

See [docs/setup.md](docs/setup.md) for detailed instructions.

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, Redux Toolkit
- **Backend**: Node.js, Express, MongoDB, MQTT
- **Hardware**: ESP32 with DHT22 sensor
