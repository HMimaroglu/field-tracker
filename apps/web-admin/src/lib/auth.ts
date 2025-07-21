import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { adminApi } from './api';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await adminApi.login(password);
          
          if (response.success) {
            set({ 
              isAuthenticated: true, 
              isLoading: false,
              error: null
            });
          } else {
            throw new Error(response.error || 'Login failed');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({ 
            isAuthenticated: false, 
            isLoading: false, 
            error: errorMessage 
          });
          throw error;
        }
      },

      logout: () => {
        adminApi.clearToken();
        set({ 
          isAuthenticated: false, 
          error: null 
        });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'admin-auth',
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);