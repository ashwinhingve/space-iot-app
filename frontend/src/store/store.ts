import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import deviceReducer from './slices/deviceSlice';
import manifoldReducer from './slices/manifoldSlice';
import dashboardReducer from './slices/dashboardSlice';
import ttnReducer from './slices/ttnSlice';
import networkDeviceReducer from './slices/networkDeviceSlice';
import configReducer from './slices/configSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    devices: deviceReducer,
    manifolds: manifoldReducer,
    dashboard: dashboardReducer,
    ttn: ttnReducer,
    networkDevices: networkDeviceReducer,
    config: configReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 