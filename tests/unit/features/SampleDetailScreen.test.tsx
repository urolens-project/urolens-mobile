import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import SampleDetailRoute from '../../../app/(medtech)/sample/[id]';
import { database } from '@db/database';
import { useConfirmAction } from '@features/result-confirmation/hooks/useConfirmAction';
import { startAnalysis } from '@features/queue/lib/startAnalysis';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
let mockParams: { id?: string; resultId?: string } = {};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => mockRouter,
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@db/database', () => ({ database: { get: jest.fn() } }));
jest.mock('@hooks/useNetworkStatus', () => ({ useNetworkStatus: () => ({ isOnline: true }) }));
jest.mock('@features/result-confirmation/hooks/useConfirmAction', () => ({
  useConfirmAction: jest.fn(),
}));
jest.mock('@features/queue/lib/startAnalysis', () => ({ startAnalysis: jest.fn() }));
jest.mock('@features/result-confirmation/components/ResultReviewScreen', () => ({
  ResultReviewScreen: () => require('react').createElement('Text', null, 'REVIEW_SCREEN'),
}));

// ── Fixtures ────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

const makeSpecimen = (over: Row = {}): Row => ({
  id: 'spec-1',
  serverId: 'srv-spec-1',
  sampleUid: 'SMP-1',
  patientName: 'x',
  patientUid: 'PT-1',
  testType: 'URINALYSIS_-_ROUTINE',
  status: 'ASSIGNED',
  priorityLevel: 'ROUTINE',
  receivedAt: '2026-09-20T04:30:00.000Z',
  medtechId: 'mt-1',
  rejectionReason: null,
  rejectionNote: null,
  rejectedAt: null,
  syncedAt: null,
  ...over,
});

const makeResult = (over: Row = {}): Row => ({
  id: 'res-local',
  serverId: 'srv-res-1',
  specimenId: 'srv-spec-1',
  imageId: 'img-1',
  status: 'PENDING_CONFIRM',
  aiFindings: { wbc: 12, rbc: 3 },
  smartDiagnosis: null,
  smartDiagnosisUnavailable: false,
  isSynced: true,
  confirmedAt: null,
  syncedAt: null,
  createdAt: 1,
  ...over,
});

const observable = <T,>(value: T) => ({
  subscribe: (cb: (v: T) => void) => {
    cb(value);
    return { unsubscribe: jest.fn() };
  },
});

interface DbSetup {
  // Keyed by local specimen id. `'pending'` never resolves; `null` means "not found".
  specimens?: Record<string, Row | 'pending' | null>;
  result?: Row | null;
  overrides?: { parameter: string; correctedValue: number }[];
  observeSpy?: jest.Mock;
}

function setupDb({
  specimens = { 'spec-1': makeSpecimen() },
  result = null,
  overrides = [],
  observeSpy,
}: DbSetup = {}) {
  (database.get as jest.Mock).mockImplementation((table: string) => {
    if (table === 'specimens') {
      return {
        find: jest.fn((id: string) => {
          const row = specimens[id];
          if (row === 'pending') return new Promise(() => {});
          if (!row) return Promise.reject(new Error('Record not found'));
          return Promise.resolve({
            ...row,
            observe: observeSpy ?? (() => observable(row)),
          });
        }),
      };
    }
    if (table === 'analysis_results') {
      return { query: () => ({ observeWithColumns: () => observable(result ? [result] : []) }) };
    }
    if (table === 'manual_overrides') {
      return { query: () => ({ observeWithColumns: () => observable(overrides) }) };
    }
    throw new Error(`unexpected table ${table}`);
  });
}

async function openScreen(setup: DbSetup = {}, params = { id: 'spec-1' } as typeof mockParams) {
  setupDb(setup);
  mockParams = params;
  const view = render(<SampleDetailRoute />);
  await view.findByText('Sample Detail');
  return view;
}

const mockConfirm = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  (useConfirmAction as jest.Mock).mockReturnValue({
    confirmResult: mockConfirm,
    isConfirming: false,
    error: null,
  });
  (startAnalysis as jest.Mock).mockResolvedValue({ started: true });
});

// ── Bug 1: Begin Analysis ────────────────────────────────────────────────────

describe('Begin Analysis', () => {
  it('is offered for an assigned specimen with no result', async () => {
    const view = await openScreen();
    expect(view.getByText('Begin Analysis')).toBeTruthy();
  });

  it('is NOT offered for a rejected specimen — only its rejection is shown', async () => {
    const view = await openScreen({
      specimens: {
        'spec-1': makeSpecimen({
          status: 'REJECTED',
          rejectionReason: 'INSUFFICIENT_VOLUME',
          rejectedAt: '2026-09-20T05:00:00.000Z',
        }),
      },
    });

    expect(view.getByText('Specimen Rejected')).toBeTruthy();
    expect(view.queryByText('Begin Analysis')).toBeNull();
    expect(view.queryByText('Continue Analysis')).toBeNull();
    expect(view.queryByText('Reject Specimen')).toBeNull();
  });

  it('starts the analysis and opens capture', async () => {
    const view = await openScreen();
    fireEvent.press(view.getByText('Begin Analysis'));

    await waitFor(() => expect(mockRouter.push).toHaveBeenCalled());
    expect(startAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ specimenId: 'spec-1', serverId: 'srv-spec-1' }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(medtech)/capture',
      params: { specimenId: 'srv-spec-1', localSpecimenId: 'spec-1' },
    });
  });

  it('does not open capture when the server refuses, and says why', async () => {
    (startAnalysis as jest.Mock).mockResolvedValue({
      started: false,
      message: 'Specimen in status REJECTED cannot be started.',
    });
    const view = await openScreen();
    fireEvent.press(view.getByText('Begin Analysis'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Cannot Begin Analysis',
        'Specimen in status REJECTED cannot be started.',
      ),
    );
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('resumes an analysis already in progress without telling the server again', async () => {
    const view = await openScreen({
      specimens: { 'spec-1': makeSpecimen({ status: 'PROCESSING' }) },
    });

    fireEvent.press(view.getByText('Continue Analysis'));

    await waitFor(() => expect(mockRouter.push).toHaveBeenCalled());
    expect(startAnalysis).not.toHaveBeenCalled();
    expect(view.queryByText('Begin Analysis')).toBeNull();
  });
});

// ── Bug 2: Reject Specimen ───────────────────────────────────────────────────

describe('Reject Specimen', () => {
  it('is offered before there is a result', async () => {
    const view = await openScreen();
    expect(view.getByText('Reject Specimen')).toBeTruthy();
  });

  it("is offered while the result still awaits the MedTech's confirmation", async () => {
    const view = await openScreen({ result: makeResult({ status: 'PENDING_CONFIRM' }) });
    expect(view.getByText('Reject Specimen')).toBeTruthy();
  });

  it.each([
    ['confirmed (awaiting Supervisor)', 'PENDING_SUPERVISOR_APPROVAL'],
    ['returned for correction', 'RETURNED_FOR_CORRECTION'],
    ['escalated', 'CRITICAL_ESCALATED'],
    ['approved', 'APPROVED'],
    ['released', 'RELEASED'],
  ])('is NOT offered once the result is %s', async (_label, status) => {
    const view = await openScreen({ result: makeResult({ status }) });
    expect(view.queryByText('Reject Specimen')).toBeNull();
  });

  it('opens the reject screen for this specimen', async () => {
    const view = await openScreen();
    fireEvent.press(view.getByText('Reject Specimen'));
    expect(mockRouter.push).toHaveBeenCalledWith('/(medtech)/sample/reject/spec-1');
  });

  // A rejected specimen's result must never go on to the Supervisor.
  it('a rejected specimen cannot be confirmed or retaken, and says its result will not be sent', async () => {
    const view = await openScreen({
      specimens: { 'spec-1': makeSpecimen({ status: 'REJECTED' }) },
      result: makeResult({ status: 'PENDING_CONFIRM' }),
    });

    expect(view.queryByText('Confirm Result')).toBeNull();
    expect(view.queryByText('Retake Image')).toBeNull();
    expect(view.getByText(/will not be sent for supervisor approval/)).toBeTruthy();
  });
});

// ── Bug 3: error alerts ──────────────────────────────────────────────────────

describe('confirming a result', () => {
  it('alerts with the actual reason it failed, not a generic fallback', async () => {
    mockConfirm.mockResolvedValue({
      status: 'failed',
      message: "This specimen was rejected, so its result can't be confirmed.",
    });
    const view = await openScreen({ result: makeResult() });

    fireEvent.press(view.getByText('Confirm Result'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Confirmation Failed',
        "This specimen was rejected, so its result can't be confirmed.",
      ),
    );
  });

  it('does not alert when a double-tap is ignored because one is already running', async () => {
    mockConfirm.mockResolvedValue({ status: 'busy' });
    const view = await openScreen({ result: makeResult() });

    fireEvent.press(view.getByText('Confirm Result'));

    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('does not alert on success', async () => {
    mockConfirm.mockResolvedValue({ status: 'confirmed' });
    const view = await openScreen({ result: makeResult() });

    fireEvent.press(view.getByText('Confirm Result'));

    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});

// ── Bug 4: state when the screen is reused ───────────────────────────────────

describe('when the screen is re-used for another sample', () => {
  it('does not show the previous sample while the next one loads', async () => {
    const view = await openScreen(
      {
        specimens: {
          'spec-A': makeSpecimen({ id: 'spec-A', patientUid: 'PT-A' }),
          'spec-B': 'pending',
        },
      },
      { id: 'spec-A' },
    );
    expect(view.getAllByText('PT-A').length).toBeGreaterThan(0);

    mockParams = { id: 'spec-B' };
    view.rerender(<SampleDetailRoute />);

    expect(view.queryByText('PT-A')).toBeNull();
    expect(view.queryByText('Sample Detail')).toBeNull();
    expect(view.UNSAFE_root.findByType('ActivityIndicator' as never)).toBeTruthy();
  });

  it('does not leave "Sample not found" stuck after one missing sample', async () => {
    setupDb({
      specimens: {
        'spec-missing': null,
        'spec-B': makeSpecimen({ id: 'spec-B', patientUid: 'PT-B' }),
      },
    });
    mockParams = { id: 'spec-missing' };
    const view = render(<SampleDetailRoute />);
    await view.findByText('Sample not found.');

    mockParams = { id: 'spec-B' };
    view.rerender(<SampleDetailRoute />);

    await view.findByText('Sample Detail');
    expect(view.queryByText('Sample not found.')).toBeNull();
    expect(view.getAllByText('PT-B').length).toBeGreaterThan(0);
  });

  it('does not subscribe to a sample it was already closed on before it finished loading', async () => {
    let resolveFind: (model: Row) => void = () => {};
    const observeSpy = jest.fn(() => observable(makeSpecimen()));
    (database.get as jest.Mock).mockImplementation((table: string) =>
      table === 'specimens'
        ? {
            find: () =>
              new Promise<Row>((resolve) => {
                resolveFind = resolve;
              }),
          }
        : { query: () => ({ observeWithColumns: () => observable([]) }) },
    );
    mockParams = { id: 'spec-1' };
    const view = render(<SampleDetailRoute />);

    view.unmount();
    await act(async () => {
      resolveFind({ ...makeSpecimen(), observe: observeSpy });
    });

    expect(observeSpy).not.toHaveBeenCalled();
  });

  it('stops watching the sample when it closes', async () => {
    const unsubscribe = jest.fn();
    const observeSpy = jest.fn(() => ({
      subscribe: (cb: (v: Row) => void) => {
        cb(makeSpecimen());
        return { unsubscribe };
      },
    }));
    const view = await openScreen({ observeSpy });

    view.unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});

// ── Bug 5: retake and overrides ──────────────────────────────────────────────

describe('Retake Image', () => {
  it("warns before discarding the MedTech's overrides", async () => {
    const view = await openScreen({
      result: makeResult(),
      overrides: [{ parameter: 'wbc', correctedValue: 5 }],
    });

    fireEvent.press(view.getByText('Retake Image'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Discard Overrides?',
      expect.stringContaining('manual overrides will be removed'),
      expect.any(Array),
    );
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('goes straight to capture when there are no overrides', async () => {
    const view = await openScreen({ result: makeResult() });

    fireEvent.press(view.getByText('Retake Image'));

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(medtech)/capture',
      params: { specimenId: 'srv-spec-1', localSpecimenId: 'spec-1', existingImageId: 'img-1' },
    });
  });
});

// ── Bug 6: escalated results ─────────────────────────────────────────────────

describe('an escalated result', () => {
  it('says so, and offers the MedTech nothing to do', async () => {
    const view = await openScreen({ result: makeResult({ status: 'CRITICAL_ESCALATED' }) });

    expect(view.getAllByText('Critical / Escalated').length).toBeGreaterThan(0);
    expect(view.getByText(/escalated this result for urgent review/)).toBeTruthy();
    expect(view.queryByText('Reject Specimen')).toBeNull();
    expect(view.queryByText('Confirm Result')).toBeNull();
    expect(view.queryByText('Retake Image')).toBeNull();
  });
});

// ── Returned / status label ──────────────────────────────────────────────────

describe('a result returned for correction', () => {
  it('shows the banner and offers only Retake', async () => {
    const view = await openScreen({ result: makeResult({ status: 'RETURNED_FOR_CORRECTION' }) });

    expect(view.getByText(/The supervisor has returned this result/)).toBeTruthy();
    expect(view.getByText('Retake Image')).toBeTruthy();
    expect(view.queryByText('Confirm Result')).toBeNull();
    expect(view.queryByText('Reject Specimen')).toBeNull();
  });
});

describe('the Status row', () => {
  it("uses the Queue's wording instead of the raw enum", async () => {
    const view = await openScreen({
      specimens: { 'spec-1': makeSpecimen({ status: 'PROCESSING' }) },
    });
    expect(view.getByText('In Progress')).toBeTruthy();
    expect(view.queryByText('PROCESSING')).toBeNull();
  });

  it('shows how far the result has got', async () => {
    const view = await openScreen({
      result: makeResult({ status: 'PENDING_SUPERVISOR_APPROVAL' }),
    });
    expect(view.getAllByText('Pending Supervisor Approval').length).toBeGreaterThan(0);
  });
});

// ── Bug 7: overrides ─────────────────────────────────────────────────────────

describe('AI Findings', () => {
  it('shows the AI counts as reported when nothing was overridden', async () => {
    const view = await openScreen({ result: makeResult() });
    expect(view.getByText('Wbc')).toBeTruthy();
    expect(view.getByText('12')).toBeTruthy();
    expect(view.queryByText(/Overridden/)).toBeNull();
  });

  it('marks a corrected value as overridden and keeps the AI value visible', async () => {
    const view = await openScreen({
      result: makeResult(),
      overrides: [{ parameter: 'wbc', correctedValue: 5 }],
    });

    expect(view.getByText('Overridden · AI: 12')).toBeTruthy();
    expect(view.getByText('5')).toBeTruthy();
    expect(view.queryByText('12')).toBeNull();
  });

  it('keeps a parameter overridden to zero, and still shows the findings card', async () => {
    const view = await openScreen({
      result: makeResult({ aiFindings: { bacteria: 4 } }),
      overrides: [{ parameter: 'bacteria', correctedValue: 0 }],
    });

    expect(view.getByText('Bacteria')).toBeTruthy();
    expect(view.getByText('Overridden · AI: 4')).toBeTruthy();
    expect(view.queryByText('No particles detected.')).toBeNull();
  });

  it('says "No particles detected." when there is nothing to list', async () => {
    const view = await openScreen({ result: makeResult({ aiFindings: {} }) });
    expect(view.getByText('No particles detected.')).toBeTruthy();
  });
});

// ── Bug 8: Smart Diagnosis wording ───────────────────────────────────────────

describe('Smart Diagnosis', () => {
  const noIndicators = {
    gout: { level: 'LOW' },
    glomerulonephritis: { level: 'LOW' },
    nephrolithiasis: { level: 'LOW' },
    no_significant_indicators: true,
  };

  it('explains it is generated after confirmation while the result awaits the MedTech', async () => {
    const view = await openScreen({ result: makeResult({ status: 'PENDING_CONFIRM' }) });
    expect(
      view.getByText('Smart Diagnosis is generated after you confirm this result.'),
    ).toBeTruthy();
    expect(view.queryByText(/unavailable/i)).toBeNull();
  });

  it('says a queued confirmation is waiting to sync', async () => {
    const view = await openScreen({
      result: makeResult({ status: 'PENDING_SUPERVISOR_APPROVAL', isSynced: false }),
    });
    expect(view.getByText(/confirmation is queued/i)).toBeTruthy();
  });

  it('says it is unavailable — a different message — when the engine failed', async () => {
    const view = await openScreen({
      result: makeResult({
        status: 'PENDING_SUPERVISOR_APPROVAL',
        smartDiagnosisUnavailable: true,
      }),
    });
    expect(view.getByText(/Smart Diagnosis is unavailable/)).toBeTruthy();
    expect(view.queryByText(/generated after you confirm/)).toBeNull();
  });

  it('shows the diagnosis when there is one', async () => {
    const view = await openScreen({
      result: makeResult({ status: 'PENDING_SUPERVISOR_APPROVAL', smartDiagnosis: noIndicators }),
    });
    expect(view.getByText('No significant diagnostic indicators found.')).toBeTruthy();
  });

  it('does not dress a condition with no level as Low', async () => {
    const view = await openScreen({
      result: makeResult({
        status: 'PENDING_SUPERVISOR_APPROVAL',
        smartDiagnosis: {
          gout: { level: 'HIGH' },
          glomerulonephritis: {},
          nephrolithiasis: { level: 'LOW' },
          no_significant_indicators: false,
        },
      }),
    });
    expect(view.getByText('High')).toBeTruthy();
    expect(view.getByText('—')).toBeTruthy();
    expect(view.getAllByText('Low')).toHaveLength(1);
  });
});

// ── Result review route ──────────────────────────────────────────────────────

describe('the result-review route (resultId param)', () => {
  it('shows the review screen', async () => {
    setupDb();
    mockParams = { id: 'spec-1', resultId: 'srv-res-1' };
    const view = render(<SampleDetailRoute />);
    expect(view.getByText('REVIEW_SCREEN')).toBeTruthy();
    await act(async () => {});
  });

  it('falls back to the regular view if the specimen has been rejected', async () => {
    setupDb({
      specimens: { 'spec-1': makeSpecimen({ status: 'REJECTED' }) },
      result: makeResult(),
    });
    mockParams = { id: 'spec-1', resultId: 'srv-res-1' };
    const view = render(<SampleDetailRoute />);

    await view.findByText('Sample Detail');
    expect(view.queryByText('REVIEW_SCREEN')).toBeNull();
    expect(view.getAllByText('Specimen Rejected').length).toBeGreaterThan(0);
    expect(view.queryByText('Confirm Result')).toBeNull();
  });
});
