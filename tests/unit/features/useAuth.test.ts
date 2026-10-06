import { renderHook, act } from '@testing-library/react-native';
import { useAuth } from '@features/auth/hooks/useAuth';
import { authApi } from '@features/auth/api/authApi';
import { tokenStorage } from '@lib/auth/tokenStorage';
import { claimLocalDataFor } from '@db/sync/claimLocalData';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('@features/auth/api/authApi', () => ({
  authApi: { login: jest.fn(), logout: jest.fn() },
}));
jest.mock('@lib/auth/tokenStorage', () => ({
  tokenStorage: {
    clearAll: jest.fn().mockResolvedValue(undefined),
    setSessionOnly: jest.fn(),
    saveToken: jest.fn().mockResolvedValue(undefined),
    saveUserInfo: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@db/sync/claimLocalData', () => ({
  claimLocalDataFor: jest.fn().mockResolvedValue(undefined),
}));

const loginMock = authApi.login as jest.Mock;
const claimMock = claimLocalDataFor as jest.Mock;

const tokenResponse = { accessToken: 'jwt', tokenType: 'bearer', role: 'MEDTECH', userId: 'u1' };

beforeEach(() => jest.clearAllMocks());

describe('useAuth.login', () => {
  it('persists the session when keepLoggedIn is true', async () => {
    loginMock.mockResolvedValue(tokenResponse);
    const { result } = renderHook(() => useAuth());
    await act(() => result.current.login('medtech01', 'pw', true));
    expect(tokenStorage.setSessionOnly).toHaveBeenCalledWith(false);
    expect(tokenStorage.saveToken).toHaveBeenCalledWith('jwt');
    expect(router.replace).toHaveBeenCalled();
  });

  it('keeps the session in memory only when keepLoggedIn is false or omitted', async () => {
    loginMock.mockResolvedValue(tokenResponse);
    const { result } = renderHook(() => useAuth());
    await act(() => result.current.login('medtech01', 'pw'));
    expect(tokenStorage.setSessionOnly).toHaveBeenCalledWith(true);
  });

  it.each([
    ['ACCOUNT_LOCKED', 'Your account is locked. Contact an administrator.'],
    ['ACCOUNT_INACTIVE', 'Your account is inactive. Contact an administrator.'],
    ['INVALID_CREDENTIALS', 'Invalid username or password.'],
    ['NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.'],
    ['TIMEOUT', 'The server took too long to respond. Please try again.'],
    ['SOMETHING_ELSE', 'Login failed. Please try again.'],
  ])('maps %s to a specific message', async (code, message) => {
    loginMock.mockRejectedValue({ code, message: 'x' });
    const { result } = renderHook(() => useAuth());
    await act(() => result.current.login('medtech01', 'pw'));
    expect(result.current.error).toBe(message);
    expect(tokenStorage.saveToken).not.toHaveBeenCalled();
  });

  it('rejects empty credentials without calling the API', async () => {
    const { result } = renderHook(() => useAuth());
    await act(() => result.current.login('', ''));
    expect(result.current.error).toBe('Username and password are required.');
    expect(loginMock).not.toHaveBeenCalled();
  });

  it.each([500, 502, 503])(
    'reports HTTP %s as a server failure without saving a session',
    async (status): Promise<void> => {
      loginMock.mockRejectedValue({
        code: 'UNKNOWN_ERROR',
        status,
        message: 'Internal Server Error',
      });
      const { result } = renderHook(() => useAuth());

      await act(() => result.current.login('medtech01', 'pw'));

      expect(result.current.error).toBe(
        'The server could not complete login. Please try again later.',
      );
      expect(tokenStorage.clearAll).not.toHaveBeenCalled();
      expect(tokenStorage.saveToken).not.toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalled();
      expect(result.current.isSubmitting).toBe(false);
    },
  );
});

// Logout only clears the session, so on a shared phone the previous MedTech's data is
// still in the local database when the next one logs in.
describe("useAuth.login and the previous user's local data", () => {
  it('claims the local data for the user who logged in, before saving the session or showing anything', async () => {
    const order: string[] = [];
    loginMock.mockResolvedValue(tokenResponse);
    claimMock.mockImplementation(async () => {
      order.push('claim');
    });
    (tokenStorage.saveToken as jest.Mock).mockImplementation(async () => {
      order.push('saveToken');
    });
    (router.replace as jest.Mock).mockImplementation(() => {
      order.push('navigate');
    });
    const { result } = renderHook(() => useAuth());

    await act(() => result.current.login('medtech01', 'pw'));

    expect(claimMock).toHaveBeenCalledWith('u1');
    expect(order).toEqual(['claim', 'saveToken', 'navigate']);
  });

  it('does not log in when the local data could not be made safe', async () => {
    loginMock.mockResolvedValue(tokenResponse);
    claimMock.mockRejectedValue(new Error('database reset failed'));
    const { result } = renderHook(() => useAuth());

    await act(() => result.current.login('medtech01', 'pw'));

    expect(result.current.error).toBe('Login failed. Please try again.');
    expect(tokenStorage.saveToken).not.toHaveBeenCalled();
    expect(tokenStorage.saveUserInfo).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('touches no local data when the login itself fails', async () => {
    loginMock.mockRejectedValue({ code: 'INVALID_CREDENTIALS', message: 'x' });
    const { result } = renderHook(() => useAuth());

    await act(() => result.current.login('medtech01', 'wrong'));

    expect(claimMock).not.toHaveBeenCalled();
  });
});
