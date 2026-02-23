import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { API_ENDPOINTS } from '@/lib/config';

// Interfaces
export interface TTNApplication {
  _id: string;
  applicationId: string;
  name: string;
  description?: string;
  ttnRegion: string;
  webhookId?: string;
  isActive: boolean;
  hasApiKey: boolean;
  lastSync?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TTNDevice {
  _id: string;
  deviceId: string;
  applicationId: string;
  name: string;
  displayName?: string;
  description?: string;
  devEui: string;
  joinEui?: string;
  devAddr?: string;
  isOnline: boolean;
  lastSeen?: string;
  connectedSince?: string;
  lastUplink?: {
    timestamp: string;
    fPort: number;
    fCnt: number;
    payload: string;
    decodedPayload?: Record<string, unknown>;
    rssi?: number;
    snr?: number;
    spreadingFactor?: number;
    bandwidth?: number;
    frequency?: number;
    gatewayId?: string;
  };
  metrics: {
    totalUplinks: number;
    totalDownlinks: number;
    avgRssi?: number;
    avgSnr?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TTNGateway {
  _id: string;
  gatewayId: string;
  gatewayEui?: string;
  applicationId: string;
  name: string;
  location?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  isOnline: boolean;
  lastSeen: string;
  connectedSince?: string;
  metrics: {
    totalUplinksSeen: number;
    avgRssi: number;
    avgSnr: number;
    lastRssi: number;
    lastSnr: number;
  };
  firstSeen: string;
  createdAt: string;
  updatedAt: string;
}

export interface TTNGatewayStats {
  totalGateways: number;
  onlineGateways: number;
  avgSignalQuality: {
    avgRssi: number;
    avgSnr: number;
  };
  gateways: TTNGateway[];
}

export interface TTNUplink {
  _id: string;
  deviceId: string;
  applicationId: string;
  fPort: number;
  fCnt: number;
  rawPayload: string;
  decodedPayload?: Record<string, unknown>;
  rssi: number;
  snr: number;
  spreadingFactor: number;
  bandwidth: number;
  frequency: number;
  codingRate?: string;
  gatewayId: string;
  gatewayEui?: string;
  gatewayLocation?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  gateways?: Array<{
    gatewayId: string;
    gatewayEui?: string;
    rssi: number;
    snr: number;
    location?: {
      latitude: number;
      longitude: number;
      altitude?: number;
    };
  }>;
  receivedAt: string;
  devAddr?: string;
  confirmed: boolean;
  createdAt: string;
}

export interface TTNDownlink {
  _id: string;
  deviceId: string;
  applicationId: string;
  fPort: number;
  payload: string;
  decodedPayload?: Record<string, unknown>;
  confirmed: boolean;
  priority: string;
  correlationId: string;
  status: 'PENDING' | 'SCHEDULED' | 'SENT' | 'ACKNOWLEDGED' | 'FAILED';
  scheduledAt?: string;
  sentAt?: string;
  acknowledgedAt?: string;
  failedAt?: string;
  failureReason?: string;
  createdAt: string;
}

export interface TTNLogEntry {
  _id: string;
  _type: 'uplink' | 'downlink';
  _timestamp: string;
  deviceId: string;
  applicationId: string;
  // Uplink fields
  rawPayload?: string;
  rssi?: number;
  snr?: number;
  spreadingFactor?: number;
  frequency?: number;
  gatewayId?: string;
  gateways?: Array<{
    gatewayId: string;
    rssi: number;
    snr: number;
  }>;
  receivedAt?: string;
  fPort?: number;
  fCnt?: number;
  // Downlink fields
  payload?: string;
  status?: 'PENDING' | 'SCHEDULED' | 'SENT' | 'ACKNOWLEDGED' | 'FAILED';
  correlationId?: string;
  confirmed?: boolean;
  priority?: string;
  createdAt?: string;
}

export interface TTNStats {
  summary: {
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    totalUplinks: number;
    recentUplinks: number;
    totalDownlinks: number;
    pendingDownlinks: number;
    totalGateways: number;
    onlineGateways: number;
  };
  uplinkTimeSeries: Array<{
    _id: string;
    count: number;
    avgRssi: number;
    avgSnr: number;
  }>;
  topDevices: Array<{
    _id: string;
    uplinkCount: number;
    lastSeen: string;
    avgRssi: number;
    avgSnr: number;
  }>;
  downlinkTimeSeries: Array<{ _id: string; count: number }>;
  sfDistribution: Array<{ _id: number; count: number }>;
  downlinkStatusBreakdown: Array<{ _id: string; count: number }>;
  gatewayTraffic: Array<{ _id: string; count: number; avgRssi: number; avgSnr: number }>;
  hourlyHeatmap: Array<{ _id: number; count: number }>;
  frequencyDistribution: Array<{ _id: number; count: number }>;
  period: string;
}

interface TTNState {
  applications: TTNApplication[];
  selectedApplication: TTNApplication | null;
  devices: TTNDevice[];
  selectedDevice: TTNDevice | null;
  gateways: TTNGateway[];
  gatewayStats: TTNGatewayStats | null;
  uplinks: TTNUplink[];
  downlinks: TTNDownlink[];
  logs: TTNLogEntry[];
  logsTotal: number;
  stats: TTNStats | null;
  loading: boolean;
  syncLoading: boolean;
  logsLoading: boolean;
  logsError: string | null;
  error: string | null;
  success: string | null;
}

const initialState: TTNState = {
  applications: [],
  selectedApplication: null,
  devices: [],
  selectedDevice: null,
  gateways: [],
  gatewayStats: null,
  uplinks: [],
  downlinks: [],
  logs: [],
  logsTotal: 0,
  stats: null,
  loading: false,
  syncLoading: false,
  logsLoading: false,
  logsError: null,
  error: null,
  success: null,
};

// Helper to get auth headers
const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return headers;
};

// Async Thunks
export const fetchTTNApplications = createAsyncThunk(
  'ttn/fetchApplications',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(API_ENDPOINTS.TTN_APPLICATIONS, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch applications');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch applications');
    }
  }
);

export const createTTNApplication = createAsyncThunk(
  'ttn/createApplication',
  async (
    data: { applicationId: string; name: string; description?: string; ttnRegion: string; apiKey: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(API_ENDPOINTS.TTN_APPLICATIONS, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create application');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create application');
    }
  }
);

export const deleteTTNApplication = createAsyncThunk(
  'ttn/deleteApplication',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(API_ENDPOINTS.TTN_APPLICATION_DETAIL(id), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to delete application');
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete application');
    }
  }
);

export const syncTTNDevices = createAsyncThunk(
  'ttn/syncDevices',
  async ({ applicationId }: { applicationId: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(API_ENDPOINTS.TTN_SYNC_DEVICES(applicationId), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ applicationId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync devices');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to sync devices');
    }
  }
);

export const fetchTTNDevices = createAsyncThunk(
  'ttn/fetchDevices',
  async (applicationId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(API_ENDPOINTS.TTN_DEVICES(applicationId), {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch devices');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch devices');
    }
  }
);

export const updateTTNDevice = createAsyncThunk(
  'ttn/updateDevice',
  async (
    { applicationId, deviceId, displayName }: { applicationId: string; deviceId: string; displayName: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(API_ENDPOINTS.TTN_UPDATE_DEVICE(applicationId, deviceId), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ displayName }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update device');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update device');
    }
  }
);

export const fetchTTNUplinks = createAsyncThunk(
  'ttn/fetchUplinks',
  async (
    {
      applicationId,
      deviceId,
      gatewayId,
      startDate,
      endDate,
      limit = 50,
    }: {
      applicationId: string;
      deviceId?: string;
      gatewayId?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (deviceId && deviceId !== 'all') params.set('deviceId', deviceId);
      if (gatewayId) params.set('gatewayId', gatewayId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const url = `${API_ENDPOINTS.TTN_UPLINKS(applicationId)}?${params.toString()}`;
      const response = await fetch(url, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Failed to fetch uplinks');
      const data = await response.json();
      return data.uplinks || [];
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch uplinks');
    }
  }
);

export const fetchTTNDownlinks = createAsyncThunk(
  'ttn/fetchDownlinks',
  async (
    {
      applicationId,
      deviceId,
      startDate,
      endDate,
      limit = 50,
    }: {
      applicationId: string;
      deviceId?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (deviceId && deviceId !== 'all') params.set('deviceId', deviceId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const url = `${API_ENDPOINTS.TTN_DOWNLINKS(applicationId)}?${params.toString()}`;
      const response = await fetch(url, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Failed to fetch downlinks');
      const data = await response.json();
      return data.downlinks || [];
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch downlinks');
    }
  }
);

export const sendTTNDownlink = createAsyncThunk(
  'ttn/sendDownlink',
  async (
    {
      applicationId,
      deviceId,
      fPort,
      payload,
      confirmed,
      priority,
    }: {
      applicationId: string;
      deviceId: string;
      fPort: number;
      payload: string;
      confirmed?: boolean;
      priority?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(API_ENDPOINTS.TTN_SEND_DOWNLINK(applicationId, deviceId), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ fPort, payload, confirmed, priority }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send downlink');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to send downlink');
    }
  }
);

export const fetchTTNStats = createAsyncThunk(
  'ttn/fetchStats',
  async (
    { applicationId, period = '24h', startDate, endDate }: {
      applicationId: string;
      period?: string;
      startDate?: string;
      endDate?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      params.set('period', period);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const response = await fetch(`${API_ENDPOINTS.TTN_STATS(applicationId)}?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch stats');
    }
  }
);

export const fetchTTNGateways = createAsyncThunk(
  'ttn/fetchGateways',
  async (applicationId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(API_ENDPOINTS.TTN_GATEWAYS(applicationId), {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch gateways');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch gateways');
    }
  }
);

export const fetchTTNGatewayStats = createAsyncThunk(
  'ttn/fetchGatewayStats',
  async (applicationId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(API_ENDPOINTS.TTN_GATEWAY_STATS(applicationId), {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch gateway stats');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch gateway stats');
    }
  }
);

export const updateTTNApiKey = createAsyncThunk(
  'ttn/updateApiKey',
  async ({ id, apiKey }: { id: string; apiKey: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.TTN_APPLICATION_DETAIL(id)}/api-key`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ apiKey }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update API key');
      }
      return { id, ...(await response.json()) };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update API key');
    }
  }
);

export const fetchTTNLogs = createAsyncThunk(
  'ttn/fetchLogs',
  async (
    {
      applicationId,
      startDate,
      endDate,
      deviceId,
      gatewayId,
      eventType,
      limit = 200,
    }: {
      applicationId: string;
      startDate?: string;
      endDate?: string;
      deviceId?: string;
      gatewayId?: string;
      eventType?: string;
      limit?: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (deviceId && deviceId !== 'all') params.set('deviceId', deviceId);
      if (gatewayId) params.set('gatewayId', gatewayId);
      if (eventType && eventType !== 'all') params.set('eventType', eventType);
      params.set('limit', String(limit));
      const url = `${API_ENDPOINTS.TTN_LOGS(applicationId)}?${params.toString()}`;
      const response = await fetch(url, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Failed to fetch logs');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch logs');
    }
  }
);

const ttnSlice = createSlice({
  name: 'ttn',
  initialState,
  reducers: {
    setSelectedApplication: (state, action: PayloadAction<TTNApplication | null>) => {
      state.selectedApplication = action.payload;
    },
    setSelectedDevice: (state, action: PayloadAction<TTNDevice | null>) => {
      state.selectedDevice = action.payload;
    },
    addUplink: (state, action: PayloadAction<TTNUplink>) => {
      state.uplinks.unshift(action.payload);
      // Keep only last 100 uplinks in memory
      if (state.uplinks.length > 100) {
        state.uplinks = state.uplinks.slice(0, 100);
      }
      // Update device status
      const device = state.devices.find((d) => d.deviceId === action.payload.deviceId);
      if (device) {
        device.isOnline = true;
        device.lastSeen = action.payload.receivedAt;
        device.lastUplink = {
          timestamp: action.payload.receivedAt,
          fPort: action.payload.fPort,
          fCnt: action.payload.fCnt,
          payload: action.payload.rawPayload,
          decodedPayload: action.payload.decodedPayload,
          rssi: action.payload.rssi,
          snr: action.payload.snr,
          spreadingFactor: action.payload.spreadingFactor,
          bandwidth: action.payload.bandwidth,
          frequency: action.payload.frequency,
          gatewayId: action.payload.gatewayId,
        };
        device.metrics.totalUplinks++;
      }
    },
    updateDownlinkStatus: (
      state,
      action: PayloadAction<{ correlationId: string; status: TTNDownlink['status']; timestamp?: string }>
    ) => {
      const downlink = state.downlinks.find((d) => d.correlationId === action.payload.correlationId);
      if (downlink) {
        downlink.status = action.payload.status;
        if (action.payload.status === 'SENT') downlink.sentAt = action.payload.timestamp;
        if (action.payload.status === 'ACKNOWLEDGED') downlink.acknowledgedAt = action.payload.timestamp;
        if (action.payload.status === 'FAILED') downlink.failedAt = action.payload.timestamp;
      }
    },
    updateDeviceOnlineStatus: (state, action: PayloadAction<{ deviceId: string; isOnline: boolean }>) => {
      const device = state.devices.find((d) => d.deviceId === action.payload.deviceId);
      if (device) {
        device.isOnline = action.payload.isOnline;
      }
    },
    updateGatewayFromUplink: (state, action: PayloadAction<{ gatewayIds: string[] }>) => {
      // Mark gateways as online when they're seen in an uplink
      for (const gwId of action.payload.gatewayIds) {
        const gw = state.gateways.find((g) => g.gatewayId === gwId);
        if (gw) {
          gw.isOnline = true;
          gw.lastSeen = new Date().toISOString();
        }
      }
    },
    addLogEntry: (state, action: PayloadAction<TTNLogEntry>) => {
      state.logs.unshift(action.payload);
      if (state.logs.length > 200) {
        state.logs = state.logs.slice(0, 200);
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Applications
      .addCase(fetchTTNApplications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTTNApplications.fulfilled, (state, action) => {
        state.loading = false;
        state.applications = action.payload;
      })
      .addCase(fetchTTNApplications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create Application
      .addCase(createTTNApplication.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTTNApplication.fulfilled, (state, action) => {
        state.loading = false;
        state.applications.push(action.payload.application);
        state.success = action.payload.message;
      })
      .addCase(createTTNApplication.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete Application
      .addCase(deleteTTNApplication.fulfilled, (state, action) => {
        state.applications = state.applications.filter((app) => app._id !== action.payload);
        if (state.selectedApplication?._id === action.payload) {
          state.selectedApplication = null;
        }
        state.success = 'Application deleted successfully';
      })
      // Sync Devices
      .addCase(syncTTNDevices.pending, (state) => {
        state.syncLoading = true;
        state.error = null;
      })
      .addCase(syncTTNDevices.fulfilled, (state, action) => {
        state.syncLoading = false;
        state.devices = action.payload.devices;
        state.success = `Synced ${action.payload.syncedCount} devices from TTN`;
      })
      .addCase(syncTTNDevices.rejected, (state, action) => {
        state.syncLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Devices
      .addCase(fetchTTNDevices.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTTNDevices.fulfilled, (state, action) => {
        state.loading = false;
        state.devices = action.payload;
      })
      .addCase(fetchTTNDevices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update Device
      .addCase(updateTTNDevice.fulfilled, (state, action) => {
        const idx = state.devices.findIndex((d) => d._id === action.payload._id);
        if (idx !== -1) state.devices[idx] = action.payload;
      })
      // Fetch Uplinks
      .addCase(fetchTTNUplinks.fulfilled, (state, action) => {
        state.uplinks = action.payload;
      })
      // Fetch Logs
      .addCase(fetchTTNLogs.pending, (state) => {
        state.logsLoading = true;
        state.logsError = null;
      })
      .addCase(fetchTTNLogs.fulfilled, (state, action) => {
        state.logsLoading = false;
        state.logs = action.payload.logs || [];
        state.logsTotal = action.payload.total || 0;
      })
      .addCase(fetchTTNLogs.rejected, (state, action) => {
        state.logsLoading = false;
        state.logsError = action.payload as string;
      })
      // Fetch Downlinks
      .addCase(fetchTTNDownlinks.fulfilled, (state, action) => {
        state.downlinks = action.payload;
      })
      // Send Downlink
      .addCase(sendTTNDownlink.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendTTNDownlink.fulfilled, (state, action) => {
        state.loading = false;
        state.downlinks.unshift(action.payload.downlink);
        state.success = 'Downlink scheduled successfully';
      })
      .addCase(sendTTNDownlink.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Stats
      .addCase(fetchTTNStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      // Fetch Gateways
      .addCase(fetchTTNGateways.fulfilled, (state, action) => {
        state.gateways = action.payload;
      })
      // Fetch Gateway Stats
      .addCase(fetchTTNGatewayStats.fulfilled, (state, action) => {
        state.gatewayStats = action.payload;
      })
      // Update API Key
      .addCase(updateTTNApiKey.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTTNApiKey.fulfilled, (state, action) => {
        state.loading = false;
        // Update hasApiKey on the application
        const app = state.applications.find((a) => a._id === action.payload.id);
        if (app) app.hasApiKey = true;
        if (state.selectedApplication && state.selectedApplication._id === action.payload.id) {
          state.selectedApplication.hasApiKey = true;
        }
        state.success = 'API key updated successfully';
      })
      .addCase(updateTTNApiKey.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setSelectedApplication,
  setSelectedDevice,
  addUplink,
  addLogEntry,
  updateDownlinkStatus,
  updateDeviceOnlineStatus,
  updateGatewayFromUplink,
  clearError,
  clearSuccess,
} = ttnSlice.actions;

export default ttnSlice.reducer;
