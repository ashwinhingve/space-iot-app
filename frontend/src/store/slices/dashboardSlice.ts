import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Device and Manifold types for API responses
interface DeviceResponse {
  _id: string;
  status: 'online' | 'offline';
}

interface ManifoldResponse {
  _id: string;
  status: 'Active' | 'Maintenance' | 'Offline' | 'Fault';
}

interface ValveResponse {
  _id: string;
  valveNumber: number;
  operationalData?: {
    currentStatus: 'ON' | 'OFF';
  };
  alarms?: Array<{
    _id?: string;
    alarmId?: string;
    severity?: 'critical' | 'warning' | 'info';
    message?: string;
    timestamp?: string;
    acknowledged?: boolean;
  }>;
}

// Types
export interface SystemHealth {
  cpu: number;
  memory: number;
  network: 'excellent' | 'good' | 'fair' | 'poor';
  uptime: number;
  lastUpdated: string;
}

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  source: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface AnalyticsData {
  deviceActivity: {
    labels: string[];
    data: number[];
  };
  valveOperations: {
    labels: string[];
    onCount: number[];
    offCount: number[];
  };
  energyConsumption: {
    labels: string[];
    data: number[];
  };
  systemMetrics: {
    totalDevices: number;
    onlineDevices: number;
    totalManifolds: number;
    activeValves: number;
    totalAlerts: number;
    criticalAlerts: number;
  };
}

export interface DashboardStats {
  devicesOnline: number;
  devicesOffline: number;
  manifoldsActive: number;
  manifoldsFault: number;
  valvesOn: number;
  valvesOff: number;
  activeAlerts: number;
  systemUptime: number;
}

interface DashboardState {
  stats: DashboardStats;
  analytics: AnalyticsData | null;
  systemHealth: SystemHealth;
  alerts: Alert[];
  recentActivity: Array<{
    id: string;
    action: string;
    device: string;
    timestamp: string;
    status: 'success' | 'warning' | 'error';
  }>;
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  stats: {
    devicesOnline: 0,
    devicesOffline: 0,
    manifoldsActive: 0,
    manifoldsFault: 0,
    valvesOn: 0,
    valvesOff: 0,
    activeAlerts: 0,
    systemUptime: 0,
  },
  analytics: null,
  systemHealth: {
    cpu: 0,
    memory: 0,
    network: 'good',
    uptime: 0,
    lastUpdated: new Date().toISOString(),
  },
  alerts: [],
  recentActivity: [],
  loading: false,
  error: null,
};

// Helper to get auth token
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

// Thunks
export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const headers = getAuthHeaders();
      console.log('fetchDashboardStats - headers:', headers);

      // Fetch devices and manifolds in parallel
      const [devicesRes, manifoldsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/devices`, { headers }),
        fetch(`${API_BASE_URL}/api/manifolds`, { headers }),
      ]);

      console.log('fetchDashboardStats - devicesRes.ok:', devicesRes.ok, 'status:', devicesRes.status);
      console.log('fetchDashboardStats - manifoldsRes.ok:', manifoldsRes.ok, 'status:', manifoldsRes.status);

      const devices = devicesRes.ok ? await devicesRes.json() : [];
      const manifolds = manifoldsRes.ok ? await manifoldsRes.json() : [];

      console.log('fetchDashboardStats - devices count:', devices.length, 'manifolds count:', manifolds.length);
      console.log('fetchDashboardStats - devices:', devices);

      // Calculate stats from real data (case-insensitive comparison)
      const devicesOnline = devices.filter((d: DeviceResponse) =>
        d.status?.toLowerCase() === 'online'
      ).length;
      const devicesOffline = devices.filter((d: DeviceResponse) =>
        d.status?.toLowerCase() === 'offline' || !d.status
      ).length;

      console.log('fetchDashboardStats - devicesOnline:', devicesOnline, 'devicesOffline:', devicesOffline);
      console.log('fetchDashboardStats - device statuses:', devices.map((d: DeviceResponse) => ({ name: d._id, status: d.status })));

      const manifoldsActive = manifolds.filter((m: ManifoldResponse) => m.status === 'Active').length;
      const manifoldsFault = manifolds.filter((m: ManifoldResponse) => m.status === 'Fault').length;

      // Get valve counts from manifolds
      let valvesOn = 0;
      let valvesOff = 0;
      let activeAlerts = 0;

      for (const manifold of manifolds) {
        try {
          const valvesRes = await fetch(
            `${API_BASE_URL}/api/valves/manifold/${manifold._id}`,
            { headers: getAuthHeaders() }
          );
          if (valvesRes.ok) {
            const valves: ValveResponse[] = await valvesRes.json();
            valvesOn += valves.filter((v) => v.operationalData?.currentStatus === 'ON').length;
            valvesOff += valves.filter((v) => v.operationalData?.currentStatus === 'OFF').length;
            valves.forEach((v) => {
              activeAlerts += (v.alarms || []).filter((a) => !a.acknowledged).length;
            });
          }
        } catch (e) {
          console.error('Error fetching valves:', e);
        }
      }

      return {
        devicesOnline,
        devicesOffline,
        manifoldsActive,
        manifoldsFault,
        valvesOn,
        valvesOff,
        activeAlerts,
        systemUptime: Math.floor((Date.now() - new Date().setHours(0, 0, 0, 0)) / 1000),
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch dashboard stats');
    }
  }
);

export const fetchAnalytics = createAsyncThunk(
  'dashboard/fetchAnalytics',
  async (_, { rejectWithValue }) => {
    try {
      const [devicesRes, manifoldsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/devices`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/api/manifolds`, { headers: getAuthHeaders() }),
      ]);

      const devices = devicesRes.ok ? await devicesRes.json() : [];
      const manifolds = manifoldsRes.ok ? await manifoldsRes.json() : [];

      // Generate analytics from real data
      const now = new Date();
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - (6 - i));
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      });

      // Simulate activity data based on device count (will be replaced with real analytics endpoint)
      const deviceActivity = {
        labels: last7Days,
        data: last7Days.map(() => Math.floor(Math.random() * devices.length * 10) + devices.length),
      };

      const valveOperations = {
        labels: last7Days,
        onCount: last7Days.map(() => Math.floor(Math.random() * 20) + 5),
        offCount: last7Days.map(() => Math.floor(Math.random() * 15) + 3),
      };

      const energyConsumption = {
        labels: last7Days,
        data: last7Days.map(() => Math.floor(Math.random() * 100) + 50),
      };

      // Real metrics
      let activeValves = 0;
      let totalAlerts = 0;
      let criticalAlerts = 0;

      for (const manifold of manifolds) {
        try {
          const valvesRes = await fetch(
            `${API_BASE_URL}/api/valves/manifold/${manifold._id}`,
            { headers: getAuthHeaders() }
          );
          if (valvesRes.ok) {
            const valves: ValveResponse[] = await valvesRes.json();
            activeValves += valves.filter((v) => v.operationalData?.currentStatus === 'ON').length;
            valves.forEach((v) => {
              const alarms = v.alarms || [];
              totalAlerts += alarms.filter((a) => !a.acknowledged).length;
              criticalAlerts += alarms.filter((a) => !a.acknowledged && a.severity === 'critical').length;
            });
          }
        } catch (e) {
          console.error('Error fetching valves for analytics:', e);
        }
      }

      return {
        deviceActivity,
        valveOperations,
        energyConsumption,
        systemMetrics: {
          totalDevices: devices.length,
          onlineDevices: devices.filter((d: DeviceResponse) => d.status === 'online').length,
          totalManifolds: manifolds.length,
          activeValves,
          totalAlerts,
          criticalAlerts,
        },
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch analytics');
    }
  }
);

export const fetchAlerts = createAsyncThunk(
  'dashboard/fetchAlerts',
  async (_, { rejectWithValue }) => {
    try {
      const manifoldsRes = await fetch(`${API_BASE_URL}/api/manifolds`, {
        headers: getAuthHeaders(),
      });

      if (!manifoldsRes.ok) {
        return [];
      }

      const manifolds = await manifoldsRes.json();
      const allAlerts: Alert[] = [];

      for (const manifold of manifolds) {
        try {
          const valvesRes = await fetch(
            `${API_BASE_URL}/api/valves/manifold/${manifold._id}`,
            { headers: getAuthHeaders() }
          );
          if (valvesRes.ok) {
            const valves: ValveResponse[] = await valvesRes.json();
            valves.forEach((valve) => {
              (valve.alarms || []).forEach((alarm) => {
                allAlerts.push({
                  id: alarm._id || alarm.alarmId || `${valve._id}-${Date.now()}`,
                  type: alarm.severity === 'critical' ? 'critical' :
                        alarm.severity === 'warning' ? 'warning' : 'info',
                  title: `Valve ${valve.valveNumber} Alert`,
                  message: alarm.message || 'Unknown alarm',
                  source: `${manifold.name} - Valve ${valve.valveNumber}`,
                  timestamp: alarm.timestamp || new Date().toISOString(),
                  acknowledged: alarm.acknowledged || false,
                });
              });
            });
          }
        } catch (e) {
          console.error('Error fetching valve alarms:', e);
        }
      }

      // Sort by timestamp, newest first
      return allAlerts.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch alerts');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    updateSystemHealth: (state, action: PayloadAction<Partial<SystemHealth>>) => {
      state.systemHealth = { ...state.systemHealth, ...action.payload };
    },
    addAlert: (state, action: PayloadAction<Alert>) => {
      state.alerts.unshift(action.payload);
      // Keep only last 50 alerts
      if (state.alerts.length > 50) {
        state.alerts = state.alerts.slice(0, 50);
      }
    },
    acknowledgeAlert: (state, action: PayloadAction<string>) => {
      const alert = state.alerts.find(a => a.id === action.payload);
      if (alert) {
        alert.acknowledged = true;
      }
    },
    addActivity: (state, action: PayloadAction<{
      action: string;
      device: string;
      status: 'success' | 'warning' | 'error';
    }>) => {
      state.recentActivity.unshift({
        id: Date.now().toString(),
        ...action.payload,
        timestamp: new Date().toISOString(),
      });
      // Keep only last 20 activities
      if (state.recentActivity.length > 20) {
        state.recentActivity = state.recentActivity.slice(0, 20);
      }
    },
    updateStats: (state, action: PayloadAction<Partial<DashboardStats>>) => {
      state.stats = { ...state.stats, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Stats
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Analytics
      .addCase(fetchAnalytics.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Alerts
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        state.alerts = action.payload;
      });
  },
});

export const {
  updateSystemHealth,
  addAlert,
  acknowledgeAlert,
  addActivity,
  updateStats,
  clearError,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
