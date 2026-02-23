import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_ENDPOINTS } from '@/lib/config';

// ─── Types ───────────────────────────────────────────────────────────────────

export type NetworkProtocol = 'lorawan' | 'wifi' | 'bluetooth' | 'gsm';
export type NetworkDeviceStatus = 'online' | 'offline' | 'error' | 'provisioning';

export interface LoRaWANConfig {
  devEui?: string;
  appId?: string;
  activationMode?: 'OTAA' | 'ABP';
  deviceClass?: 'A' | 'B' | 'C';
  appKey?: string;
  devAddr?: string;
}

export interface WiFiConfig {
  macAddress?: string;
  ipAddress?: string;
  ssid?: string;
  chipset?: string;
  firmwareVersion?: string;
}

export interface BluetoothConfig {
  macAddress?: string;
  protocol?: 'BLE' | 'Classic';
  manufacturer?: string;
  firmwareVersion?: string;
  batteryLevel?: number;
  rssi?: number;
}

export interface GSMConfig {
  imei?: string;
  iccid?: string;
  apn?: string;
  networkType?: '2G' | '3G' | '4G' | 'LTE';
  location?: { lat: number; lng: number; altitude?: number };
}

export interface NetworkDevice {
  _id: string;
  name: string;
  description?: string;
  protocol: NetworkProtocol;
  status: NetworkDeviceStatus;
  signalStrength?: number;
  lastSeen?: string;
  owner: string;
  tags: string[];
  mqttDeviceId?: string;  // MQTT topic segment e.g. 'my-sensor-01'
  lorawan?: LoRaWANConfig;
  wifi?: WiFiConfig;
  bluetooth?: BluetoothConfig;
  gsm?: GSMConfig;
  createdAt: string;
  updatedAt: string;
}

export interface NetworkDeviceStats {
  lorawan: number;
  wifi: number;
  bluetooth: number;
  gsm: number;
  online: number;
}

interface NetworkDeviceState {
  devices: NetworkDevice[];
  stats: NetworkDeviceStats | null;
  loading: boolean;
  error: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const fetchNetworkDevices = createAsyncThunk(
  'networkDevices/fetchAll',
  async (protocol: NetworkProtocol | undefined = undefined, { rejectWithValue }) => {
    try {
      const url = protocol
        ? `${API_ENDPOINTS.NETWORK_DEVICES}?protocol=${protocol}`
        : API_ENDPOINTS.NETWORK_DEVICES;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch network devices');
      return (await res.json()) as NetworkDevice[];
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch');
    }
  }
);

export const fetchNetworkDeviceStats = createAsyncThunk(
  'networkDevices/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(API_ENDPOINTS.NETWORK_DEVICE_STATS, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return (await res.json()) as NetworkDeviceStats;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch stats');
    }
  }
);

export const createNetworkDevice = createAsyncThunk(
  'networkDevices/create',
  async (data: Omit<NetworkDevice, '_id' | 'owner' | 'createdAt' | 'updatedAt'>, { rejectWithValue }) => {
    try {
      const res = await fetch(API_ENDPOINTS.NETWORK_DEVICES, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create device');
      }
      return (await res.json()) as NetworkDevice;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create');
    }
  }
);

export const updateNetworkDevice = createAsyncThunk(
  'networkDevices/update',
  async ({ id, data }: { id: string; data: Partial<NetworkDevice> }, { rejectWithValue }) => {
    try {
      const res = await fetch(API_ENDPOINTS.NETWORK_DEVICE_DETAIL(id), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update device');
      }
      return (await res.json()) as NetworkDevice;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update');
    }
  }
);

export const deleteNetworkDevice = createAsyncThunk(
  'networkDevices/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await fetch(API_ENDPOINTS.NETWORK_DEVICE_DETAIL(id), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete device');
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete');
    }
  }
);

export const updateNetworkDeviceStatus = createAsyncThunk(
  'networkDevices/updateStatus',
  async ({ id, status }: { id: string; status: NetworkDeviceStatus }, { rejectWithValue }) => {
    try {
      const res = await fetch(API_ENDPOINTS.NETWORK_DEVICE_STATUS(id), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      return (await res.json()) as NetworkDevice;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update status');
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const initialState: NetworkDeviceState = {
  devices: [],
  stats: null,
  loading: false,
  error: null,
};

const networkDeviceSlice = createSlice({
  name: 'networkDevices',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchNetworkDevices
      .addCase(fetchNetworkDevices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNetworkDevices.fulfilled, (state, action) => {
        state.loading = false;
        state.devices = action.payload;
      })
      .addCase(fetchNetworkDevices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchNetworkDeviceStats
      .addCase(fetchNetworkDeviceStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      // createNetworkDevice
      .addCase(createNetworkDevice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNetworkDevice.fulfilled, (state, action) => {
        state.loading = false;
        state.devices.unshift(action.payload);
        if (state.stats) {
          const key = action.payload.protocol as keyof typeof state.stats;
          state.stats[key] = (state.stats[key] as number) + 1;
        }
      })
      .addCase(createNetworkDevice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateNetworkDevice
      .addCase(updateNetworkDevice.fulfilled, (state, action) => {
        const idx = state.devices.findIndex((d) => d._id === action.payload._id);
        if (idx !== -1) state.devices[idx] = action.payload;
      })
      // deleteNetworkDevice
      .addCase(deleteNetworkDevice.fulfilled, (state, action) => {
        const removed = state.devices.find((d) => d._id === action.payload);
        state.devices = state.devices.filter((d) => d._id !== action.payload);
        if (state.stats && removed) {
          const key = removed.protocol as keyof typeof state.stats;
          state.stats[key] = Math.max(0, (state.stats[key] as number) - 1);
          if (removed.status === 'online') {
            state.stats.online = Math.max(0, state.stats.online - 1);
          }
        }
      })
      // updateNetworkDeviceStatus
      .addCase(updateNetworkDeviceStatus.fulfilled, (state, action) => {
        const idx = state.devices.findIndex((d) => d._id === action.payload._id);
        if (idx !== -1) state.devices[idx] = action.payload;
      });
  },
});

export const { clearError } = networkDeviceSlice.actions;
export default networkDeviceSlice.reducer;
