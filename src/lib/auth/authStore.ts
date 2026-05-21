import { create } from 'zustand';
import { UserRole } from '@app-types/enums';

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  role: UserRole | null;
  isLoading: boolean;
  setAuthenticated: (userId: string, role: UserRole) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  userId: null,
  role: null,
  isLoading: true,
  setAuthenticated: (userId, role) =>
    set({ isAuthenticated: true, userId, role, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  clearAuth: () =>
    set({ isAuthenticated: false, userId: null, role: null, isLoading: false }),
}));
