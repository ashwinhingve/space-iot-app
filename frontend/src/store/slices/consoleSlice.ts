'use client';

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { API_ENDPOINTS } from '@/lib/config';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WidgetType = 'gauge' | 'value' | 'chart' | 'button' | 'switch' | 'slider' | 'led' | 'terminal';
export type DeviceType = 'ttn' | 'wifi' | 'manifold' | 'mqtt';
export type ApiType = 'mqtt' | 'ttn-downlink' | 'valve' | 'none';

export interface WidgetDataSource {
  path: string;
  label?: string;
  unit?: string;
  transform?: 'none' | 'multiply' | 'divide' | 'round' | 'toFixed1' | 'toFixed2';
  transformValue?: number;
}

export interface WidgetLayout {
  i: string; x: number; y: number; w: number; h: number;
  minW?: number; minH?: number; maxW?: number; maxH?: number; static?: boolean;
}

export interface WidgetOnPress {
  apiType: ApiType;
  mqttDeviceId?: string;
  pressValue?: number;
  releaseValue?: number;
  ttnAppId?: string;
  ttnDeviceId?: string;
  fPort?: number;
  valveId?: string;
  valveAction?: 'ON' | 'OFF' | 'PULSE';
}

export interface ConsoleWidget {
  widgetId: string;
  type: WidgetType;
  label: string;
  color: string;
  backgroundColor?: string;
  dataSource?: WidgetDataSource;
  chartMaxPoints?: number;
  min?: number;
  max?: number;
  unit?: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  trueColor?: string;
  falseColor?: string;
  onValue?: unknown;
  onPress?: WidgetOnPress;
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
  layout: WidgetLayout;
}

export interface DeviceRef {
  deviceType: DeviceType;
  ttnApplicationId?: string;
  ttnDeviceId?: string;
  deviceId?: string;
  manifoldId?: string;
  deviceName?: string;
}

export interface ConsoleDashboard {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  deviceRef: DeviceRef;
  widgets: ConsoleWidget[];
  isPublic: boolean;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsoleTemplate {
  slug: string;
  name: string;
  description: string;
  deviceType: DeviceType;
}

export interface WidgetLiveValue {
  rawValue: unknown;
  displayValue: string | number;
  timestamp: number;
  history: { value: number; timestamp: number }[];
}

interface ConsoleState {
  dashboards: ConsoleDashboard[];
  activeDashboard: ConsoleDashboard | null;
  templates: ConsoleTemplate[];
  widgetValues: Record<string, WidgetLiveValue>;
  isEditMode: boolean;
  editingWidgetId: string | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ─── Async thunks ─────────────────────────────────────────────────────────────

export const fetchDashboards = createAsyncThunk<ConsoleDashboard[], void>('console/fetchDashboards', async (_, { rejectWithValue }) => {
  const res = await fetch(API_ENDPOINTS.CONSOLE_DASHBOARDS, { headers: getAuthHeaders() });
  const d = await res.json();
  if (!res.ok) return rejectWithValue(d.error || 'Failed');
  return d.dashboards as ConsoleDashboard[];
});

export const fetchDashboard = createAsyncThunk('console/fetchDashboard', async (id: string, { rejectWithValue }) => {
  const res = await fetch(API_ENDPOINTS.CONSOLE_DASHBOARD(id), { headers: getAuthHeaders() });
  const d = await res.json();
  if (!res.ok) return rejectWithValue(d.error || 'Failed');
  return d.dashboard as ConsoleDashboard;
});

export const fetchTemplates = createAsyncThunk<ConsoleTemplate[], void>('console/fetchTemplates', async (_, { rejectWithValue }) => {
  const res = await fetch(API_ENDPOINTS.CONSOLE_TEMPLATES, { headers: getAuthHeaders() });
  const d = await res.json();
  if (!res.ok) return rejectWithValue(d.error || 'Failed');
  return d.templates as ConsoleTemplate[];
});

export const createDashboard = createAsyncThunk(
  'console/createDashboard',
  async (payload: { name: string; description?: string; icon?: string; color?: string; deviceRef: DeviceRef; templateId?: string }, { rejectWithValue }) => {
    const res = await fetch(API_ENDPOINTS.CONSOLE_DASHBOARDS, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (!res.ok) return rejectWithValue(d.error || 'Failed');
    return d.dashboard as ConsoleDashboard;
  }
);

export const updateDashboardMeta = createAsyncThunk(
  'console/updateDashboardMeta',
  async ({ id, fields }: { id: string; fields: Partial<Pick<ConsoleDashboard, 'name' | 'description' | 'icon' | 'color'>> }, { rejectWithValue }) => {
    const res = await fetch(API_ENDPOINTS.CONSOLE_DASHBOARD(id), {
      method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(fields),
    });
    const d = await res.json();
    if (!res.ok) return rejectWithValue(d.error || 'Failed');
    return d.dashboard as ConsoleDashboard;
  }
);

export const saveDashboardLayout = createAsyncThunk(
  'console/saveDashboardLayout',
  async ({ id, widgets }: { id: string; widgets: ConsoleWidget[] }, { rejectWithValue }) => {
    const res = await fetch(API_ENDPOINTS.CONSOLE_DASHBOARD_LAYOUT(id), {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ widgets }),
    });
    const d = await res.json();
    if (!res.ok) return rejectWithValue(d.error || 'Failed');
    return d.dashboard as ConsoleDashboard;
  }
);

export const addWidget = createAsyncThunk(
  'console/addWidget',
  async ({ dashboardId, widget }: { dashboardId: string; widget: Omit<ConsoleWidget, 'widgetId'> }, { rejectWithValue }) => {
    const res = await fetch(API_ENDPOINTS.CONSOLE_DASHBOARD_WIDGETS(dashboardId), {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(widget),
    });
    const d = await res.json();
    if (!res.ok) return rejectWithValue(d.error || 'Failed');
    return { dashboard: d.dashboard as ConsoleDashboard, widgetId: d.widgetId as string };
  }
);

export const updateWidget = createAsyncThunk(
  'console/updateWidget',
  async ({ dashboardId, widgetId, fields }: { dashboardId: string; widgetId: string; fields: Partial<ConsoleWidget> }, { rejectWithValue }) => {
    const res = await fetch(API_ENDPOINTS.CONSOLE_DASHBOARD_WIDGET(dashboardId, widgetId), {
      method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(fields),
    });
    const d = await res.json();
    if (!res.ok) return rejectWithValue(d.error || 'Failed');
    return d.dashboard as ConsoleDashboard;
  }
);

export const deleteWidget = createAsyncThunk(
  'console/deleteWidget',
  async ({ dashboardId, widgetId }: { dashboardId: string; widgetId: string }, { rejectWithValue }) => {
    const res = await fetch(API_ENDPOINTS.CONSOLE_DASHBOARD_WIDGET(dashboardId, widgetId), {
      method: 'DELETE', headers: getAuthHeaders(),
    });
    const d = await res.json();
    if (!res.ok) return rejectWithValue(d.error || 'Failed');
    return d.dashboard as ConsoleDashboard;
  }
);

export const deleteDashboard = createAsyncThunk(
  'console/deleteDashboard',
  async (id: string, { rejectWithValue }) => {
    const res = await fetch(API_ENDPOINTS.CONSOLE_DASHBOARD(id), {
      method: 'DELETE', headers: getAuthHeaders(),
    });
    const d = await res.json();
    if (!res.ok) return rejectWithValue(d.error || 'Failed');
    return id;
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const initialState: ConsoleState = {
  dashboards: [],
  activeDashboard: null,
  templates: [],
  widgetValues: {},
  isEditMode: false,
  editingWidgetId: null,
  loading: false,
  saving: false,
  error: null,
};

const consoleSlice = createSlice({
  name: 'console',
  initialState,
  reducers: {
    setEditMode(state, action: PayloadAction<boolean>) {
      state.isEditMode = action.payload;
      if (!action.payload) state.editingWidgetId = null;
    },
    setEditingWidget(state, action: PayloadAction<string | null>) {
      state.editingWidgetId = action.payload;
    },
    clearWidgetValues(state) {
      state.widgetValues = {};
    },
    updateWidgetLayout(state, action: PayloadAction<ConsoleWidget[]>) {
      if (state.activeDashboard) {
        state.activeDashboard.widgets = action.payload;
      }
    },
    setWidgetValue(state, action: PayloadAction<{
      widgetId: string;
      rawValue: unknown;
      displayValue: string | number;
      timestamp: number;
    }>) {
      const { widgetId, rawValue, displayValue, timestamp } = action.payload;
      const existing = state.widgetValues[widgetId];

      // Find widget to determine type and chartMaxPoints
      const widget = state.activeDashboard?.widgets.find(w => w.widgetId === widgetId);
      const isChart = widget?.type === 'chart';
      const isTerminal = widget?.type === 'terminal';
      const maxPoints = widget?.chartMaxPoints ?? 50;

      const numericValue = typeof displayValue === 'number' ? displayValue : parseFloat(String(displayValue));
      const newHistoryEntry = { value: isNaN(numericValue) ? 0 : numericValue, timestamp };

      if (!existing) {
        state.widgetValues[widgetId] = {
          rawValue,
          displayValue,
          timestamp,
          history: [newHistoryEntry],
        };
      } else if (isChart || isTerminal) {
        const newHistory = [...existing.history, newHistoryEntry];
        const maxLen = isTerminal ? 100 : maxPoints;
        state.widgetValues[widgetId] = {
          rawValue,
          displayValue,
          timestamp,
          history: newHistory.length > maxLen ? newHistory.slice(-maxLen) : newHistory,
        };
      } else {
        state.widgetValues[widgetId] = {
          rawValue,
          displayValue,
          timestamp,
          history: [...existing.history.slice(-2), newHistoryEntry],
        };
      }
    },
    clearActiveDashboard(state) {
      state.activeDashboard = null;
      state.isEditMode = false;
      state.editingWidgetId = null;
    },
  },
  extraReducers: builder => {
    // fetchDashboards
    builder
      .addCase(fetchDashboards.pending, s => { s.loading = true; s.error = null; })
      .addCase(fetchDashboards.fulfilled, (s, a) => { s.loading = false; s.dashboards = a.payload; })
      .addCase(fetchDashboards.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; });

    // fetchDashboard
    builder
      .addCase(fetchDashboard.pending, s => { s.loading = true; s.error = null; })
      .addCase(fetchDashboard.fulfilled, (s, a) => { s.loading = false; s.activeDashboard = a.payload; })
      .addCase(fetchDashboard.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; });

    // fetchTemplates
    builder.addCase(fetchTemplates.fulfilled, (s, a) => { s.templates = a.payload; });

    // createDashboard
    builder
      .addCase(createDashboard.pending, s => { s.saving = true; })
      .addCase(createDashboard.fulfilled, (s, a) => { s.saving = false; s.dashboards.unshift(a.payload); })
      .addCase(createDashboard.rejected, (s, a) => { s.saving = false; s.error = a.payload as string; });

    // updateDashboardMeta
    builder.addCase(updateDashboardMeta.fulfilled, (s, a) => {
      const idx = s.dashboards.findIndex(d => d._id === a.payload._id);
      if (idx !== -1) s.dashboards[idx] = a.payload;
      if (s.activeDashboard?._id === a.payload._id) {
        s.activeDashboard = { ...s.activeDashboard, ...a.payload };
      }
    });

    // saveDashboardLayout
    builder
      .addCase(saveDashboardLayout.pending, s => { s.saving = true; })
      .addCase(saveDashboardLayout.fulfilled, (s, a) => {
        s.saving = false;
        s.activeDashboard = a.payload;
        const idx = s.dashboards.findIndex(d => d._id === a.payload._id);
        if (idx !== -1) s.dashboards[idx] = a.payload;
      })
      .addCase(saveDashboardLayout.rejected, (s, a) => { s.saving = false; s.error = a.payload as string; });

    // addWidget
    builder.addCase(addWidget.fulfilled, (s, a) => {
      s.activeDashboard = a.payload.dashboard;
      s.editingWidgetId = a.payload.widgetId;
    });

    // updateWidget
    builder.addCase(updateWidget.fulfilled, (s, a) => {
      if (s.activeDashboard?._id === a.payload._id) s.activeDashboard = a.payload;
    });

    // deleteWidget
    builder.addCase(deleteWidget.fulfilled, (s, a) => {
      if (s.activeDashboard?._id === a.payload._id) s.activeDashboard = a.payload;
      if (s.editingWidgetId) s.editingWidgetId = null;
    });

    // deleteDashboard
    builder.addCase(deleteDashboard.fulfilled, (s, a) => {
      s.dashboards = s.dashboards.filter(d => d._id !== a.payload);
      if (s.activeDashboard?._id === a.payload) s.activeDashboard = null;
    });
  },
});

export const {
  setEditMode, setEditingWidget, clearWidgetValues,
  updateWidgetLayout, setWidgetValue, clearActiveDashboard,
} = consoleSlice.actions;

export default consoleSlice.reducer;
