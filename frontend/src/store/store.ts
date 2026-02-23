import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import deviceReducer from './slices/deviceSlice';
import manifoldReducer from './slices/manifoldSlice';
import dashboardReducer from './slices/dashboardSlice';
import ttnReducer from './slices/ttnSlice';
import networkDeviceReducer from './slices/networkDeviceSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    devices: deviceReducer,
    manifolds: manifoldReducer,
    dashboard: dashboardReducer,
    ttn: ttnReducer,
    networkDevices: networkDeviceReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 