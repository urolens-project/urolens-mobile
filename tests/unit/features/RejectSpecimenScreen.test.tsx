import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RejectSpecimenScreen from '../../../app/(medtech)/sample/reject/[id]';
import { database } from '@db/database';
import { useRejectSpecimen } from '@src/features/specimen-rejection/hooks/useRejectSpecimen';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'spec-1' }),
  useRouter: () => mockRouter,
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@db/database', () => ({ database: { get: jest.fn() } }));
jest.mock('@src/features/specimen-rejection/hooks/useRejectSpecimen', () => ({
  useRejectSpecimen: jest.fn(),
}));
// The reason form is covered on its own; here it only needs to drive the screen's handler.
jest.mock('@src/features/specimen-rejection/components/RejectionReasonModal', () => {
  const React = require('react');
  return {
    RejectionReasonModal: ({
      onSelectReason,
      onConfirm,
    }: {
      onSelectReason: (reason: string) => void;
      onConfirm: () => void;
    }) =>
      React.createElement(
        'View',
        null,
        React.createElement('Text', null, 'REASON_FORM'),
        React.createElement('Text', { onPress: () => onSelectReason('OTHER') }, 'PICK'),
        React.createElement('Text', { onPress: onConfirm }, 'CONFIRM'),
      ),
  };
});

type Row = Record<string, unknown>;

const observable = <T,>(value: T) => ({
  subscribe: (cb: (v: T) => void) => {
    cb(value);
    return { unsubscribe: jest.fn() };
  },
});

function setupDb(specimen: Row, result: Row | null) {
  (database.get as jest.Mock).mockImplementation((table: string) => ({
    query: () => ({
      observeWithColumns: () =>
        observable(table === 'specimens' ? [specimen] : result ? [result] : []),
    }),
  }));
}

const specimen = (over: Row = {}): Row => ({
  id: 'spec-1',
  serverId: 'srv-spec-1',
  sampleUid: 'SMP-1',
  patientUid: 'PT-1',
  status: 'ASSIGNED',
  ...over,
});

const result = (status: string): Row => ({
  serverId: 'srv-res-1',
  specimenId: 'srv-spec-1',
  status,
  confirmedAt: null,
  syncedAt: null,
  createdAt: 1,
});

const mockReject = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useRejectSpecimen as jest.Mock).mockReturnValue({
    reject: mockReject,
    isLoading: false,
    error: null,
  });
});

describe('the reject screen', () => {
  it.each([
    ['there is no result yet', null],
    ['the result still awaits confirmation', 'PENDING_CONFIRM'],
  ])('shows the reason form when %s', (_label, resultStatus) => {
    setupDb(specimen(), resultStatus ? result(resultStatus) : null);
    const view = render(<RejectSpecimenScreen />);
    expect(view.getByText('REASON_FORM')).toBeTruthy();
    expect(view.queryByText('Cannot reject this specimen')).toBeNull();
  });

  // This screen is reachable straight from the Queue and from notifications, not only
  // from Sample Detail — so it enforces the rule itself.
  it.each([
    ['confirmed', 'PENDING_SUPERVISOR_APPROVAL'],
    ['returned for correction', 'RETURNED_FOR_CORRECTION'],
    ['escalated', 'CRITICAL_ESCALATED'],
    ['approved', 'APPROVED'],
  ])('refuses, with an explanation, once the result is %s', (_label, resultStatus) => {
    setupDb(specimen(), result(resultStatus));
    const view = render(<RejectSpecimenScreen />);

    expect(view.getByText('Cannot reject this specimen')).toBeTruthy();
    expect(view.getByText(/submitted for supervisor review/)).toBeTruthy();
    expect(view.queryByText('REASON_FORM')).toBeNull();
  });

  it('refuses a specimen that is already rejected', () => {
    setupDb(specimen({ status: 'REJECTED' }), null);
    const view = render(<RejectSpecimenScreen />);

    expect(view.getByText(/already been rejected/)).toBeTruthy();
    expect(view.queryByText('REASON_FORM')).toBeNull();
  });

  it('lets the MedTech get back to the sample', () => {
    setupDb(specimen(), result('PENDING_SUPERVISOR_APPROVAL'));
    const view = render(<RejectSpecimenScreen />);

    fireEvent.press(view.getByText('Back to sample'));

    expect(mockRouter.replace).toHaveBeenCalledWith('/(medtech)/sample/spec-1');
  });
});

describe('rejecting a specimen', () => {
  function submit() {
    setupDb(specimen(), null);
    const view = render(<RejectSpecimenScreen />);
    fireEvent.press(view.getByText('PICK'));
    fireEvent.press(view.getByText('CONFIRM'));
    return view;
  }

  it('goes back to the sample once rejected, with no alert', async () => {
    mockReject.mockResolvedValue({ status: 'rejected' });
    submit();

    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith('/(medtech)/sample/spec-1'),
    );
    expect(mockReject).toHaveBeenCalledWith('OTHER', '');
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  // Bug: the alert read `error` from the render that created the handler, so it always
  // showed the fallback ("An error occurred.") instead of why the rejection failed.
  it('alerts with the actual reason it failed, and stays on the screen', async () => {
    mockReject.mockResolvedValue({
      status: 'failed',
      message: "This specimen's result has already been submitted for supervisor review.",
    });
    submit();

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Rejection Failed',
        "This specimen's result has already been submitted for supervisor review.",
      ),
    );
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
