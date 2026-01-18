# API Reference

Complete REST API documentation for IoT Space.

## Base URL

```
Development: http://localhost:5000/api
Production: https://api.iot-space.com/api
```

## Authentication

All API requests (except login/register) require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Authentication Endpoints

### Register User

Create a new user account.

```http
POST /api/auth/register
```

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Login

Authenticate and receive a JWT token.

```http
POST /api/auth/login
```

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Get Current User

Retrieve the authenticated user's profile.

```http
GET /api/auth/me
```

**Response (200 OK):**

```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Device Endpoints

### List All Devices

Get all devices for the authenticated user.

```http
GET /api/devices
```

**Response (200 OK):**

```json
{
  "success": true,
  "count": 2,
  "devices": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Living Room Sensor",
      "type": "sensor",
      "mqttTopic": "devices/sensor-001",
      "status": "online",
      "lastData": {
        "timestamp": "2024-01-15T10:30:00.000Z",
        "value": 23.5
      }
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Kitchen Light",
      "type": "switch",
      "mqttTopic": "devices/switch-001",
      "status": "online",
      "settings": {
        "value": 1
      }
    }
  ]
}
```

### Create Device

Add a new device.

```http
POST /api/devices
```

**Request Body:**

```json
{
  "name": "Garden Sensor",
  "type": "sensor",
  "mqttTopic": "devices/garden-001"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "device": {
    "_id": "507f1f77bcf86cd799439014",
    "name": "Garden Sensor",
    "type": "sensor",
    "mqttTopic": "devices/garden-001",
    "status": "offline",
    "userId": "507f1f77bcf86cd799439011",
    "createdAt": "2024-01-15T10:35:00.000Z"
  }
}
```

### Get Device by ID

Retrieve a specific device.

```http
GET /api/devices/:id
```

**Response (200 OK):**

```json
{
  "success": true,
  "device": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Living Room Sensor",
    "type": "sensor",
    "mqttTopic": "devices/sensor-001",
    "status": "online",
    "settings": {},
    "lastData": {
      "timestamp": "2024-01-15T10:30:00.000Z",
      "value": 23.5
    }
  }
}
```

### Update Device

Update device information.

```http
PUT /api/devices/:id
```

**Request Body:**

```json
{
  "name": "Updated Device Name",
  "settings": {
    "threshold": 25
  }
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "device": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Updated Device Name",
    "type": "sensor",
    "mqttTopic": "devices/sensor-001",
    "settings": {
      "threshold": 25
    }
  }
}
```

### Delete Device

Remove a device.

```http
DELETE /api/devices/:id
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Device deleted successfully"
}
```

### Control Device

Send a control command to a device.

```http
POST /api/devices/:id/control
```

**Request Body:**

```json
{
  "command": "toggle",
  "value": 1
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Command sent successfully",
  "device": {
    "_id": "507f1f77bcf86cd799439013",
    "settings": {
      "value": 1
    }
  }
}
```

---

## Manifold Endpoints

### List All Manifolds

Get all manifolds for the authenticated user.

```http
GET /api/manifolds
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (Active, Maintenance, Offline, Fault) |
| `limit` | number | Number of results (default: 50) |
| `page` | number | Page number for pagination |

**Response (200 OK):**

```json
{
  "success": true,
  "count": 1,
  "manifolds": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "manifoldId": "MAN-001",
      "name": "North Field Manifold",
      "status": "Active",
      "valves": [
        { "number": 1, "state": "open", "flowRate": 12.5 },
        { "number": 2, "state": "closed", "flowRate": 0 },
        { "number": 3, "state": "closed", "flowRate": 0 },
        { "number": 4, "state": "open", "flowRate": 10.2 }
      ],
      "specifications": {
        "manufacturer": "AUTOMAT",
        "model": "AM-4V",
        "valveCount": 4
      },
      "installationDetails": {
        "location": "North Field, Section A",
        "installationDate": "2024-01-01T00:00:00.000Z"
      },
      "metadata": {
        "totalCycles": 1250,
        "lastSync": "2024-01-15T10:30:00.000Z"
      }
    }
  ]
}
```

### Create Manifold

Add a new manifold system.

```http
POST /api/manifolds
```

**Request Body:**

```json
{
  "manifoldId": "MAN-002",
  "name": "South Field Manifold",
  "specifications": {
    "manufacturer": "AUTOMAT",
    "model": "AM-4V",
    "valveCount": 4
  },
  "installationDetails": {
    "location": "South Field, Section B",
    "installationDate": "2024-01-15"
  }
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "manifold": {
    "_id": "507f1f77bcf86cd799439016",
    "manifoldId": "MAN-002",
    "name": "South Field Manifold",
    "status": "Offline",
    "valves": [
      { "number": 1, "state": "closed", "flowRate": 0 },
      { "number": 2, "state": "closed", "flowRate": 0 },
      { "number": 3, "state": "closed", "flowRate": 0 },
      { "number": 4, "state": "closed", "flowRate": 0 }
    ]
  }
}
```

### Get Manifold by ID

Retrieve a specific manifold.

```http
GET /api/manifolds/:id
```

**Response (200 OK):**

```json
{
  "success": true,
  "manifold": {
    "_id": "507f1f77bcf86cd799439015",
    "manifoldId": "MAN-001",
    "name": "North Field Manifold",
    "status": "Active",
    "valves": [...],
    "specifications": {...},
    "installationDetails": {...},
    "metadata": {...}
  }
}
```

### Control Valve

Open or close a specific valve.

```http
POST /api/manifolds/:id/valve
```

**Request Body:**

```json
{
  "valve": 1,
  "action": "open"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Valve 1 opened successfully",
  "valve": {
    "number": 1,
    "state": "open",
    "flowRate": 12.5,
    "lastOperation": "2024-01-15T10:35:00.000Z"
  }
}
```

### Update Manifold Status

Update the manifold's operational status.

```http
PUT /api/manifolds/:id/status
```

**Request Body:**

```json
{
  "status": "Maintenance"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "manifold": {
    "_id": "507f1f77bcf86cd799439015",
    "status": "Maintenance"
  }
}
```

### Delete Manifold

Remove a manifold.

```http
DELETE /api/manifolds/:id
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Manifold deleted successfully"
}
```

---

## Dashboard Endpoints

### Get Dashboard Stats

Retrieve aggregated statistics for the dashboard.

```http
GET /api/dashboard/stats
```

**Response (200 OK):**

```json
{
  "success": true,
  "stats": {
    "devicesOnline": 8,
    "devicesOffline": 2,
    "manifoldsActive": 3,
    "manifoldsFault": 0,
    "valvesOn": 6,
    "valvesOff": 6,
    "activeAlerts": 1
  }
}
```

### Get Analytics

Retrieve analytics data for charts.

```http
GET /api/dashboard/analytics
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `period` | string | Time period (day, week, month) |

**Response (200 OK):**

```json
{
  "success": true,
  "analytics": {
    "deviceActivity": {
      "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      "data": [120, 150, 180, 165, 200, 190, 175]
    },
    "valveOperations": {
      "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      "onCount": [45, 52, 48, 55, 60, 58, 50],
      "offCount": [42, 50, 45, 52, 58, 55, 48]
    },
    "energyConsumption": {
      "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      "data": [25.5, 28.2, 26.8, 30.1, 32.5, 29.8, 27.2]
    }
  }
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

**Example Error Response (401):**

```json
{
  "success": false,
  "error": "Not authorized to access this resource"
}
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **General endpoints**: 100 requests per minute

When rate limited, you'll receive:

```json
{
  "success": false,
  "error": "Too many requests, please try again later"
}
```

---

## MQTT Topics Reference

For real-time device communication via MQTT:

| Topic | Direction | Payload |
|-------|-----------|---------|
| `devices/{id}/data` | Device → Server | `{"value": 23.5, "timestamp": "..."}` |
| `devices/{id}/status` | Device → Server | `{"status": "online"}` |
| `devices/{id}/control` | Server → Device | `{"command": "toggle", "value": 1}` |
| `devices/{id}/online` | Device → Server | LWT message |
| `manifolds/{id}/valve/{n}` | Server → Device | `{"action": "open"}` |
