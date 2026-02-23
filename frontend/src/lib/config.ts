// API URLs and configuration
// Production: https://api.spaceautotech.com
// Development: http://localhost:5000
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Check if running in production
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  GOOGLE_AUTH: `${API_BASE_URL}/api/auth/google`,
  ME: `${API_BASE_URL}/api/auth/me`,
  LOGOUT: `${API_BASE_URL}/api/auth/logout`,

  // Devices
  DEVICES: `${API_BASE_URL}/api/devices`,
  DEVICE_CONTROL: (deviceId: string) => `${API_BASE_URL}/api/devices/${deviceId}/control`,
  DEVICE_DETAIL: (deviceId: string) => `${API_BASE_URL}/api/devices/${deviceId}`,

  // WiFi Config
  WIFI_CONFIG: `${API_BASE_URL}/api/device/wifi`,
  WIFI_CONFIG_LIST: `${API_BASE_URL}/api/device/wifi/list`,
  WIFI_CONFIG_DELETE: (deviceId: string) => `${API_BASE_URL}/api/device/wifi/${deviceId}`,
  WIFI_CONFIG_GET: (deviceId: string) => `${API_BASE_URL}/api/device/${deviceId}/wifi`,

  // Manifolds
  MANIFOLDS: `${API_BASE_URL}/api/manifolds`,
  MANIFOLD_DETAIL: (id: string) => `${API_BASE_URL}/api/manifolds/${id}`,
  MANIFOLD_STATUS: (id: string) => `${API_BASE_URL}/api/manifolds/${id}/status`,
  MANIFOLD_CONFIG: (id: string) => `${API_BASE_URL}/api/manifolds/${id}/config`,
  MANIFOLD_BY_DEVICE: (deviceId: string) => `${API_BASE_URL}/api/manifolds/device/${deviceId}`,

  // Valves
  VALVES: `${API_BASE_URL}/api/valves`,
  VALVE_DETAIL: (id: string) => `${API_BASE_URL}/api/valves/${id}`,
  VALVE_COMMAND: (id: string) => `${API_BASE_URL}/api/valves/${id}/command`,
  VALVE_STATUS: (id: string) => `${API_BASE_URL}/api/valves/${id}/status`,
  VALVE_HISTORY: (id: string) => `${API_BASE_URL}/api/valves/${id}/history`,
  VALVE_ALARMS: (id: string) => `${API_BASE_URL}/api/valves/${id}/alarms`,
  VALVE_ALARM_ACKNOWLEDGE: (valveId: string, alarmId: string) =>
    `${API_BASE_URL}/api/valves/${valveId}/alarms/${alarmId}/acknowledge`,
  VALVE_SCHEDULES: (id: string) => `${API_BASE_URL}/api/valves/${id}/schedules`,
  VALVE_SCHEDULE_DETAIL: (valveId: string, scheduleId: string) =>
    `${API_BASE_URL}/api/valves/${valveId}/schedules/${scheduleId}`,
  VALVES_BY_MANIFOLD: (manifoldId: string) => `${API_BASE_URL}/api/valves/manifold/${manifoldId}`,

  // Components
  COMPONENTS: `${API_BASE_URL}/api/components`,
  COMPONENT_DETAIL: (id: string) => `${API_BASE_URL}/api/components/${id}`,
  COMPONENT_MAINTENANCE: (id: string) => `${API_BASE_URL}/api/components/${id}/maintenance`,
  COMPONENTS_BY_MANIFOLD: (manifoldId: string) => `${API_BASE_URL}/api/components/manifold/${manifoldId}`,

  // Network Devices (LoRaWAN, Wi-Fi, Bluetooth, GSM)
  NETWORK_DEVICES: `${API_BASE_URL}/api/network-devices`,
  NETWORK_DEVICE_DETAIL: (id: string) => `${API_BASE_URL}/api/network-devices/${id}`,
  NETWORK_DEVICE_STATUS: (id: string) => `${API_BASE_URL}/api/network-devices/${id}/status`,
  NETWORK_DEVICE_STATS: `${API_BASE_URL}/api/network-devices/stats`,

  // TTN (The Things Network)
  TTN_APPLICATIONS: `${API_BASE_URL}/api/ttn/applications`,
  TTN_APPLICATION_DETAIL: (id: string) => `${API_BASE_URL}/api/ttn/applications/${id}`,
  TTN_SYNC_DEVICES: (appId: string) => `${API_BASE_URL}/api/ttn/applications/${appId}/sync`,
  TTN_DEVICES: (appId: string) => `${API_BASE_URL}/api/ttn/applications/${appId}/devices`,
  TTN_DEVICE_DETAIL: (appId: string, deviceId: string) => `${API_BASE_URL}/api/ttn/applications/${appId}/devices/${deviceId}`,
  TTN_UPDATE_DEVICE: (appId: string, deviceId: string) => `${API_BASE_URL}/api/ttn/applications/${appId}/devices/${deviceId}`,
  TTN_UPLINKS: (appId: string) => `${API_BASE_URL}/api/ttn/applications/${appId}/uplinks`,
  TTN_DEVICE_UPLINKS: (appId: string, deviceId: string) => `${API_BASE_URL}/api/ttn/applications/${appId}/devices/${deviceId}/uplinks`,
  TTN_SEND_DOWNLINK: (appId: string, deviceId: string) => `${API_BASE_URL}/api/ttn/applications/${appId}/devices/${deviceId}/downlink`,
  TTN_DOWNLINKS: (appId: string) => `${API_BASE_URL}/api/ttn/applications/${appId}/downlinks`,
  TTN_DEVICE_DOWNLINKS: (appId: string, deviceId: string) => `${API_BASE_URL}/api/ttn/applications/${appId}/devices/${deviceId}/downlinks`,
  TTN_GATEWAYS: (appId: string) => `${API_BASE_URL}/api/ttn/applications/${appId}/gateways`,
  TTN_GATEWAY_DETAIL: (appId: string, gwId: string) => `${API_BASE_URL}/api/ttn/applications/${appId}/gateways/${gwId}`,
  TTN_GATEWAY_STATS: (appId: string) => `${API_BASE_URL}/api/ttn/applications/${appId}/gateway-stats`,
  TTN_STATS: (appId: string) => `${API_BASE_URL}/api/ttn/applications/${appId}/stats`,
  TTN_LOGS: (appId: string) => `${API_BASE_URL}/api/ttn/applications/${appId}/logs`,
  TTN_LOGS_EXPORT: (appId: string) => `${API_BASE_URL}/api/ttn/applications/${appId}/logs/export`,
};

// Socket.io Configuration
export const SOCKET_CONFIG = {
  URL: API_BASE_URL,
  OPTIONS: {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 10000
  }
};

// Google OAuth Configuration
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'your-google-client-id-here.apps.googleusercontent.com'; 