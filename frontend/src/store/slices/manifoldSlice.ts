import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
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
}

interface Schedule {
  scheduleId: string;
  enabled: boolean;
  cronExpression: string;
  action: 'ON' | 'OFF';
  duration: number;
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
      action: 'ON' | 'OFF';
      timestamp: string;
      issuedBy: string;
    };
    cycleCount: number;
    totalRuntime: number;
  };
  position: {
    flowOrder: number;
    zone: string;
  };
  alarms: Alarm[];
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

interface ManifoldState {
  manifolds: Manifold[];
  selectedManifold: Manifold | null;
  valves: { [manifoldId: string]: Valve[] };
  components: { [manifoldId: string]: Component[] };
  loading: boolean;
  error: string | null;
}

const initialState: ManifoldState = {
  manifolds: [],
  selectedManifold: null,
  valves: {},
  components: {},
  loading: false,
  error: null,
};

// Async Thunks
export const fetchManifolds = createAsyncThunk(
  'manifolds/fetchManifolds',
  async (params: { status?: string; page?: number; limit?: number } = {}, { getState }) => {
    const state = getState() as { auth: { token: string } };
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const url = `${API_ENDPOINTS.MANIFOLDS}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${state.auth.token}`,
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
        Authorization: `Bearer ${state.auth.token}`,
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
      specifications?: any;
      installationDetails?: any;
      gpioPins?: number[];
    },
    { getState }
  ) => {
    const state = getState() as { auth: { token: string } };
    const response = await fetch(API_ENDPOINTS.MANIFOLDS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.auth.token}`,
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
    { manifoldId, data }: { manifoldId: string; data: any },
    { getState }
  ) => {
    const state = getState() as { auth: { token: string } };
    const response = await fetch(API_ENDPOINTS.MANIFOLD_DETAIL(manifoldId), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.auth.token}`,
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
        Authorization: `Bearer ${state.auth.token}`,
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
    { valveId, action, duration }: { valveId: string; action: 'ON' | 'OFF'; duration?: number },
    { getState }
  ) => {
    const state = getState() as { auth: { token: string } };
    const response = await fetch(API_ENDPOINTS.VALVE_COMMAND(valveId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.auth.token}`,
      },
      body: JSON.stringify({ action, duration }),
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
    }: {
      valveId: string;
      cronExpression: string;
      action: 'ON' | 'OFF';
      duration?: number;
      enabled?: boolean;
    },
    { getState }
  ) => {
    const state = getState() as { auth: { token: string } };
    const response = await fetch(API_ENDPOINTS.VALVE_SCHEDULES(valveId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.auth.token}`,
      },
      body: JSON.stringify({ cronExpression, action, duration, enabled }),
    });

    if (!response.ok) {
      throw new Error('Failed to create schedule');
    }

    return { valveId, ...(await response.json()) };
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
        Authorization: `Bearer ${state.auth.token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to acknowledge alarm');
    }

    return { valveId, alarmId };
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

      // Update valves in state
      if (state.valves[manifoldId]) {
        valveUpdates.forEach((update: any) => {
          const valve = state.valves[manifoldId].find(
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

        // Optimistic update: Update valve status immediately
        Object.values(state.valves).forEach((valveList) => {
          const valve = valveList.find((v) => v._id === valveId);
          if (valve) {
            valve.operationalData.currentStatus = valveAction;
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
      });
  },
});

export const {
  setSelectedManifold,
  updateValveStatus,
  updateManifoldStatus,
  commandAcknowledged,
  clearError,
} = manifoldSlice.actions;

export default manifoldSlice.reducer;
