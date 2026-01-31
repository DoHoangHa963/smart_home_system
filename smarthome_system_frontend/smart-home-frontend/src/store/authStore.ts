import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthState, AuthResponseData } from '@/types/auth';
import type { User } from '@/types/user';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: (data: AuthResponseData) => {
        set({ 
          user: data.user, 
          accessToken: data.accessToken, 
          refreshToken: data.refreshToken,
          isAuthenticated: true 
        });
      },

      updateUser: (updatedUser: User) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedUser } : updatedUser
        }));
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