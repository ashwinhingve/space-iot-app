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
    [key: string]: number | string | undefined;
  };
}

interface DeviceState {
  devices: Device[];
  selectedDevice: Device | null;
  loading: boolean;
  error: string | null;
}

const initialState: DeviceState = {
  devices: [],
  selectedDevice: null,
  loading: false,
  error: null,
};

export const fetchDevices = createAsyncThunk(
  'devices/fetchDevices',
  async (_, { getState }) => {
    const state = getState() as { auth: { token: string } };
    const response = await fetch(API_ENDPOINTS.DEVICES, {
      headers: {
        Authorization: `Bearer ${state.auth.token}`,
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
    const response = await fetch(API_ENDPOINTS.DEVICES, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.auth.token}`,
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
    const response = await fetch(API_ENDPOINTS.DEVICE_CONTROL(deviceId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.auth.token}`,
      },
      body: JSON.stringify({ value }),
    });

    if (!response.ok) {
      throw new Error('Failed to control device');
    }

    return response.json();
  }
);

export const deleteDevice = createAsyncThunk(
  'devices/deleteDevice',
  async (deviceId: string, { getState }) => {
    const state = getState() as { auth: { token: string } };
    const response = await fetch(API_ENDPOINTS.DEVICE_DETAIL(deviceId), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${state.auth.token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete device');
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
        device.lastData = data;
        device.status = 'online';
      }
      if (state.selectedDevice && state.selectedDevice._id === deviceId) {
        state.selectedDevice.lastData = data;
        state.selectedDevice.status = 'online';
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
  },
  extraReducers: (builder) => {
    builder
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
      .addCase(createDevice.fulfilled, (state, action) => {
        state.devices.push(action.payload);
      })
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
      .addCase(deleteDevice.fulfilled, (state, action) => {
        state.devices = state.devices.filter(device => device._id !== action.payload);
        if (state.selectedDevice && state.selectedDevice._id === action.payload) {
          state.selectedDevice = null;
        }
      });
  },
});

export const { setSelectedDevice, updateDeviceData, updateDeviceStatus, clearError } = deviceSlice.actions;
export default deviceSlice.reducer; 