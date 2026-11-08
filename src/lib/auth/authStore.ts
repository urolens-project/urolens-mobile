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

/**
 * @deprecated Existing screens read the whole store via this hook
 * (`const { username } = useAuthStore()`), which re-renders on any auth-state change.
 * New code should prefer the narrow selector hooks below (`useAuthRole`,
 * `useIsAuthenticated`, `useUsername`, `useAuthActions`) or `authStoreApi` for
 * non-React access. Left exported as-is because it's still relied on across
 * app/ routes and feature hooks.
 */
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

/** @description Read-only: whether a user is currently signed in. */
export const useIsAuthenticated = (): boolean => useAuthStore((s) => s.isAuthenticated);

/** @description Read-only: current user's id, or null if signed out. */
export const useUserId = (): string | null => useAuthStore((s) => s.userId);

/** @description Read-only: current user's role, or null if signed out. */
export const useAuthRole = (): UserRole | null => useAuthStore((s) => s.role);

/** @description Read-only: current user's username, or null if signed out. */
export const useUsername = (): string | null => useAuthStore((s) => s.username);

/** @description Read-only: whether the initial auth check is still in flight. */
export const useIsAuthLoading = (): boolean => useAuthStore((s) => s.isLoading);

/** @description Write actions, stable across renders. */
export const useAuthActions = (): Pick<
  AuthState,
  'setAuthenticated' | 'setLoading' | 'clearAuth'
> => ({
  setAuthenticated: useAuthStore((s) => s.setAuthenticated),
  setLoading: useAuthStore((s) => s.setLoading),
  clearAuth: useAuthStore((s) => s.clearAuth),
});

/** @description Non-React access for interceptors and sync code only. */
export const authStoreApi = {
  clearAuth: (): void => useAuthStore.getState().clearAuth(),
  getUserId: (): string | null => useAuthStore.getState().userId,
};
