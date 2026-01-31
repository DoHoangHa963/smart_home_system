import type { User } from '@/types/user';

export interface AuthResponseData {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: AuthResponseData) => void;
  updateUser: (user: User) => void;
  logout: () => void;
}