import { create } from 'zustand';
import { UserRole } from '@app-types/enums';

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  role: UserRole | null;
  username: string | null;
  isLoading: boolean;
  setAuthenticated: (userId: string, role: UserRole, username: string) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  userId: null,
  role: null,
  username: null,
  isLoading: true,
  setAuthenticated: (userId, role, username) =>
    set({ isAuthenticated: true, userId, role, username, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  clearAuth: () =>
    set({ isAuthenticated: false, userId: null, role: null, username: null, isLoading: false }),
}));
