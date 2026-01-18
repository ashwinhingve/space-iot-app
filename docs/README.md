# IoT Space Documentation

Welcome to the IoT Space developer documentation. This guide will help you understand, set up, and contribute to the IoT Space platform.

## Table of Contents

1. [Setup Guide](./setup.md) - Getting started with local development
2. [Architecture](./architecture.md) - System architecture and design decisions
3. [API Reference](./api-reference.md) - Complete REST API documentation
4. [Frontend Guide](./frontend-guide.md) - Frontend development guide
5. [Backend Guide](./backend-guide.md) - Backend development guide
6. [Deployment](./deployment.md) - Production deployment instructions
7. [Contributing](./contributing.md) - How to contribute to the project

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-repo/space-iot-app.git
cd space-iot-app

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Start development servers (in separate terminals)
cd backend && npm run dev
cd frontend && npm run dev
```

## Project Structure

```
space-iot-app/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Auth, validation, etc.
│   │   ├── models/         # MongoDB schemas
│   │   ├── routes/         # API route definitions
│   │   └── server.ts       # Application entry point
│   └── package.json
├── frontend/               # Next.js React application
│   ├── src/
│   │   ├── app/           # Next.js App Router pages
│   │   ├── components/    # Reusable React components
│   │   ├── lib/           # Utility functions
│   │   └── store/         # Redux state management
│   └── package.json
├── esp32/                  # ESP32 device firmware
│   ├── device.ino         # Basic device firmware
│   └── dynamic_wifi_device.ino  # WiFi config firmware
└── docs/                   # Documentation (you are here)
```

## Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Redux Toolkit** - State management
- **Framer Motion** - Animation library
- **Three.js** - 3D visualization

### Backend
- **Express.js** - Node.js web framework
- **TypeScript** - Type-safe JavaScript
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication tokens
- **Socket.io** - Real-time communication
- **MQTT** - IoT messaging protocol

### Hardware
- **ESP32** - WiFi-enabled microcontroller
- **Arduino IDE** - Firmware development

## Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/space-iot-app/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/space-iot-app/discussions)
