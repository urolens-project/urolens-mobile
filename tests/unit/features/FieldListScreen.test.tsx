/**
 * FieldListScreen — FieldRow's "uploading now" vs "waiting to upload" distinction,
 * and Submit for Verification's resync and error handling.
 *
 * A gallery bulk upload can leave several fields PENDING_UPLOAD at once, but
 * pushChanges only ever uploads one at a time — the row for that one field, and
 * only that one, must read "Uploading…"; every other PENDING_UPLOAD row reads
 * "Waiting to upload…" until its own turn comes.
 *
 * Submit syncs before calling the server, shows the server's own message when it
 * refuses, and syncs again when the refusal means the phone is missing a field
 * (FIELDS_UNDECIDED / FIELDS_BELOW_MINIMUM). A failed check never leaves the tap
 * doing nothing.
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(() => ({ isOnline: true })),
}));

const mockSynchronizeAfterCurrent = jest.fn(() => Promise.resolve());
jest.mock('@db/sync/syncManager', () => ({
  synchronizeAfterCurrent: () => mockSynchronizeAfterCurrent(),
  LAST_SYNC_KEY: 'urolens_last_sync_at',
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

const mockSubmitFields = jest.fn();
let mockSubmitError: { message: string; code?: string } | null = null;
jest.mock('@features/field-capture/hooks/useSubmitFields', () => ({
  useSubmitFields: () => ({
    submitFields: mockSubmitFields,
    isLoading: false,
    error: null,
    getError: () => mockSubmitError,
  }),
}));

let mockUploadingFieldId: string | null = null;
jest.mock('@features/field-capture/hooks/useCurrentlyUploadingFieldId', () => ({
  useCurrentlyUploadingFieldId: () => mockUploadingFieldId,
}));

function makeField(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    localId: 'field-1',
    fieldNo: 1,
    magnification: 'HPF',
    status: 'PENDING_UPLOAD',
    thumbnailUri: null,
    particleCount: 0,
    discardReason: null,
    isReviewed: false,
    ...overrides,
  };
}

jest.mock('@features/field-capture/hooks/useFieldList', () => ({
  useFieldList: jest.fn(),
  fetchFieldCounts: jest.fn(),
}));

import { FieldListScreen } from '../../../src/features/field-capture/components/FieldListScreen';
import {
  fetchFieldCounts,
  useFieldList,
} from '../../../src/features/field-capture/hooks/useFieldList';

beforeEach(() => {
  jest.clearAllMocks();
  mockUploadingFieldId = null;
  mockSubmitError = null;
  mockSynchronizeAfterCurrent.mockImplementation(() => Promise.resolve());
});

// FlatList is a stub in the jest setup and never renders its rows, so pull
// renderItem off its props and render each row the way the list would (same
// pattern as QueueScreen.test.tsx's listOf/tapCard).
function rowSubtitles(fields: ReturnType<typeof makeField>[]): string[] {
  (useFieldList as jest.Mock).mockReturnValue({
    fields,
    acceptedCount: 0,
    undecidedCount: fields.length,
    pendingDecisionsCount: 0,
    resultServerId: 'srv-result-1',
    isLoading: false,
  });
  const view = render(
    <FieldListScreen specimenId="srv-1" localSpecimenId="local-1" minFields={5} />,
  );
  const flatList = view.UNSAFE_root.findByType('FlatList' as never);

  return fields.map((field, index) => {
    const row = flatList.props.renderItem({ item: field, index });
    const rowScreen = render(row);
    return rowScreen.getByText(/particles|Uploading…|Waiting to upload…/).props.children as string;
  });
}

describe('FieldListScreen uploading-now status', () => {
  it('shows "Uploading…" for the field pushChanges is dispatching right now', () => {
    mockUploadingFieldId = 'field-1';
    expect(rowSubtitles([makeField({ localId: 'field-1' })])).toEqual(['Uploading…']);
  });

  it('shows "Waiting to upload…" for a queued field that is not the one in flight', () => {
    mockUploadingFieldId = 'field-2';
    expect(rowSubtitles([makeField({ localId: 'field-1' })])).toEqual(['Waiting to upload…']);
  });

  it('shows "Waiting to upload…" for every queued field while none is in flight', () => {
    mockUploadingFieldId = null;
    expect(
      rowSubtitles([
        makeField({ localId: 'field-1' }),
        makeField({ localId: 'field-2', fieldNo: 2 }),
      ]),
    ).toEqual(['Waiting to upload…', 'Waiting to upload…']);
  });
});

// Five accepted fields, nothing undecided or queued: the phone's own guard lets Submit through.
const READY_COUNTS = {
  acceptedCount: 5,
  undecidedCount: 0,
  pendingDecisionsCount: 0,
  resultServerId: 'srv-result-1',
};

function renderReadyToSubmit(): ReturnType<typeof render> {
  (useFieldList as jest.Mock).mockReturnValue({ fields: [], ...READY_COUNTS, isLoading: false });
  (fetchFieldCounts as jest.Mock).mockResolvedValue(READY_COUNTS);
  return render(<FieldListScreen specimenId="srv-1" localSpecimenId="local-1" minFields={5} />);
}

describe('FieldListScreen Submit for Verification', () => {
  it('shows the server message and syncs again when a field is undecided on the server', async () => {
    mockSubmitFields.mockResolvedValue(undefined);
    mockSubmitError = { message: '1 field not reviewed.', code: 'FIELDS_UNDECIDED' };
    const view = renderReadyToSubmit();

    fireEvent.press(view.getByTestId('submit-for-verification-button'));

    await waitFor(() => expect(view.getByText('1 field not reviewed.')).toBeTruthy());
    expect(mockSubmitFields).toHaveBeenCalledWith('srv-result-1');
    // Once before submitting, once after the refusal to bring the missing field in.
    expect(mockSynchronizeAfterCurrent).toHaveBeenCalledTimes(2);
  });

  it('does not sync again for a refusal that is not about the fields', async () => {
    mockSubmitFields.mockResolvedValue(undefined);
    mockSubmitError = {
      message: 'This result can no longer be edited.',
      code: 'RESULT_NOT_EDITABLE',
    };
    const view = renderReadyToSubmit();

    fireEvent.press(view.getByTestId('submit-for-verification-button'));

    await waitFor(() =>
      expect(view.getByText('This result can no longer be edited.')).toBeTruthy(),
    );
    expect(mockSynchronizeAfterCurrent).toHaveBeenCalledTimes(1);
  });

  it('shows a message instead of doing nothing when the check before submitting fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSynchronizeAfterCurrent.mockImplementation(() =>
      Promise.reject(new Error('Network Error')),
    );
    const view = renderReadyToSubmit();

    fireEvent.press(view.getByTestId('submit-for-verification-button'));

    await waitFor(() =>
      expect(
        view.getByText(
          'Couldn’t check the latest fields with the server. Check your connection and try again.',
        ),
      ).toBeTruthy(),
    );
    expect(mockSubmitFields).not.toHaveBeenCalled();
  });
});
