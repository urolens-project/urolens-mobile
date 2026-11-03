/**
 * FieldListScreen — FieldRow's "uploading now" vs "waiting to upload" distinction.
 *
 * A gallery bulk upload can leave several fields PENDING_UPLOAD at once, but
 * pushChanges only ever uploads one at a time — the row for that one field, and
 * only that one, must read "Uploading…"; every other PENDING_UPLOAD row reads
 * "Waiting to upload…" until its own turn comes.
 */
import { render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(() => ({ isOnline: true })),
}));

jest.mock('@db/sync/syncManager', () => ({
  synchronize: jest.fn(() => Promise.resolve()),
  LAST_SYNC_KEY: 'urolens_last_sync_at',
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('@features/field-capture/hooks/useSubmitFields', () => ({
  useSubmitFields: () => ({
    submitFields: jest.fn(),
    isLoading: false,
    error: null,
    getError: () => null,
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
}));

import { FieldListScreen } from '../../../src/features/field-capture/components/FieldListScreen';
import { useFieldList } from '../../../src/features/field-capture/hooks/useFieldList';

beforeEach(() => {
  jest.clearAllMocks();
  mockUploadingFieldId = null;
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
