// API URLs and configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// API Endpoints
export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  DEVICES: `${API_BASE_URL}/api/devices`,
  DEVICE_CONTROL: (deviceId: string) => `${API_BASE_URL}/api/devices/${deviceId}/control`,
  DEVICE_DETAIL: (deviceId: string) => `${API_BASE_URL}/api/devices/${deviceId}`,
};

// Socket.io Configuration
export const SOCKET_CONFIG = {
  URL: API_BASE_URL,
  OPTIONS: {
    transports: ['websocket', 'polling'] as const,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 10000
  }
}; 