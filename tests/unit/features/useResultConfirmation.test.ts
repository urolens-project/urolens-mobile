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

// mobile-n8-todo-rem.md B4: a confirmed multi-field result's per-class averages must
// show as "<displayValue> per field", not a bare decimal mean, and must win over the
// unconfirmed raw aiFindings once the result has been through confirmation.
describe('useResultConfirmation — field_summary / particle_classes display', () => {
  function renderWithResult(result: Record<string, unknown>) {
    mockObserve.mockReturnValue({
      subscribe: (cb: Function) => {
        cb([result]);
        return { unsubscribe: jest.fn() };
      },
    });
    return renderHook(() => useResultConfirmation('result-123')).result;
  }

  it('shows field_summary averages as "<displayValue> per field", not the raw mean', () => {
    const result = renderWithResult({
      aiFindings: { RBC: 2.4 },
      particleClasses: {},
      fieldSummary: {
        fieldCount: 10,
        perClass: {
          RBC: {
            mean: 2.4,
            min: 0,
            max: 5,
            total: 24,
            fieldsSeen: 10,
            aiMean: 2.4,
            displayValue: '2',
            fieldsAboveNormal: [],
          },
        },
      },
    });

    expect(result.current.aiFindings).toEqual([
      { parameter: 'RBC', count: 2, isAnomalous: false, displayLabel: '2 per field' },
    ]);
  });

  it('flags a class as anomalous when field_summary marks fields above normal', () => {
    const result = renderWithResult({
      aiFindings: {},
      particleClasses: {},
      fieldSummary: {
        fieldCount: 10,
        perClass: {
          WBC: {
            mean: 6,
            min: 2,
            max: 10,
            total: 60,
            fieldsSeen: 10,
            aiMean: 6,
            displayValue: '6',
            fieldsAboveNormal: [3, 7],
          },
        },
      },
    });

    expect(result.current.aiFindings[0]?.isAnomalous).toBe(true);
  });

  it('falls back to particle_classes (the confirmed counts) when field_summary is null', () => {
    const result = renderWithResult({
      aiFindings: { RBC: 99 },
      particleClasses: { RBC: 3 },
      fieldSummary: null,
    });

    expect(result.current.aiFindings).toEqual([{ parameter: 'RBC', count: 3, isAnomalous: false }]);
  });

  it('falls back to aiFindings when neither field_summary nor particle_classes is available', () => {
    const result = renderWithResult({
      aiFindings: { RBC: 3 },
      particleClasses: {},
      fieldSummary: null,
    });

    expect(result.current.aiFindings).toEqual([{ parameter: 'RBC', count: 3, isAnomalous: false }]);
  });
});
