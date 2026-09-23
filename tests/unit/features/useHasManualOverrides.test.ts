import { renderHook } from '@testing-library/react-native';
import { useHasManualOverrides } from '@features/manual-override/hooks/useHasManualOverrides';

const mockUnsubscribe = jest.fn();
const mockQuery = jest.fn();
let mockRecords: unknown[] = [];

jest.mock('@nozbe/watermelondb/hooks', () => ({
  useDatabase: () => ({
    get: () => ({
      query: (...args: unknown[]) => {
        mockQuery(...args);
        return {
          observe: () => ({
            subscribe: (cb: (records: unknown[]) => void) => {
              cb(mockRecords);
              return { unsubscribe: mockUnsubscribe };
            },
          }),
        };
      },
    }),
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockRecords = [];
});

describe('useHasManualOverrides', () => {
  it('is true when the result has at least one override', () => {
    mockRecords = [{ parameter: 'wbc', correctedValue: 5 }];
    const { result } = renderHook(() => useHasManualOverrides('srv-res-1'));
    expect(result.current).toBe(true);
  });

  it('is false when the result has none', () => {
    const { result } = renderHook(() => useHasManualOverrides('srv-res-1'));
    expect(result.current).toBe(false);
  });

  it('is false, and does not query, without a result id', () => {
    mockRecords = [{ parameter: 'wbc', correctedValue: 5 }];
    const { result } = renderHook(() => useHasManualOverrides(null));
    expect(result.current).toBe(false);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('stops watching when it unmounts', () => {
    const { unmount } = renderHook(() => useHasManualOverrides('srv-res-1'));
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
