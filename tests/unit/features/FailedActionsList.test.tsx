/**
 * FailedActionsList: the Profile screen's list of changes the server refused (UROLENS-220).
 *
 * Covers: nothing rendered when there are none; the count (singular and plural), each
 * change with its sample and reason, a change with no known sample, and Dismiss.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@features/profile/hooks/useFailedActions', () => ({ useFailedActions: jest.fn() }));

import { FailedActionsList } from '../../../src/features/profile/components/FailedActionsList';
import { useFailedActions } from '../../../src/features/profile/hooks/useFailedActions';
import type { FailedActionUi } from '../../../src/features/profile/types';

const dismissAll = jest.fn();

function setItems(items: FailedActionUi[], isDismissing = false): void {
  (useFailedActions as jest.Mock).mockReturnValue({ items, dismissAll, isDismissing });
}

const confirm: FailedActionUi = {
  id: 'q1',
  title: 'Confirm result',
  sampleUid: 'SMP-20261003-00001',
  reason: 'This result can no longer be changed.',
};
const discard: FailedActionUi = {
  id: 'q2',
  title: 'Discard image',
  sampleUid: null,
  reason: 'The server did not accept this change.',
};

beforeEach(() => jest.clearAllMocks());

describe('FailedActionsList', () => {
  it('renders nothing when every change was sent', () => {
    setItems([]);

    render(<FailedActionsList />);

    expect(screen.toJSON()).toBeNull();
  });

  it('lists each refused change with its sample and the reason', () => {
    setItems([confirm, discard]);

    render(<FailedActionsList />);

    expect(screen.getByText("2 changes couldn't be sent")).toBeTruthy();
    expect(screen.getByText('Confirm result • SMP-20261003-00001')).toBeTruthy();
    expect(screen.getByText('This result can no longer be changed.')).toBeTruthy();
    expect(screen.getByText('Discard image')).toBeTruthy();
    expect(screen.getByText(/they were not saved/)).toBeTruthy();
  });

  it('says "1 change" for a single one', () => {
    setItems([confirm]);

    render(<FailedActionsList />);

    expect(screen.getByText("1 change couldn't be sent")).toBeTruthy();
  });

  it('Dismiss clears the list', () => {
    setItems([confirm]);
    render(<FailedActionsList />);

    fireEvent.press(screen.getByRole('button', { name: "Dismiss changes that couldn't be sent" }));

    expect(dismissAll).toHaveBeenCalledTimes(1);
  });

  // The repo's react-native stub doesn't block presses on a disabled button, so
  // assert the prop, as the other button tests here do.
  it.each([
    [true, true],
    [false, false],
  ])('the button is disabled while dismissing: %p', (isDismissing, disabled) => {
    setItems([confirm], isDismissing);
    render(<FailedActionsList />);

    const button = screen.getByRole('button', { name: "Dismiss changes that couldn't be sent" });

    expect(Boolean(button.props.accessibilityState?.disabled ?? button.props.disabled)).toBe(
      disabled,
    );
  });
});
