# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (`cd backend`)
```bash
npm run dev        # Start with hot reload (nodemon + ts-node)
npm run build      # Compile TypeScript → dist/
npm run start      # Run compiled server (dist/server.js)
npm run lint       # ESLint check
```

### Frontend (`cd frontend`)
```bash
npm run dev        # Dev server on port 4000
npm run dev:turbo  # Dev server with Turbo mode
npm run build      # Production build (fails on TS errors or ESLint errors)
npm run start      # Production server on 0.0.0.0:4000
npm run lint       # ESLint check
```

No test suite exists — `npm test` in backend is a placeholder that exits 1.

### Default ports
- Frontend: `http://localhost:4000`
- Backend API: `http://localhost:5000`
- Local MQTT broker: `mqtt://localhost:1883`

---

## Architecture Overview

### Monorepo layout
```
backend/    Express + TypeScript API
frontend/   Next.js 14 App Router
esp32/      Arduino firmware for ESP32 devices
docs/       Architecture and deployment docs
```

### Backend (`backend/src/`)
**Entry point:** `server.ts` — sets up Express, Socket.io, MQTT broker, MongoDB, and all routes.

**MQTT modes** (controlled by `MQTT_MODE` env var):
- `local` — in-process Aedes broker (default for dev)
- `aws` — AWS IoT Core via `services/awsIotService.ts`
- `cloud` — External broker (HiveMQ, EMQX) via `services/ttnMqttService.ts`

**MQTT topic patterns:**
- `devices/{deviceId}/online|data` — ESP32/Wi-Fi devices
- `manifolds/{manifoldId}/status|online|ack` — valve manifolds
- `gsm/{deviceId}/online|data|location` — GSM devices

**Real-time flow:** MQTT message → handler in `server.ts` → Socket.io emit to room → frontend `useSocket*` hook.

**Key services:**
- `services/ttnService.ts` — The Things Network REST API
- `services/ttnMqttService.ts` — TTN MQTT uplink/downlink
- `services/awsIotService.ts` — AWS IoT Core connection

**Background timers in server.ts:**
- Device heartbeat check: every 5 seconds
- Valve command expiration: every 60 seconds
- TTN app sync: every 5 minutes

### Frontend (`frontend/src/`)
**State management:** Redux Toolkit (`store/`) — slices for auth, devices, network devices, TTN, config, manifolds, console.

**Layout system (`components/MainLayout.tsx`):** Checks route prefix — app routes (`/dashboard`, `/devices`, `/scada`, `/oms`, etc.) get the sidebar layout (`AppSidebar.tsx`); public routes get the navbar + footer.

**Auth flow:**
1. `AuthGuard.tsx` (inside `Providers.tsx`) reads `localStorage` token directly to avoid race conditions.
2. Protected routes redirect to `/login?redirect=<path>`.
3. New Google SSO users are redirected to `/onboarding`.

**Socket hooks:** `useSocketTTN.ts`, `useConsoleSocket.ts` — connect to backend Socket.io rooms.

**Key config file:** `src/lib/config.ts` — all API endpoint constants. Add new endpoints here.

**Three.js:** `@react-three/fiber` and `@react-three/drei` are transpiled via `next.config.js` (`transpilePackages`). 3D components live in `components/hero3d/`.

**Maps:** React-Leaflet with SSR disabled. Leaflet CSS is imported at the top of `globals.css`.

---

## Data Models (MongoDB via Mongoose)

Core models in `backend/src/models/`:
- `User.ts` — includes `role`, `userType` (individual|team), `purposeType`, `subpagePermissions[]`, `isActive`
- `Device.ts` — ESP32/Wi-Fi devices with MQTT credentials
- `NetworkDevice.ts` — Wi-Fi/GSM/LoRaWAN/Bluetooth network devices
- `TTNApplication.ts`, `TTNDevice.ts`, `TTNGateway.ts`, `TTNUplink.ts`, `TTNDownlink.ts` — LoRaWAN via TTN
- `ActivityLog.ts` — audit trail for all user actions

`SUBPAGE_DEFINITIONS` constant is duplicated in `backend/src/models/User.ts` AND `frontend/src/hooks/useRole.ts` — keep these in sync when modifying subpage permissions.

---

## RBAC System

**Roles:** `admin` (fixed: spaceautomation29@gmail.com), `engineer` (admin-assigned), `operator` (default).

**Hook:** `useRole()` in `frontend/src/hooks/useRole.ts` — use for all permission checks in the frontend.

**Guards:**
- `<RoleGuard roles={['admin','engineer']}>` — hides UI for unauthorized roles
- `<RoleGuard permission="x" subpage="y">` — subpage-level guard
- `canAccessSubpage(page, subpage)` from `useRole()` — returns `true` if `subpagePermissions` is empty (open by default)

---

## TypeScript Notes

- Backend: strict mode, path alias `@/*` → `src/*`, compiles to `dist/`
- Frontend: `next/typescript` ESLint config — unused variables cause build errors
- `catch (err)` where `err` is unused must be written as `catch {` (no variable)
- Both `next.config.js` options `ignoreDuringBuilds` are `false` — TS and ESLint errors fail the build

---

## Environment Variables

**Backend (`.env`):**
```
NODE_ENV, PORT, JWT_SECRET, MONGODB_URI
MQTT_MODE (local|aws|cloud), MQTT_PORT
FRONTEND_URL                           # CORS origin
AWS_IOT_ENDPOINT, AWS_REGION           # if MQTT_MODE=aws
AWS_IOT_CERT_PATH, AWS_IOT_KEY_PATH, AWS_IOT_CA_PATH
MQTT_BROKER_URL, MQTT_USERNAME, MQTT_PASSWORD  # if MQTT_MODE=cloud
GOOGLE_CLIENT_ID, AUTH_GOOGLE_SECRET
ENCRYPTION_KEY                         # for WiFiConfig encryption
```

**Frontend (`.env.local`):**
```
NEXT_PUBLIC_API_URL       # Backend base URL (proxied via vercel.json in production)
NEXT_PUBLIC_GOOGLE_CLIENT_ID
NEXT_PUBLIC_SITE_URL
```

**Important:** `AUTH_GOOGLE_SECRET` must never appear in frontend env files.

---

## Deployment

- **Frontend** → Vercel. Root directory in Vercel dashboard must be `frontend`. API calls proxied via `frontend/vercel.json` rewrites.
- **Backend** → Railway. Config in `backend/railway.json`.
- **Domains:** `iot.spaceautotech.com` (frontend), `api.spaceautotech.com` (backend)

WSL2 builds are slow (~5+ minutes) due to disk I/O. Google Fonts may fail in offline/WSL environments — builds still succeed.
