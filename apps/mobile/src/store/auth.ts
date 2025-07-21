import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createApiClient } from '@field-tracker/api-client';

interface AuthUser {
  type: 'worker';
  workerId: number;
  employeeId: string;
  name: string;
  deviceId: string;
}

interface AuthState {
  // State
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (employeeId: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  clearError: () => void;
}

const API_BASE_URL = __DEV__ ? 'http://localhost:3000' : 'https://your-server.com';

const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
});

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  user: null,
  token: null,
  isLoading: false,
  error: null,

  // Actions
  login: async (employeeId: string, pin: string) => {
    set({ isLoading: true, error: null });

    try {
      // Generate device ID if not exists
      let deviceId = await AsyncStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('deviceId', deviceId);
      }

      // Call login API
      const response = await fetch(`${API_BASE_URL}/api/auth/worker/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId,
          pin,
          deviceId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }

      const { token, user } = data.data;

      // Fetch worker details for display name
      const workerResponse = await fetch(`${API_BASE_URL}/api/workers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const workerData = await workerResponse.json();
      const worker = workerData.success 
        ? workerData.data.data.find((w: any) => w.id === user.workerId)
        : null;

      const authUser: AuthUser = {
        type: 'worker',
        workerId: user.workerId,
        employeeId,
        name: worker?.name || employeeId,
        deviceId,
      };

      // Store auth data
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('authUser', JSON.stringify(authUser));

      set({
        isAuthenticated: true,
        user: authUser,
        token,
        isLoading: false,
        error: null,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      set({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });

    try {
      // Clear stored data
      await AsyncStorage.multiRemove(['authToken', 'authUser']);

      set({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        error: null,
      });

    } catch (error) {
      console.error('Logout error:', error);
      // Even if AsyncStorage fails, clear the in-memory state
      set({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        error: null,
      });
    }
  },

  loadStoredAuth: async () => {
    set({ isLoading: true });

    try {
      const [token, userJson] = await AsyncStorage.multiGet(['authToken', 'authUser']);

      const storedToken = token[1];
      const storedUser = userJson[1] ? JSON.parse(userJson[1]) : null;

      if (storedToken && storedUser) {
        // Verify token is still valid
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          });

          if (response.ok) {
            set({
              isAuthenticated: true,
              user: storedUser,
              token: storedToken,
              isLoading: false,
              error: null,
            });
          } else {
            // Token is invalid, clear stored data
            await AsyncStorage.multiRemove(['authToken', 'authUser']);
            set({
              isAuthenticated: false,
              user: null,
              token: null,
              isLoading: false,
              error: null,
            });
          }
        } catch (error) {
          // Network error, use stored auth but mark as potentially stale
          set({
            isAuthenticated: true,
            user: storedUser,
            token: storedToken,
            isLoading: false,
            error: null,
          });
        }
      } else {
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          isLoading: false,
          error: null,
        });
      }

    } catch (error) {
      console.error('Load stored auth error:', error);
      set({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        error: 'Failed to load stored authentication',
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));