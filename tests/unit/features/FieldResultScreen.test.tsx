// Path: urolens-mobile/tests/unit/features/FieldResultScreen.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { FieldResultScreen } from '@features/field-capture/components/FieldResultScreen';
import { FIELD_CAPTURE_TEXT } from '@features/field-capture/constants/fieldCaptureText.constant';
import type { CapturedField } from '@features/field-capture/types';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));

function makeField(overrides: Partial<CapturedField> = {}): CapturedField {
  return {
    localId: 'field-1',
    fieldNo: 3,
    magnification: 'HPF',
    status: 'ANALYZED',
    aiFindings: { erythrocytes: 2 },
    detections: [],
    imageWidth: 1200,
    imageHeight: 900,
    smartDiagnosisPreview: null,
    smartDiagnosisUnavailable: true,
    localImageUri: 'file:///fields/field-1.jpg',
    acceptedFieldCount: 3,
    minFields: 10,
    isAwaitingBoxes: false,
    ...overrides,
  };
}

const noop = (): void => {};

// A field synced from another phone (or before a reinstall) has a server id but no
// local image or AI boxes yet (mobile PR #55 review, 1.2/3.14) — it must never look
// like a field with no detections, and nobody should decide it blind.
describe('FieldResultScreen — awaiting boxes (1.2/3.14)', () => {
  it('shows the loading notice instead of the image when boxes have not reached this device', () => {
    render(
      <FieldResultScreen
        field={makeField({ isAwaitingBoxes: true, localImageUri: '' })}
        isSubmitting={false}
        errorMessage={null}
        onProceed={noop}
        onDiscard={noop}
      />,
    );

    expect(screen.getByText(FIELD_CAPTURE_TEXT.boxesAwaitingSyncMessage)).toBeTruthy();
    expect(screen.queryByTestId('proceed-field-button')).toBeNull();
    expect(screen.getByTestId('discard-field-button')).toBeTruthy();
  });

  it('shows Proceed and the image for an ordinary field with its boxes already loaded', () => {
    render(
      <FieldResultScreen
        field={makeField({ isAwaitingBoxes: false })}
        isSubmitting={false}
        errorMessage={null}
        onProceed={noop}
        onDiscard={noop}
      />,
    );

    expect(screen.queryByText(FIELD_CAPTURE_TEXT.boxesAwaitingSyncMessage)).toBeNull();
    expect(screen.getByTestId('proceed-field-button')).toBeTruthy();
  });

  it('still hides Proceed for an already-ACCEPTED field, same as before (3.7)', () => {
    render(
      <FieldResultScreen
        field={makeField({ status: 'ACCEPTED', isAwaitingBoxes: false })}
        isSubmitting={false}
        errorMessage={null}
        onProceed={noop}
        onDiscard={noop}
      />,
    );

    expect(screen.queryByTestId('proceed-field-button')).toBeNull();
    expect(screen.getByTestId('discard-field-button')).toBeTruthy();
  });
});

// C6 (mobile-n8-todo-rem.md, decision #1): the step-through's "N more waiting" hint.
describe('FieldResultScreen — remainingCount header (C6)', () => {
  it('shows how many other fields still need a decision', () => {
    render(
      <FieldResultScreen
        field={makeField()}
        isSubmitting={false}
        errorMessage={null}
        onProceed={noop}
        onDiscard={noop}
        remainingCount={2}
      />,
    );

    expect(screen.getByText(/2 more waiting/)).toBeTruthy();
  });

  it('shows nothing extra when nothing else is waiting', () => {
    render(
      <FieldResultScreen
        field={makeField()}
        isSubmitting={false}
        errorMessage={null}
        onProceed={noop}
        onDiscard={noop}
        remainingCount={0}
      />,
    );

    expect(screen.queryByText(/more waiting/)).toBeNull();
  });

  it('shows nothing extra for a field opened from a live capture session (no backlog)', () => {
    render(
      <FieldResultScreen
        field={makeField()}
        isSubmitting={false}
        errorMessage={null}
        onProceed={noop}
        onDiscard={noop}
      />,
    );

    expect(screen.queryByText(/more waiting/)).toBeNull();
  });
});
