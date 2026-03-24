# SpaceIoT Platform

SpaceIoT is an industrial IoT platform for telemetry, SCADA-style monitoring, alerts, and device operations.

## Repository

- GitHub: https://github.com/ashwinhingve/space-iot-app
- Project docs: [docs/README.md](./docs/README.md)

## Monorepo Structure

```text
backend/   Express + TypeScript API, MQTT, Socket.IO, MongoDB
frontend/  Next.js + TypeScript web application
esp32/     ESP32 firmware sketches
docs/      Setup, architecture, deployment, and API docs
```

## Local Setup

### 1) Clone and install dependencies

```bash
git clone https://github.com/ashwinhingve/space-iot-app.git
cd space-iot-app

cd backend && npm install
cd ../frontend && npm install
```

### 2) Configure environment files

- Backend: create `backend/.env`
- Frontend: create `frontend/.env.local`

Use [docs/setup.md](./docs/setup.md) for complete variable lists and examples.

### 3) Run development servers

```bash
# terminal 1
cd backend
npm run dev

# terminal 2
cd frontend
npm run dev
```

Default URLs:

- Frontend: `http://localhost:4000`
- Backend API: `http://localhost:5000`
- Health endpoint: `http://localhost:5000/api/health`

## Scripts

### Backend

- `npm run dev` - Start API with hot reload
- `npm run build` - Compile TypeScript
- `npm run start` - Run compiled server
- `npm run lint` - Lint backend TypeScript files

### Frontend

- `npm run dev` - Start Next.js development server (port 4000)
- `npm run build` - Production build
- `npm run start` - Start production server
- `npm run lint` - Lint Next.js/React code

## Security Notes

Backend includes:

- `helmet` hardening (CSP, X-Frame-Options, HSTS in production)
- HTTPS redirect support in production (`FORCE_HTTPS`, defaults enabled)
- Secure cookie flag middleware (HttpOnly, SameSite, Secure in production)

## License

ISC
