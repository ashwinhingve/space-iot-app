import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export type SystemMode = 'single' | 'team';

interface ConfigState {
  mode: SystemMode;
  companyName: string;
  loading: boolean;
}

const initialState: ConfigState = {
  mode: 'team',
  companyName: '',
  loading: false,
};

export const fetchSystemConfig = createAsyncThunk(
  'config/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiBase}/api/admin/config`);
      const data = await res.json();
      if (!res.ok) return rejectWithValue('Failed');
      return data.config as { mode: SystemMode; companyName?: string };
    } catch {
      return rejectWithValue('Network error');
    }
  }
);

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setMode: (state, action: { payload: SystemMode }) => {
      state.mode = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchSystemConfig.pending, state => { state.loading = true; })
      .addCase(fetchSystemConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.mode = action.payload.mode;
        state.companyName = action.payload.companyName ?? '';
      })
      .addCase(fetchSystemConfig.rejected, state => { state.loading = false; });
  },
});

export const { setMode } = configSlice.actions;
export default configSlice.reducer;
