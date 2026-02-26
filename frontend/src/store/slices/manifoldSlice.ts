import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { API_ENDPOINTS } from '@/lib/config';

// Interfaces
interface Alarm {
  alarmId: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved?: boolean;
  resolvedAt?: string;
}

interface Schedule {
  scheduleId: string;
  enabled: boolean;
  cronExpression: string;
  action: 'ON' | 'OFF';
  duration: number;
  startAt?: string;
  endAt?: string;
  createdBy: string;
  createdAt: string;
}

interface Valve {
  _id: string;
  valveId: string;
  manifoldId: string;
  valveNumber: number;
  esp32PinNumber: number;
  specifications: {
    type: string;
    size: string;
    voltage: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
  };
  operationalData: {
    currentStatus: 'ON' | 'OFF' | 'FAULT';
    mode: 'AUTO' | 'MANUAL';
    lastCommand?: {
      action: 'ON' | 'OFF' | 'PULSE';
      timestamp: string;
      issuedBy: string;
    };
    cycleCount: number;
    totalRuntime: number;
    autoOffDurationSec: number;
  };
  position: {
    flowOrder: number;
    zone: string;
  };
  alarms: Alarm[];
  alarmConfig?: {
    enabled: boolean;
    ruleType: 'THRESHOLD' | 'STATUS';
    metric: 'pressure' | 'flow' | 'runtime' | 'status';
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    threshold?: number;
    triggerStatus?: 'FAULT' | 'OFF';
    severity?: 'INFO' | 'WARNING' | 'CRITICAL';
    notify: boolean;
  };
  schedules: Schedule[];
  createdAt: string;
  updatedAt: string;
}

interface Component {
  _id: string;
  componentId: string;
  manifoldId: string;
  componentType: string;
  specifications: {
    manufacturer: string;
    model: string;
    serialNumber: string;
    size: string;
    material: string;
    rating: string;
    hasDCLatch: boolean;
  };
  position: {
    flowOrder: number;
    section: 'INLET' | 'FILTER' | 'CONTROL' | 'VALVE_BANK' | 'OUTLET';
    description: string;
  };
  maintenance: {
    lastServiceDate?: string;
    nextServiceDate?: string;
    serviceInterval: number;
    history: Array<{
      date: string;
      technician: string;
      workPerformed: string;
      partsReplaced: string[];
      cost: number;
      notes: string;
    }>;
  };
}

interface Manifold {
  _id: string;
  manifoldId: string;
  name: string;
  esp32DeviceId: string | {
    _id: string;
    name: string;
    status: 'online' | 'offline';
    mqttTopic: string;
    lastSeen: string;
  };
  owner: string;
  specifications: {
    inletSize: string;
    outletSize: string;
    valveCount: number;
    maxPressure: number;
    maxFlowRate: number;
    manufacturer: string;
    model: string;
  };
  installationDetails: {
    location: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    installationDate: string;
    installedBy: string;
    notes: string;
  };
  status: 'Active' | 'Maintenance' | 'Offline' | 'Fault';
  metadata: {
    totalCycles: number;
    lastMaintenanceDate?: string;
    nextMaintenanceDate?: string;
    tags: string[];
  };
  createdAt: string;
  updatedAt: string;
}

// LoRaWAN device uplink sensor data
export interface DeviceSensorData {
  deviceId: string;       // matches manifold's esp32DeviceId (_id or string)
  receivedAt: string;     // ISO timestamp of uplink arrival
  pt1: number | null;     // Pressure Transducer 1 reading (converted to PSI)
  pt2: number | null;     // Pressure Transducer 2 reading (converted to PSI)
  battery: number | null; // Battery % or voltage (0–100 or V)
  solar: number | null;   // Solar input reading
  tamper: boolean;        // Tamper switch state
  rssi?: number | null;   // LoRa RSSI (dBm)
  snr?: number | null;    // LoRa SNR (dB)
}

interface ManifoldState {
  manifolds: Manifold[];
  selectedManifold: Manifold | null;
  valves: { [manifoldId: string]: Valve[] };
  components: { [manifoldId: string]: Component[] };
  sensorData: { [deviceId: string]: DeviceSensorData };
  loading: boolean;
  error: string | null;
}

const initialState: ManifoldState = {
  manifolds: [],
  selectedManifold: null,
  valves: {},
  components: {},
  sensorData: {},
  loading: false,
  error: null,
};

// Async Thunks
// Helper to get token from localStorage or Redux state
const getToken = (state: { auth: { token: string } }): string | null => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) return token;
  }
  return state.auth.token;
};

export const fetchManifolds = createAsyncThunk(
  'manifolds/fetchManifolds',
  async (params: { status?: string; page?: number; limit?: number } = {}, { getState }) => {
    const state = getState() as { auth: { token: string } };
    const token = getToken(state);
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const url = `${API_ENDPOINTS.MANIFOLDS}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch manifolds');
    }

    const data = await response.json();
    return data.manifolds || data;
  }
);

export const fetchManifoldDetail = createAsyncThunk(
  'manifolds/fetchManifoldDetail',
  async (manifoldId: string, { getState }) => {
    const state = getState() as { auth: { token: string } };
    const response = await fetch(API_ENDPOINTS.MANIFOLD_DETAIL(manifoldId), {
      headers: {
        Authorization: `Bearer ${getToken(state)}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch manifold details');
    }

    return response.json();
  }
);

export const createManifold = createAsyncThunk(
  'manifolds/createManifold',
  async (
    manifoldData: {
      name: string;
      esp32DeviceId: string;
      specifications?: Partial<Manifold['specifications']>;
      installationDetails?: Partial<Manifold['installationDetails']>;
      gpioPins?: number[];
    },
    { getState }
  ) => {
    const state = getState() as { auth: { token: string } };
    const response = await fetch(API_ENDPOINTS.MANIFOLDS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken(state)}`,
      },
      body: JSON.stringify(manifoldData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create manifold');
    }

    return response.json();
  }
);

export const updateManifold = createAsyncThunk(
  'manifolds/updateManifold',
  async (
    { manifoldId, data }: { manifoldId: string; data: Partial<Manifold> },
    { getState }
  ) => {
    const state = getState() as { auth: { token: string } };
    const response = await fetch(API_ENDPOINTS.MANIFOLD_DETAIL(manifoldId), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken(state)}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update manifold');
    }

    return response.json();
  }
);

export const deleteManifold = createAsyncThunk(
  'manifolds/deleteManifold',
  async (manifoldId: string, { getState }) => {
    const state = getState() as { auth: { token: string } };
    const response = await fetch(API_ENDPOINTS.MANIFOLD_DETAIL(manifoldId), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${getToken(state)}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete manifold');
    }

    return manifoldId;
  }
);

export const sendValveCommand = createAsyncThunk(
  'manifolds/sendValveCommand',
  async (
    { valveId, action }: { valveId: string; action: 'ON' | 'OFF' | 'PULSE' },
    { getState }
  ) => {
    const state = getState() as { auth: { token: string } };
    const response = await fetch(API_ENDPOINTS.VALVE_COMMAND(valveId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken(state)}`,
      },
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send valve command');
    }

    return { valveId, action, ...(await response.json()) };
  }
);

export const createSchedule = createAsyncThunk(
  'manifolds/createSchedule',
  async (
    {
      valveId,
      cronExpression,
      action,
      duration,
      enabled,
      startAt,
      endAt,
    }: {
      valveId: string;
      cronExpression: string;
      action: 'ON' | 'OFF';
      duration?: number;
      enabled?: boolean;
      startAt?: string;
      endAt?: string;
    },
    { getState }
  ) => {
    const state = getState() as { auth: { token: string } };
    const response = await fetch(API_ENDPOINTS.VALVE_SCHEDULES(valveId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken(state)}`,
      },
      body: JSON.stringify({ cronExpression, action, duration, enabled, startAt, endAt }),
    });

    if (!response.ok) {
      throw new Error('Failed to create schedule');
    }

    return { valveId, ...(await response.json()) };
  }
);

export const updateSchedule = createAsyncThunk(
  'manifolds/updateSchedule',
  async (
    {
      valveId,
      scheduleId,
      data,
    }: {
      valveId: string;
      scheduleId: string;
      data: Partial<Schedule>;
    },
    { getState }
  ) => {
    const state = getState() as { auth: { token: string } };
    const response = await fetch(API_ENDPOINTS.VALVE_SCHEDULE_DETAIL(valveId, scheduleId), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken(state)}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update schedule' }));
      throw new Error(error.message || 'Failed to update schedule');
    }

    const payload = await response.json();
    return { valveId, scheduleId, schedule: payload.schedule };
  }
);

export const deleteSchedule = createAsyncThunk(
  'manifolds/deleteSchedule',
  async (
    { valveId, scheduleId }: { valveId: string; scheduleId: string },
    { getState }
  ) => {
    const state = getState() as { auth: { token: string } };
    const response = await fetch(API_ENDPOINTS.VALVE_SCHEDULE_DETAIL(valveId, scheduleId), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${getToken(state)}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to delete schedule' }));
      throw new Error(error.message || 'Failed to delete schedule');
    }

    return { valveId, scheduleId };
  }
);

export const acknowledgeAlarm = createAsyncThunk(
  'manifolds/acknowledgeAlarm',
  async (
    { valveId, alarmId }: { valveId: string; alarmId: string },
    { getState }
  ) => {
    const state = getState() as { auth: { token: string } };
    const response = await fetch(API_ENDPOINTS.VALVE_ALARM_ACKNOWLEDGE(valveId, alarmId), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken(state)}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to acknowledge alarm');
    }

    return { valveId, alarmId };
  }
);

export const updateValveMode = createAsyncThunk(
  'manifolds/updateValveMode',
  async (
    { valveId, mode }: { valveId: string; mode: 'AUTO' | 'MANUAL' },
    { getState }
  ) => {
    const state = getState() as { auth: { token: string } };
    const response = await fetch(`${API_ENDPOINTS.VALVE_DETAIL(valveId)}/mode`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken(state)}`,
      },
      body: JSON.stringify({ mode }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update valve mode' }));
      throw new Error(error.message || 'Failed to update valve mode');
    }

    return { valveId, mode };
  }
);

export const updateValveAlarmConfig = createAsyncThunk(
  'manifolds/updateValveAlarmConfig',
  async (
    {
      valveId,
      alarmConfig,
    }: {
      valveId: string;
      alarmConfig: {
        enabled: boolean;
        ruleType: 'THRESHOLD' | 'STATUS';
        metric: 'pressure' | 'flow' | 'runtime' | 'status';
        operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
        threshold?: number;
        triggerStatus?: 'FAULT' | 'OFF';
        severity?: 'INFO' | 'WARNING' | 'CRITICAL';
        notify: boolean;
      };
    },
    { getState }
  ) => {
    const state = getState() as { auth: { token: string } };
    const response = await fetch(`${API_ENDPOINTS.VALVE_DETAIL(valveId)}/alarm-config`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken(state)}`,
      },
      body: JSON.stringify(alarmConfig),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update valve alarm config' }));
      throw new Error(error.message || 'Failed to update valve alarm config');
    }

    const data = await response.json();
    return { valveId, alarmConfig: data.alarmConfig || alarmConfig };
  }
);

export const updateValveTimer = createAsyncThunk(
  'manifolds/updateValveTimer',
  async (
    { valveId, autoOffDurationSec }: { valveId: string; autoOffDurationSec: number },
    { getState }
  ) => {
    const state = getState() as { auth: { token: string } };
    const response = await fetch(`${API_ENDPOINTS.VALVE_DETAIL(valveId)}/timer`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken(state)}`,
      },
      body: JSON.stringify({ autoOffDurationSec }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update valve timer' }));
      throw new Error(error.message || 'Failed to update valve timer');
    }

    return { valveId, autoOffDurationSec };
  }
);

export const resolveAlarm = createAsyncThunk(
  'manifolds/resolveAlarm',
  async (
    { valveId, alarmId }: { valveId: string; alarmId: string },
    { getState }
  ) => {
    const state = getState() as { auth: { token: string } };
    // Best-effort call — backend may not support this endpoint yet
    try {
      await fetch(API_ENDPOINTS.VALVE_ALARM_RESOLVE(valveId, alarmId), {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken(state)}` },
      });
    } catch {
      // Optimistic UI update regardless
    }
    return { valveId, alarmId };
  }
);

export const updateValve = createAsyncThunk(
  'manifolds/updateValve',
  async (
    { valveId, data }: { valveId: string; data: Record<string, unknown> },
    { getState }
  ) => {
    const state = getState() as { auth: { token: string } };
    const response = await fetch(API_ENDPOINTS.VALVE_DETAIL(valveId), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken(state)}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update valve' }));
      throw new Error(error.message || 'Failed to update valve');
    }

    const result = await response.json();
    return { valveId, valve: result.valve || result };
  }
);

const manifoldSlice = createSlice({
  name: 'manifolds',
  initialState,
  reducers: {
    setSelectedManifold: (state, action) => {
      state.selectedManifold = action.payload;
    },
    updateValveStatus: (state, action) => {
      const { manifoldId, valves: valveUpdates } = action.payload;
      const manifoldKey =
        Object.keys(state.valves).find((key) => {
          const manifold = state.manifolds.find((m) => m._id === key);
          return manifold?.manifoldId === manifoldId;
        }) || manifoldId;

      // Update valves in state
      if (state.valves[manifoldKey]) {
        valveUpdates.forEach((update: { valveNumber: number; status: 'ON' | 'OFF' | 'FAULT' }) => {
          const valve = state.valves[manifoldKey].find(
            (v) => v.valveNumber === update.valveNumber
          );
          if (valve) {
            valve.operationalData.currentStatus = update.status;
          }
        });
      }

      // Update selected manifold if it matches
      if (
        state.selectedManifold &&
        state.selectedManifold.manifoldId === manifoldId
      ) {
        // Trigger re-render by updating timestamp
        state.selectedManifold.updatedAt = new Date().toISOString();
      }
    },
    updateManifoldStatus: (state, action) => {
      const { manifoldId, status } = action.payload;
      const manifold = state.manifolds.find((m) => m.manifoldId === manifoldId);
      if (manifold) {
        manifold.status = status;
      }
      if (
        state.selectedManifold &&
        state.selectedManifold.manifoldId === manifoldId
      ) {
        state.selectedManifold.status = status;
      }
    },
    commandAcknowledged: (state, action) => {
      const { commandId, manifoldId } = action.payload;
      // Could track command acknowledgments if needed
      console.log(`Command ${commandId} acknowledged for manifold ${manifoldId}`);
    },
    updateDeviceSensorData: (state, action: PayloadAction<DeviceSensorData>) => {
      state.sensorData[action.payload.deviceId] = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Manifolds
      .addCase(fetchManifolds.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchManifolds.fulfilled, (state, action) => {
        state.loading = false;
        state.manifolds = action.payload;
      })
      .addCase(fetchManifolds.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch manifolds';
      })

      // Fetch Manifold Detail
      .addCase(fetchManifoldDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchManifoldDetail.fulfilled, (state, action) => {
        state.loading = false;
        const { manifold, valves, components } = action.payload;

        state.selectedManifold = manifold;

        // Store valves and components indexed by manifold ID
        if (valves) {
          state.valves[manifold._id] = valves;
        }
        if (components) {
          state.components[manifold._id] = components;
        }

        // Update manifold in list if it exists
        const index = state.manifolds.findIndex((m) => m._id === manifold._id);
        if (index !== -1) {
          state.manifolds[index] = manifold;
        } else {
          state.manifolds.push(manifold);
        }
      })
      .addCase(fetchManifoldDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch manifold details';
      })

      // Create Manifold
      .addCase(createManifold.fulfilled, (state, action) => {
        const { manifold, valves } = action.payload;
        state.manifolds.push(manifold);

        // Add created valves to state
        if (valves) {
          state.valves[manifold._id] = valves;
        }
      })
      .addCase(createManifold.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to create manifold';
      })

      // Update Manifold
      .addCase(updateManifold.fulfilled, (state, action) => {
        const { manifold } = action.payload;
        const index = state.manifolds.findIndex((m) => m._id === manifold._id);
        if (index !== -1) {
          state.manifolds[index] = manifold;
        }
        if (state.selectedManifold && state.selectedManifold._id === manifold._id) {
          state.selectedManifold = manifold;
        }
      })

      // Delete Manifold
      .addCase(deleteManifold.fulfilled, (state, action) => {
        const manifoldId = action.payload;
        state.manifolds = state.manifolds.filter((m) => m._id !== manifoldId);

        // Clean up valves and components
        delete state.valves[manifoldId];
        delete state.components[manifoldId];

        if (state.selectedManifold && state.selectedManifold._id === manifoldId) {
          state.selectedManifold = null;
        }
      })

      // Send Valve Command
      .addCase(sendValveCommand.pending, (state) => {
        state.error = null;
      })
      .addCase(sendValveCommand.fulfilled, (state, action) => {
        const { valveId, action: valveAction } = action.payload;

        Object.values(state.valves).forEach((valveList) => {
          const valve = valveList.find((v) => v._id === valveId);
          if (valve) {
            // PULSE: firmware-timed momentary relay — only track cycle count
            // ON / OFF: persistent state change
            if (valveAction !== 'PULSE') {
              valve.operationalData.currentStatus = valveAction as 'ON' | 'OFF';
            }
            valve.operationalData.cycleCount += 1;
          }
        });
      })
      .addCase(sendValveCommand.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to send valve command';
      })

      // Create Schedule
      .addCase(createSchedule.fulfilled, (state, action) => {
        const { valveId, schedule } = action.payload;

        // Add schedule to valve
        Object.values(state.valves).forEach((valveList) => {
          const valve = valveList.find((v) => v._id === valveId);
          if (valve && schedule) {
            valve.schedules.push(schedule);
          }
        });
      })
      .addCase(updateSchedule.fulfilled, (state, action) => {
        const { valveId, scheduleId, schedule } = action.payload;
        Object.values(state.valves).forEach((valveList) => {
          const valve = valveList.find((v) => v._id === valveId);
          if (!valve) return;
          const idx = valve.schedules.findIndex((s) => s.scheduleId === scheduleId);
          if (idx !== -1 && schedule) {
            valve.schedules[idx] = schedule;
          }
        });
      })
      .addCase(deleteSchedule.fulfilled, (state, action) => {
        const { valveId, scheduleId } = action.payload;
        Object.values(state.valves).forEach((valveList) => {
          const valve = valveList.find((v) => v._id === valveId);
          if (!valve) return;
          valve.schedules = valve.schedules.filter((s) => s.scheduleId !== scheduleId);
        });
      })

      // Acknowledge Alarm
      .addCase(acknowledgeAlarm.fulfilled, (state, action) => {
        const { valveId, alarmId } = action.payload;

        // Mark alarm as acknowledged
        Object.values(state.valves).forEach((valveList) => {
          const valve = valveList.find((v) => v._id === valveId);
          if (valve) {
            const alarm = valve.alarms.find((a) => a.alarmId === alarmId);
            if (alarm) {
              alarm.acknowledged = true;
              alarm.acknowledgedAt = new Date().toISOString();
            }
          }
        });
      })
      // Update valve mode
      .addCase(updateValveMode.fulfilled, (state, action) => {
        const { valveId, mode } = action.payload;
        Object.values(state.valves).forEach((valveList) => {
          const valve = valveList.find((v) => v._id === valveId);
          if (valve) {
            valve.operationalData.mode = mode;
          }
        });
      })
      // Update valve alarm config
      .addCase(updateValveAlarmConfig.fulfilled, (state, action) => {
        const { valveId, alarmConfig } = action.payload;
        Object.values(state.valves).forEach((valveList) => {
          const valve = valveList.find((v) => v._id === valveId);
          if (valve) {
            valve.alarmConfig = alarmConfig;
          }
        });
      })
      // Update valve timer
      .addCase(updateValveTimer.fulfilled, (state, action) => {
        const { valveId, autoOffDurationSec } = action.payload;
        Object.values(state.valves).forEach((valveList) => {
          const valve = valveList.find((v) => v._id === valveId);
          if (valve) {
            valve.operationalData.autoOffDurationSec = autoOffDurationSec;
          }
        });
      })
      // Resolve alarm
      .addCase(resolveAlarm.fulfilled, (state, action) => {
        const { valveId, alarmId } = action.payload;
        Object.values(state.valves).forEach((valveList) => {
          const valve = valveList.find((v) => v._id === valveId);
          if (valve) {
            const alarm = valve.alarms.find((a) => a.alarmId === alarmId);
            if (alarm) {
              alarm.resolved = true;
              alarm.resolvedAt = new Date().toISOString();
              alarm.acknowledged = true;
              if (!alarm.acknowledgedAt) {
                alarm.acknowledgedAt = new Date().toISOString();
              }
            }
          }
        });
      })
      // Update valve (general config)
      .addCase(updateValve.fulfilled, (state, action) => {
        const { valveId, valve: updatedData } = action.payload;
        Object.values(state.valves).forEach((valveList) => {
          const idx = valveList.findIndex((v) => v._id === valveId);
          if (idx !== -1 && updatedData) {
            valveList[idx] = { ...valveList[idx], ...updatedData };
          }
        });
      })
      .addCase(updateValve.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update valve';
      });
  },
});

export const {
  setSelectedManifold,
  updateValveStatus,
  updateManifoldStatus,
  commandAcknowledged,
  updateDeviceSensorData,
  clearError,
} = manifoldSlice.actions;

export default manifoldSlice.reducer;
