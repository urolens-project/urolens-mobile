// Path: urolens-mobile/tests/unit/features/useResultConfirmation.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useResultConfirmation } from '@features/result-confirmation/hooks/useResultConfirmation';
import { database } from '@db/database';

// --- Mocks ---
jest.mock('@db/database', () => ({
  database: {
    get: jest.fn(),
  },
}));

const mockObserve = jest.fn();
const mockQuery = jest.fn(() => ({ observeWithColumns: mockObserve }));

const mockResult = {
  serverId: 'result-123',
  status: 'PENDING_CONFIRM',
  aiFindingsJson: JSON.stringify({ rbc: 3, wbc: 12, bacteria: 1 }),
  smartDiagnosisJson: null,
  smartDiagnosisUnavailable: false,
  isSynced: true,
  get aiFindings() {
    return JSON.parse(this.aiFindingsJson);
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockResult.status = 'PENDING_CONFIRM';
  mockResult.aiFindingsJson = JSON.stringify({ rbc: 3, wbc: 12, bacteria: 1 });
  (database.get as jest.Mock).mockImplementation((table: string) => {
    if (table === 'analysis_results') return { query: mockQuery };
    return {};
  });
  mockObserve.mockReturnValue({
    subscribe: (cb: Function) => {
      cb([mockResult]);
      return { unsubscribe: jest.fn() };
    },
  });
});

describe('useResultConfirmation', () => {
  it('loads the result from WatermelonDB', () => {
    const { result } = renderHook(() => useResultConfirmation('result-123'));
    expect(result.current.result).toBe(mockResult);
    expect(result.current.isLoading).toBe(false);
  });

  it('re-renders when sync mutates the same model instance', () => {
    let emit!: (rows: (typeof mockResult)[]) => void;
    mockObserve.mockReturnValue({
      subscribe: (callback: typeof emit) => {
        emit = callback;
        callback([mockResult]);
        return { unsubscribe: jest.fn() };
      },
    });
    const { result } = renderHook(() => useResultConfirmation('result-123'));
    act(() => {
      mockResult.status = 'RETURNED_FOR_CORRECTION';
      mockResult.aiFindingsJson = JSON.stringify({ wbc: 8 });
      emit([mockResult]);
    });
    expect(result.current.result?.status).toBe('RETURNED_FOR_CORRECTION');
    expect(result.current.aiFindings).toEqual([{ parameter: 'wbc', count: 8, isAnomalous: true }]);
    expect(mockObserve).toHaveBeenCalledWith(
      expect.arrayContaining(['status', 'ai_findings_json']),
    );
  });

  it('derives aiFindings correctly with anomaly flags', () => {
    const { result } = renderHook(() => useResultConfirmation('result-123'));
    const findings = result.current.aiFindings;
    expect(findings).toHaveLength(3);
    expect(findings.find((f) => f.parameter === 'wbc')?.isAnomalous).toBe(true);
    expect(findings.find((f) => f.parameter === 'rbc')?.isAnomalous).toBe(false);
  });

  it('reports no result and stops loading when nothing matches', () => {
    mockObserve.mockReturnValue({
      subscribe: (cb: Function) => {
        cb([]);
        return { unsubscribe: jest.fn() };
      },
    });
    const { result } = renderHook(() => useResultConfirmation('missing-result'));
    expect(result.current.result).toBeNull();
    expect(result.current.aiFindings).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
