import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_ENDPOINTS } from '@/lib/config';

interface User {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  authProvider: 'local' | 'google';
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

// Safe localStorage access
const isBrowser = typeof window !== 'undefined';

const getStoredToken = (): string | null => {
  if (!isBrowser) return null;
  return localStorage.getItem('token');
};

const getStoredUser = (): User | null => {
  if (!isBrowser) return null;
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

const saveAuthData = (token: string, user: User) => {
  if (!isBrowser) return;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

const clearAuthData = () => {
  if (!isBrowser) return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Initialize with null to avoid hydration mismatches
// Auth will be restored from localStorage after client-side mount
const initialState: AuthState = {
  user: null,
  token: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

/**
 * Login with email and password
 */
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message || 'Login failed');
      }

      // Save to localStorage
      saveAuthData(data.token, data.user);

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Register new user
 */
export const register = createAsyncThunk(
  'auth/register',
  async (userData: { name: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(API_ENDPOINTS.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message || 'Registration failed');
      }

      // Save to localStorage
      saveAuthData(data.token, data.user);

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Google OAuth login - SECURE VERSION
 * Sends Google credential token to backend for verification
 */
export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async (googleData: { credential: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(API_ENDPOINTS.GOOGLE_AUTH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleData),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message || 'Google login failed');
      }

      // Save to localStorage
      saveAuthData(data.token, data.user);

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Get current user (for session persistence)
 */
export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(API_ENDPOINTS.ME, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        // Token is invalid (401/403) — clear storage and force re-login
        clearAuthData();
        return rejectWithValue('SESSION_EXPIRED');
      }

      // Update user in localStorage
      if (isBrowser && data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      return data;
    } catch {
      // Network/fetch error — backend may be temporarily unreachable.
      // Do NOT clear localStorage; the token is likely still valid.
      return rejectWithValue('NETWORK_ERROR');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      clearAuthData();
    },
    clearError: (state) => {
      state.error = null;
    },
    setAuthFromStorage: (state) => {
      // Restore auth from localStorage (for page refresh)
      const token = getStoredToken();
      const user = getStoredUser();
      if (token && user) {
        state.token = token;
        state.user = user;
        state.isAuthenticated = true;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Login failed';
        state.isAuthenticated = false;
      })
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Registration failed';
        state.isAuthenticated = false;
      })
      // Google Login
      .addCase(googleLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(googleLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Google login failed';
        state.isAuthenticated = false;
      })
      // Get Current User
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.loading = false;
        // Only clear auth state on real auth failures (expired/invalid token).
        // For network errors the token may still be valid — keep the user logged in.
        if (action.payload !== 'NETWORK_ERROR') {
          state.user = null;
          state.token = null;
          state.isAuthenticated = false;
        }
      });
  },
});

export const { logout, clearError, setAuthFromStorage } = authSlice.actions;
export default authSlice.reducer;
