import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthState, User } from '@/types/auth';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: (data: any) => {
        set({ 
          user: data.user, 
          accessToken: data.accessToken, 
          refreshToken: data.refreshToken,
          isAuthenticated: true 
        });
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        set({accessToken, refreshToken});
      },

      logout: () => {
        set({ 
          user: null, 
          accessToken: null, 
          refreshToken: null,
          isAuthenticated: false 
        });
        localStorage.removeItem('auth-storage');
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);