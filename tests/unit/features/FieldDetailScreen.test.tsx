/**
 * FieldDetailScreen — the offline backlog's step-through (mobile-n8-todo-rem.md C6,
 * decision #1). After Proceed/Discard on a field opened from the list, the next field
 * still needing a decision (lowest fieldNo) opens immediately instead of returning to
 * the list; the list only reappears once nothing is left.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn() },
}));

const mockUseFieldList = jest.fn();
jest.mock('@features/field-capture/hooks/useFieldList', () => ({
  useFieldList: (...args: unknown[]) => mockUseFieldList(...args),
}));

const mockUseFieldDetail = jest.fn();
jest.mock('@features/field-capture/hooks/useFieldDetail', () => ({
  useFieldDetail: (...args: unknown[]) => mockUseFieldDetail(...args),
}));

const mockAcceptField = jest.fn();
const mockDiscardField = jest.fn();
const mockMarkFieldReviewed = jest.fn();
jest.mock('@features/field-capture/hooks/useFieldActions', () => ({
  useFieldActions: () => ({
    acceptField: mockAcceptField,
    discardField: mockDiscardField,
    markFieldReviewed: mockMarkFieldReviewed,
    isLoading: false,
    error: null,
  }),
}));

import { router } from 'expo-router';
import { FieldDetailScreen } from '../../../src/features/field-capture/components/FieldDetailScreen';
import type { CapturedField } from '../../../src/features/field-capture/types';
import type { FieldListItem } from '../../../src/features/field-capture/types';

const mockRouterReplace = router.replace as jest.Mock;
const mockRouterBack = router.back as jest.Mock;

function makeListItem(overrides: Partial<FieldListItem> = {}): FieldListItem {
  return {
    localId: 'field-1',
    fieldNo: 1,
    magnification: 'HPF',
    status: 'ANALYZED',
    thumbnailUri: null,
    particleCount: 2,
    discardReason: null,
    isReviewed: false,
    ...overrides,
  };
}

function makeField(overrides: Partial<CapturedField> = {}): CapturedField {
  return {
    localId: 'field-1',
    fieldNo: 1,
    magnification: 'HPF',
    status: 'ANALYZED',
    aiFindings: {},
    detections: [],
    imageWidth: 800,
    imageHeight: 600,
    smartDiagnosisPreview: null,
    smartDiagnosisUnavailable: true,
    localImageUri: 'file:///fields/field-1.jpg',
    acceptedFieldCount: 3,
    minFields: 10,
    isAwaitingBoxes: false,
    isReviewed: false,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseFieldDetail.mockReturnValue({ field: makeField(), isLoading: false });
  mockAcceptField.mockResolvedValue({
    acceptedFieldCount: 4,
    verifiedFieldCount: 0,
    undecidedFieldCount: 0,
  });
  mockDiscardField.mockResolvedValue({
    acceptedFieldCount: 3,
    verifiedFieldCount: 0,
    undecidedFieldCount: 0,
  });
  mockMarkFieldReviewed.mockResolvedValue(undefined);
});

describe('FieldDetailScreen step-through', () => {
  it('replaces straight to the next undecided field (lowest fieldNo) after Proceed', async () => {
    // useFieldList's underlying query already sorts by field_no ascending; this list
    // is pre-sorted the same way, exactly as the real hook would return it.
    mockUseFieldList.mockReturnValue({
      fields: [
        makeListItem({ localId: 'field-1', fieldNo: 1 }),
        makeListItem({ localId: 'field-2', fieldNo: 2 }),
        makeListItem({ localId: 'field-3', fieldNo: 3 }),
      ],
      acceptedCount: 3,
    });

    render(<FieldDetailScreen localFieldId="field-1" specimenId="srv-1" minFields={10} />);
    fireEvent.press(screen.getByTestId('proceed-field-button'));

    await waitFor(() =>
      expect(mockRouterReplace).toHaveBeenCalledWith({
        pathname: '/(medtech)/field-result',
        params: { localFieldId: 'field-2', specimenId: 'srv-1', minFields: '10' },
      }),
    );
    expect(mockRouterBack).not.toHaveBeenCalled();
  });

  it('replaces straight to the next undecided field after Discard too', async () => {
    mockUseFieldList.mockReturnValue({
      fields: [
        makeListItem({ localId: 'field-1', fieldNo: 1 }),
        makeListItem({ localId: 'field-2', fieldNo: 2 }),
      ],
      acceptedCount: 3,
    });
    mockUseFieldDetail.mockReturnValue({
      field: makeField({ status: 'ACCEPTED' }),
      isLoading: false,
    });

    render(<FieldDetailScreen localFieldId="field-1" specimenId="srv-1" minFields={10} />);
    fireEvent.press(screen.getByTestId('discard-field-button'));
    fireEvent.press(screen.getByTestId('discard-field-modal-confirm-button'));

    await waitFor(() =>
      expect(mockRouterReplace).toHaveBeenCalledWith({
        pathname: '/(medtech)/field-result',
        params: { localFieldId: 'field-2', specimenId: 'srv-1', minFields: '10' },
      }),
    );
  });

  it('goes back to the list once nothing else is undecided', async () => {
    mockUseFieldList.mockReturnValue({
      fields: [makeListItem({ localId: 'field-1', fieldNo: 1 })],
      acceptedCount: 3,
    });

    render(<FieldDetailScreen localFieldId="field-1" specimenId="srv-1" minFields={10} />);
    fireEvent.press(screen.getByTestId('proceed-field-button'));

    await waitFor(() => expect(mockRouterBack).toHaveBeenCalledTimes(1));
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('skips an already-accepted field and a still-uploading one when picking the next target', async () => {
    mockUseFieldList.mockReturnValue({
      fields: [
        makeListItem({ localId: 'field-1', fieldNo: 1 }),
        makeListItem({ localId: 'field-2', fieldNo: 2, status: 'ACCEPTED' }),
        makeListItem({ localId: 'field-3', fieldNo: 3, status: 'PENDING_UPLOAD' }),
        makeListItem({ localId: 'field-4', fieldNo: 4, status: 'ANALYZED' }),
      ],
      acceptedCount: 3,
    });

    render(<FieldDetailScreen localFieldId="field-1" specimenId="srv-1" minFields={10} />);
    fireEvent.press(screen.getByTestId('proceed-field-button'));

    await waitFor(() =>
      expect(mockRouterReplace).toHaveBeenCalledWith({
        pathname: '/(medtech)/field-result',
        params: { localFieldId: 'field-4', specimenId: 'srv-1', minFields: '10' },
      }),
    );
  });

  it('shows how many fields are still waiting', () => {
    mockUseFieldList.mockReturnValue({
      fields: [
        makeListItem({ localId: 'field-1', fieldNo: 1 }),
        makeListItem({ localId: 'field-2', fieldNo: 2 }),
        makeListItem({ localId: 'field-3', fieldNo: 3 }),
      ],
      acceptedCount: 3,
    });

    render(<FieldDetailScreen localFieldId="field-1" specimenId="srv-1" minFields={10} />);

    expect(screen.getByText(/2 more waiting/)).toBeTruthy();
  });

  it('stays on the list view (no step-through hint) when nothing else is waiting', () => {
    mockUseFieldList.mockReturnValue({
      fields: [makeListItem({ localId: 'field-1', fieldNo: 1 })],
      acceptedCount: 3,
    });

    render(<FieldDetailScreen localFieldId="field-1" specimenId="srv-1" minFields={10} />);

    expect(screen.queryByText(/more waiting/)).toBeNull();
  });

  it('marks the field reviewed without navigating away', async () => {
    mockUseFieldList.mockReturnValue({
      fields: [makeListItem({ localId: 'field-1', fieldNo: 1 })],
      acceptedCount: 3,
    });

    render(<FieldDetailScreen localFieldId="field-1" specimenId="srv-1" minFields={10} />);
    fireEvent.press(screen.getByTestId('mark-field-reviewed-button'));

    await waitFor(() => expect(mockMarkFieldReviewed).toHaveBeenCalledWith('field-1'));
    expect(mockRouterReplace).not.toHaveBeenCalled();
    expect(mockRouterBack).not.toHaveBeenCalled();
  });

  it('does not navigate when the action is refused (no outcome)', async () => {
    mockUseFieldList.mockReturnValue({
      fields: [
        makeListItem({ localId: 'field-1', fieldNo: 1 }),
        makeListItem({ localId: 'field-2', fieldNo: 2 }),
      ],
      acceptedCount: 3,
    });
    mockAcceptField.mockResolvedValue(undefined);

    render(<FieldDetailScreen localFieldId="field-1" specimenId="srv-1" minFields={10} />);
    fireEvent.press(screen.getByTestId('proceed-field-button'));

    await waitFor(() => expect(mockAcceptField).toHaveBeenCalledWith('field-1'));
    expect(mockRouterReplace).not.toHaveBeenCalled();
    expect(mockRouterBack).not.toHaveBeenCalled();
  });
});
