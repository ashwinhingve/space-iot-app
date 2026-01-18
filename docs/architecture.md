# Architecture Overview

This document describes the system architecture of IoT Space.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   Next.js   │  │   Redux     │  │  Socket.io  │                 │
│  │  App Router │  │   Store     │  │   Client    │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
│         │                │                │                         │
│         └────────────────┼────────────────┘                         │
│                          │ HTTP/WebSocket                           │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────┴──────────────────────────────────────────┐
│                           BACKEND                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  Express.js │  │  Socket.io  │  │    MQTT     │                 │
│  │   REST API  │  │   Server    │  │   Client    │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
│         │                │                │                         │
│         └────────────────┼────────────────┘                         │
│                          │                                          │
│  ┌─────────────┐  ┌─────────────┐                                   │
│  │  Mongoose   │  │    JWT      │                                   │
│  │    ODM      │  │    Auth     │                                   │
│  └──────┬──────┘  └─────────────┘                                   │
└─────────┼───────────────────────────────────────────────────────────┘
          │                                    │
          ▼                                    ▼
┌─────────────────┐                  ┌─────────────────┐
│     MongoDB     │                  │   MQTT Broker   │
│    Database     │                  │   (Mosquitto)   │
└─────────────────┘                  └────────┬────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │  IoT Devices    │
                                    │    (ESP32)      │
                                    └─────────────────┘
```

## Component Overview

### Frontend (Next.js)

The frontend is built with Next.js 14 using the App Router for server-side rendering and client-side navigation.

**Key Components:**

| Component | Location | Purpose |
|-----------|----------|---------|
| `MainLayout` | `components/MainLayout.tsx` | Main app layout with navbar |
| `AnimatedBackground` | `components/AnimatedBackground.tsx` | Reusable animated background |
| `Dashboard` | `app/dashboard/page.tsx` | Main dashboard view |
| `DeviceCard` | `components/ModernDeviceCard.tsx` | Device display and control |

**State Management:**

Redux Toolkit is used for global state management with the following slices:

- `authSlice` - User authentication state
- `deviceSlice` - Device data and status
- `manifoldSlice` - Manifold systems data
- `dashboardSlice` - Dashboard stats and analytics

### Backend (Express.js)

The backend provides a REST API and real-time WebSocket connections.

**Directory Structure:**

```
backend/src/
├── controllers/          # Request handlers
│   ├── authController.ts
│   ├── deviceController.ts
│   └── manifoldController.ts
├── middleware/           # Express middleware
│   ├── auth.ts          # JWT verification
│   └── deviceAuth.ts    # Device authentication
├── models/              # Mongoose schemas
│   ├── User.ts
│   ├── Device.ts
│   └── Manifold.ts
├── routes/              # Route definitions
│   ├── authRoutes.ts
│   ├── deviceRoutes.ts
│   └── manifoldRoutes.ts
└── server.ts            # Application entry
```

### Database (MongoDB)

**Collections:**

| Collection | Purpose |
|------------|---------|
| `users` | User accounts and credentials |
| `devices` | IoT device configurations |
| `manifolds` | Irrigation manifold systems |
| `wificonfigs` | WiFi configuration storage |

**Key Schemas:**

```typescript
// User Schema
{
  name: String,
  email: String (unique),
  password: String (hashed),
  googleId: String (optional),
  createdAt: Date
}

// Device Schema
{
  name: String,
  type: String (switch|slider|sensor|chart),
  mqttTopic: String,
  status: String (online|offline),
  userId: ObjectId,
  settings: Object,
  lastData: { timestamp: Date, value: Number }
}

// Manifold Schema
{
  manifoldId: String (unique),
  name: String,
  userId: ObjectId,
  status: String (Active|Maintenance|Offline|Fault),
  valves: [{ number, state, flowRate, lastOperation }],
  specifications: { manufacturer, model, valveCount },
  installationDetails: { location, installationDate },
  metadata: { lastSync, totalCycles }
}
```

## Communication Protocols

### REST API

Used for CRUD operations on resources:
- User authentication (login, register, profile)
- Device management (create, read, update, delete)
- Manifold management

### WebSocket (Socket.io)

Used for real-time bidirectional communication:
- Device status updates
- Sensor data streaming
- Dashboard live updates

**Events:**

| Event | Direction | Purpose |
|-------|-----------|---------|
| `deviceData` | Server → Client | New sensor data |
| `deviceStatus` | Server → Client | Device online/offline |
| `valveUpdate` | Server → Client | Valve state change |
| `command` | Client → Server | User commands |

### MQTT

Used for IoT device communication:

**Topic Structure:**

```
devices/{device_id}/data      # Device publishes sensor data
devices/{device_id}/status    # Device status updates
devices/{device_id}/control   # Server sends commands
devices/{device_id}/online    # Connection status (LWT)
```

**Message Flow:**

1. Device connects to MQTT broker
2. Device subscribes to `devices/{id}/control`
3. Device publishes to `devices/{id}/data`
4. Backend receives via MQTT client
5. Backend emits to frontend via Socket.io

## Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Server  │     │ MongoDB  │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     │ POST /login    │                │
     │───────────────>│                │
     │                │  Find User     │
     │                │───────────────>│
     │                │<───────────────│
     │                │                │
     │                │ Verify Password│
     │                │───────────────>│
     │                │<───────────────│
     │                │                │
     │  JWT Token     │                │
     │<───────────────│                │
     │                │                │
     │ GET /devices   │                │
     │ Authorization: │                │
     │ Bearer {token} │                │
     │───────────────>│                │
     │                │ Verify JWT     │
     │                │                │
     │                │  Find Devices  │
     │                │───────────────>│
     │                │<───────────────│
     │  Device List   │                │
     │<───────────────│                │
```

## Device Data Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  ESP32   │     │   MQTT   │     │  Server  │     │  Client  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ PUBLISH data   │                │                │
     │───────────────>│                │                │
     │                │ Forward        │                │
     │                │───────────────>│                │
     │                │                │                │
     │                │                │ Save to DB     │
     │                │                │                │
     │                │                │ Emit Socket.io │
     │                │                │───────────────>│
     │                │                │                │
     │                │                │                │ Update UI
```

## Security Considerations

1. **Authentication**: JWT tokens with expiration
2. **Password Storage**: bcrypt hashing with salt
3. **API Security**: Rate limiting on auth endpoints
4. **CORS**: Restricted to frontend origin
5. **MQTT**: Optional username/password authentication
6. **Data Validation**: Input sanitization and validation

## Scalability

For production scaling:

1. **Database**: MongoDB replica sets for high availability
2. **Backend**: Multiple instances behind load balancer
3. **MQTT**: Clustered broker (e.g., EMQX, HiveMQ)
4. **Frontend**: CDN deployment (Vercel, Cloudflare)
5. **Caching**: Redis for session storage and caching
