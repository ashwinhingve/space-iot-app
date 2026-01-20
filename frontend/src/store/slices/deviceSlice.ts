import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_ENDPOINTS } from '@/lib/config';

interface Device {
  _id: string;
  name: string;
  type: string;
  status: 'online' | 'offline';
  mqttTopic: string;
  lastData: {
    timestamp: string;
    value: number;
  };
  settings: {
    value?: number;
    temperature?: number;
    humidity?: number;
    brightness?: number;
    color?: string;
    valves?: { v1: boolean; v2: boolean; v3: boolean; v4: boolean };
    [key: string]: number | string | boolean | { v1: boolean; v2: boolean; v3: boolean; v4: boolean } | undefined;
  };
}

interface WiFiConfig {
  deviceId: string;
  ssid: string;
  apiKey: string;
  lastFetched?: string;
  createdAt: string;
  updatedAt: string;
}

interface DeviceState {
  devices: Device[];
  selectedDevice: Device | null;
  wifiConfigs: WiFiConfig[];
  loading: boolean;
  wifiLoading: boolean;
  error: string | null;
  wifiError: string | null;
  wifiSuccess: string | null;
}

const initialState: DeviceState = {
  devices: [],
  selectedDevice: null,
  wifiConfigs: [],
  loading: false,
  wifiLoading: false,
  error: null,
  wifiError: null,
  wifiSuccess: null,
};

// Helper to get token from localStorage or Redux state
const getToken = (state: { auth: { token: string } }): string | null => {
  // First try localStorage (more reliable on page load)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) return token;
  }
  // Fallback to Redux state
  return state.auth.token;
};

export const fetchDevices = createAsyncThunk(
  'devices/fetchDevices',
  async (_, { getState }) => {
    const state = getState() as { auth: { token: string } };
    const token = getToken(state);

    const response = await fetch(API_ENDPOINTS.DEVICES, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch devices');
    }

    return response.json();
  }
);

export const createDevice = createAsyncThunk(
  'devices/createDevice',
  async (deviceData: { name: string; type: string; mqttTopic: string }, { getState }) => {
    const state = getState() as { auth: { token: string } };
    const token = getToken(state);
    const response = await fetch(API_ENDPOINTS.DEVICES, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(deviceData),
    });

    if (!response.ok) {
      throw new Error('Failed to create device');
    }

    return response.json();
  }
);

export const controlDevice = createAsyncThunk(
  'devices/controlDevice',
  async ({ deviceId, value }: { deviceId: string; value: number }, { getState }) => {
    const state = getState() as { auth: { token: string } };
    const token = getToken(state);
    const response = await fetch(API_ENDPOINTS.DEVICE_CONTROL(deviceId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ value }),
    });

    if (!response.ok) {
      throw new Error('Failed to control device');
    }

    return response.json();
  }
);

export const updateDevice = createAsyncThunk(
  'devices/updateDevice',
  async (
    { deviceId, data }: { deviceId: string; data: { name?: string; type?: string; mqttTopic?: string } },
    { getState }
  ) => {
    const state = getState() as { auth: { token: string } };
    const token = getToken(state);
    const response = await fetch(API_ENDPOINTS.DEVICE_DETAIL(deviceId), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update device');
    }

    return response.json();
  }
);

export const deleteDevice = createAsyncThunk(
  'devices/deleteDevice',
  async (deviceId: string, { getState }) => {
    const state = getState() as { auth: { token: string } };
    const token = getToken(state);
    const response = await fetch(API_ENDPOINTS.DEVICE_DETAIL(deviceId), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete device');
    }

    return deviceId;
  }
);

// WiFi Configuration Actions
export const fetchWiFiConfigs = createAsyncThunk(
  'devices/fetchWiFiConfigs',
  async (_, { getState }) => {
    const state = getState() as { auth: { token: string } };
    const token = getToken(state);
    const response = await fetch(API_ENDPOINTS.WIFI_CONFIG_LIST, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch WiFi configurations');
    }

    const data = await response.json();
    // API returns { success, count, configs: [...] }
    return data.configs || [];
  }
);

export const saveWiFiConfig = createAsyncThunk(
  'devices/saveWiFiConfig',
  async (
    wifiData: { deviceId: string; ssid: string; password: string },
    { getState, rejectWithValue }
  ) => {
    const state = getState() as { auth: { token: string } };
    const token = getToken(state);
    const response = await fetch(API_ENDPOINTS.WIFI_CONFIG, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(wifiData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to save WiFi configuration' }));
      return rejectWithValue(errorData.error || errorData.message || 'Failed to save WiFi configuration');
    }

    const data = await response.json();
    // API returns { success, message, deviceId, apiKey, ssid }
    return {
      deviceId: data.deviceId,
      ssid: data.ssid,
      apiKey: data.apiKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
);

export const deleteWiFiConfig = createAsyncThunk(
  'devices/deleteWiFiConfig',
  async (deviceId: string, { getState }) => {
    const state = getState() as { auth: { token: string } };
    const token = getToken(state);
    const response = await fetch(API_ENDPOINTS.WIFI_CONFIG_DELETE(deviceId), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete WiFi configuration');
    }

    return deviceId;
  }
);

const deviceSlice = createSlice({
  name: 'devices',
  initialState,
  reducers: {
    setSelectedDevice: (state, action) => {
      state.selectedDevice = action.payload;
    },
    updateDeviceData: (state, action) => {
      const { deviceId, data } = action.payload;
      const device = state.devices.find(d => d._id === deviceId);
      if (device) {
        // Update lastData
        device.lastData = {
          timestamp: data.timestamp || new Date().toISOString(),
          value: data.value ?? device.lastData?.value ?? 0,
        };
        device.status = 'online';
        // Update settings with sensor data
        if (data.temperature !== undefined) {
          device.settings = { ...device.settings, temperature: data.temperature };
        }
        if (data.humidity !== undefined) {
          device.settings = { ...device.settings, humidity: data.humidity };
        }
        if (data.value !== undefined) {
          device.settings = { ...device.settings, value: data.value };
        }
        if (data.valves !== undefined) {
          device.settings = { ...device.settings, valves: data.valves };
        }
      }
      if (state.selectedDevice && state.selectedDevice._id === deviceId) {
        state.selectedDevice.lastData = {
          timestamp: data.timestamp || new Date().toISOString(),
          value: data.value ?? state.selectedDevice.lastData?.value ?? 0,
        };
        state.selectedDevice.status = 'online';
        if (data.temperature !== undefined) {
          state.selectedDevice.settings = { ...state.selectedDevice.settings, temperature: data.temperature };
        }
        if (data.humidity !== undefined) {
          state.selectedDevice.settings = { ...state.selectedDevice.settings, humidity: data.humidity };
        }
        if (data.value !== undefined) {
          state.selectedDevice.settings = { ...state.selectedDevice.settings, value: data.value };
        }
        if (data.valves !== undefined) {
          state.selectedDevice.settings = { ...state.selectedDevice.settings, valves: data.valves };
        }
      }
    },
    updateDeviceStatus: (state, action) => {
      const { deviceId, status } = action.payload;
      const device = state.devices.find(d => d._id === deviceId);
      if (device) {
        device.status = status;
      }
      if (state.selectedDevice && state.selectedDevice._id === deviceId) {
        state.selectedDevice.status = status;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    clearWiFiMessages: (state) => {
      state.wifiError = null;
      state.wifiSuccess = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Devices
      .addCase(fetchDevices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDevices.fulfilled, (state, action) => {
        state.loading = false;
        state.devices = action.payload;
      })
      .addCase(fetchDevices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch devices';
      })
      // Create Device
      .addCase(createDevice.fulfilled, (state, action) => {
        state.devices.push(action.payload);
      })
      // Control Device
      .addCase(controlDevice.fulfilled, (state, action) => {
        const { deviceId, value } = action.meta.arg;
        const device = state.devices.find(d => d._id === deviceId);
        if (device) {
          if (device.settings) {
            device.settings.value = value;
          } else {
            device.settings = { value };
          }
          device.lastData = {
            ...device.lastData,
            value,
            timestamp: new Date().toISOString()
          };
        }
        if (state.selectedDevice && state.selectedDevice._id === deviceId) {
          if (state.selectedDevice.settings) {
            state.selectedDevice.settings.value = value;
          } else {
            state.selectedDevice.settings = { value };
          }
          state.selectedDevice.lastData = {
            ...state.selectedDevice.lastData,
            value,
            timestamp: new Date().toISOString()
          };
        }
      })
      .addCase(controlDevice.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to control device';
      })
      // Update Device
      .addCase(updateDevice.fulfilled, (state, action) => {
        const index = state.devices.findIndex(d => d._id === action.payload._id);
        if (index >= 0) {
          state.devices[index] = { ...state.devices[index], ...action.payload };
        }
        if (state.selectedDevice && state.selectedDevice._id === action.payload._id) {
          state.selectedDevice = { ...state.selectedDevice, ...action.payload };
        }
      })
      .addCase(updateDevice.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update device';
      })
      // Delete Device
      .addCase(deleteDevice.fulfilled, (state, action) => {
        state.devices = state.devices.filter(device => device._id !== action.payload);
        if (state.selectedDevice && state.selectedDevice._id === action.payload) {
          state.selectedDevice = null;
        }
      })
      .addCase(deleteDevice.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete device';
      })
      // Fetch WiFi Configs
      .addCase(fetchWiFiConfigs.pending, (state) => {
        state.wifiLoading = true;
        state.wifiError = null;
      })
      .addCase(fetchWiFiConfigs.fulfilled, (state, action) => {
        state.wifiLoading = false;
        state.wifiConfigs = action.payload;
      })
      .addCase(fetchWiFiConfigs.rejected, (state, action) => {
        state.wifiLoading = false;
        state.wifiError = action.error.message || 'Failed to fetch WiFi configurations';
      })
      // Save WiFi Config
      .addCase(saveWiFiConfig.pending, (state) => {
        state.wifiLoading = true;
        state.wifiError = null;
        state.wifiSuccess = null;
      })
      .addCase(saveWiFiConfig.fulfilled, (state, action) => {
        state.wifiLoading = false;
        state.wifiSuccess = 'WiFi configuration saved successfully!';
        // Update or add the config
        const existingIndex = state.wifiConfigs.findIndex(c => c.deviceId === action.payload.deviceId);
        if (existingIndex >= 0) {
          state.wifiConfigs[existingIndex] = action.payload;
        } else {
          state.wifiConfigs.push(action.payload);
        }
      })
      .addCase(saveWiFiConfig.rejected, (state, action) => {
        state.wifiLoading = false;
        state.wifiError = action.payload as string || 'Failed to save WiFi configuration';
      })
      // Delete WiFi Config
      .addCase(deleteWiFiConfig.pending, (state) => {
        state.wifiLoading = true;
      })
      .addCase(deleteWiFiConfig.fulfilled, (state, action) => {
        state.wifiLoading = false;
        state.wifiConfigs = state.wifiConfigs.filter(c => c.deviceId !== action.payload);
        state.wifiSuccess = 'WiFi configuration deleted successfully!';
      })
      .addCase(deleteWiFiConfig.rejected, (state, action) => {
        state.wifiLoading = false;
        state.wifiError = action.error.message || 'Failed to delete WiFi configuration';
      });
  },
});

export const { setSelectedDevice, updateDeviceData, updateDeviceStatus, clearError, clearWiFiMessages } = deviceSlice.actions;
export default deviceSlice.reducer;
