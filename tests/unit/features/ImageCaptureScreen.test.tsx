/**
 * Screen-level tests for ImageCaptureScreen — multi-image capture sessions.
 *
 * Covers the state machine wired through useBatchCapture: the camera opening
 * immediately with a live-adjustable target count (no separate "how many?"
 * screen), capturing never touching the network before the batch is confirmed
 * (CAP-01), a resolution rejection surfacing inline (CAP-02), per-shot
 * keep/retake (CAP-03), the existing-batch discard gate on the first retake
 * only, and the full capture loop → review grid → upload-all flow landing on
 * a single POST /images/upload-batch.
 *
 * A `testID="capture-button"` on the capture-ring TouchableOpacity makes the
 * shutter queryable — it's icon-only with no distinct accessible name,
 * unlike Retake/Keep Photo.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

// ─── Mocks (hoisted before imports) ─────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
}));

let mockTakePictureAsync: jest.Mock;

jest.mock('expo-camera', () => {
  const ReactActual = require('react');
  return {
    CameraView: ReactActual.forwardRef((props: any, ref: any) => {
      ReactActual.useImperativeHandle(ref, () => ({
        takePictureAsync: mockTakePictureAsync,
      }));
      return ReactActual.createElement('View', props);
    }),
    useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
  };
});

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
}));

const mockProcessCapture = jest.fn();
const mockProcessPickerAsset = jest.fn();
const mockBuildBatchUploadFormData = jest.fn(() => new FormData());

// Error classes are declared *inside* the factory (not referenced from outer
// scope) because jest.mock factories run before any outer `class`/`const`
// declaration has executed — only "mock"-prefixed outer bindings referenced
// lazily (e.g. `(...args) => mockProcessCapture(...args)`) are safe to close
// over here; a direct value reference to an externally-declared class would
// have been undefined at factory-invocation time.
jest.mock('@lib/camera/imageUtils', () => {
  class ImageResolutionError extends Error {
    constructor(width: number, height: number) {
      super(
        `Image resolution ${width}×${height} is below the minimum 640×480 required for AI analysis.`,
      );
      this.name = 'ImageResolutionError';
    }
  }
  class ImageFormatError extends Error {
    constructor(mimeType: string) {
      super(`Unsupported image format "${mimeType}".`);
      this.name = 'ImageFormatError';
    }
  }
  class ImageTooLargeError extends Error {
    constructor() {
      super('This image is too large to upload (the limit is 10 MB).');
      this.name = 'ImageTooLargeError';
    }
  }
  return {
    processCapture: (...args: unknown[]) => mockProcessCapture(...args),
    processPickerAsset: (...args: unknown[]) => mockProcessPickerAsset(...args),
    buildBatchUploadFormData: (...args: unknown[]) => mockBuildBatchUploadFormData(...args),
    isImageValidationError: (err: unknown): boolean =>
      err instanceof ImageResolutionError ||
      err instanceof ImageTooLargeError ||
      err instanceof ImageFormatError,
    ImageResolutionError,
    ImageFormatError,
    ImageTooLargeError,
    MIN_BATCH_IMAGES: 10,
    MAX_BATCH_IMAGES: 30,
    DEFAULT_BATCH_IMAGES: 15,
  };
});

const mockUploadImageBatchViaXhr = jest.fn();
jest.mock('@lib/camera/uploadImage', () => ({
  uploadImageBatchViaXhr: (...args: unknown[]) => mockUploadImageBatchViaXhr(...args),
}));

const mockApiPost = jest.fn();
jest.mock('@lib/apiClient', () => ({
  __esModule: true,
  default: { post: (...args: unknown[]) => mockApiPost(...args) },
}));

const mockUseNetworkStatus = jest.fn(() => ({ isOnline: true }));
jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mockUseNetworkStatus(),
}));

const mockDbWrite = jest.fn((fn: () => Promise<void>) => fn());
const mockCollectionCreate = jest.fn();
const mockCollectionQuery = jest.fn(() => ({ fetch: jest.fn().mockResolvedValue([]) }));
jest.mock('@db/database', () => ({
  database: {
    get: jest.fn(() => ({
      query: (...args: unknown[]) => mockCollectionQuery(...args),
      create: (...args: unknown[]) => mockCollectionCreate(...args),
    })),
    write: (...args: unknown[]) => mockDbWrite(...(args as [() => Promise<void>])),
  },
}));

const mockRouterReplace = jest.fn();
const mockRouterBack = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockRouterReplace(...args),
    back: () => mockRouterBack(),
  },
}));

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import { ImageCaptureScreen } from '../../../src/features/image-retake/components/ImageCaptureScreen';
import { ImageResolutionError, ImageTooLargeError } from '@lib/camera/imageUtils';

function fakeProcessedImage(n: number) {
  return {
    uri: `file://processed-${n}.jpg`,
    width: 1280,
    height: 960,
    mimeType: 'image/jpeg' as const,
    sizeBytes: 204800,
    filename: `captured-${n}.jpg`,
  };
}

function renderScreen(
  props: Partial<{ specimenId: string; localSpecimenId: string; existingImageIds?: string[] }> = {},
) {
  return render(
    <ImageCaptureScreen
      specimenId={props.specimenId ?? 'specimen-server-1'}
      localSpecimenId={props.localSpecimenId ?? 'specimen-local-1'}
      existingImageIds={props.existingImageIds}
    />,
  );
}

/** Nudges the live HUD stepper down to MIN_BATCH_IMAGES (10) from the default (15). */
function decrementToMinCount(): void {
  for (let i = 0; i < 10; i++) {
    fireEvent.press(screen.getByLabelText('Decrease photo count'));
  }
}

/** Captures and keeps `count` photos in a row, leaving the screen on whichever
 * phase follows (reviewing, once count reaches the session target). */
async function captureAndKeep(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    fireEvent.press(screen.getByTestId('capture-button'));
    await waitFor(() => expect(screen.getByTestId('keep-photo-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('keep-photo-button'));
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTakePictureAsync = jest
    .fn()
    .mockResolvedValue({ uri: 'file://raw-capture.jpg', width: 1280, height: 960 });
  let captureN = 0;
  mockProcessCapture.mockImplementation(async () => fakeProcessedImage(++captureN));
  mockUseNetworkStatus.mockReturnValue({ isOnline: true });
});

// ─── Live, inline target-count adjustment (no separate "how many?" screen) ──

describe('live capture-count adjustment', () => {
  it('opens straight to the live camera at the default count — no intermediate screen', () => {
    renderScreen();
    expect(screen.getByTestId('capture-button')).toBeTruthy();
    expect(screen.getByTestId('capture-count-value').props.children).toBe(15);
    expect(screen.getByText('Photo 1 of')).toBeTruthy();
  });

  it('clamps at MIN_BATCH_IMAGES going down and MAX_BATCH_IMAGES going up', () => {
    renderScreen();

    decrementToMinCount();
    expect(screen.getByTestId('capture-count-value').props.children).toBe(10);

    for (let i = 0; i < 25; i++) fireEvent.press(screen.getByLabelText('Increase photo count'));
    expect(screen.getByTestId('capture-count-value').props.children).toBe(30);
  });

  it('decreasing the target down to the number already kept stops there and jumps to the review grid', async () => {
    renderScreen(); // default target 15

    await captureAndKeep(12); // still below target, stays in 'capturing'

    // 12 already kept > MIN_BATCH_IMAGES(10) — the floor should track the higher value,
    // and landing exactly on it should hand off to the review grid (nothing left to shoot).
    fireEvent.press(screen.getByLabelText('Decrease photo count')); // 15 -> 14
    expect(screen.getByTestId('capture-count-value').props.children).toBe(14);
    fireEvent.press(screen.getByLabelText('Decrease photo count')); // 14 -> 13
    fireEvent.press(screen.getByLabelText('Decrease photo count')); // 13 -> 12 == kept

    await waitFor(() => expect(screen.getByTestId('upload-all-button')).toBeTruthy());
    expect(screen.getByText(/^12 photos/)).toBeTruthy();
  });

  it('dropping the target down to MIN_BATCH_IMAGES, matching what is already kept, jumps to the review grid', async () => {
    renderScreen(); // default target 15
    await captureAndKeep(10); // exactly MIN_BATCH_IMAGES kept, still below target — stays 'capturing'

    for (let i = 0; i < 5; i++) fireEvent.press(screen.getByLabelText('Decrease photo count')); // 15 -> 10

    await waitFor(() => expect(screen.getByTestId('upload-all-button')).toBeTruthy());
    expect(screen.getByText(/^10 photos/)).toBeTruthy();
  });

  it('cannot be decreased below MIN_BATCH_IMAGES even with fewer photos kept', async () => {
    renderScreen();
    decrementToMinCount(); // target 10
    await captureAndKeep(9); // below MIN — target floor is MIN_BATCH_IMAGES, not the kept count

    fireEvent.press(screen.getByLabelText('Decrease photo count')); // no-op: already at the floor

    expect(screen.getByTestId('capture-count-value').props.children).toBe(10);
    expect(screen.getByTestId('capture-button')).toBeTruthy();
  });
});

// ─── CAP-01 ──────────────────────────────────────────────────────────────────

describe('CAP-01: capture stores each photo locally before any network call', () => {
  it('processes a capture and moves to its preview without ever calling the API', async () => {
    renderScreen();
    decrementToMinCount();

    fireEvent.press(screen.getByTestId('capture-button'));

    await waitFor(() => {
      expect(screen.getByText('Photo 1 of')).toBeTruthy();
    });
    expect(mockProcessCapture).toHaveBeenCalledTimes(1);
    expect(mockApiPost).not.toHaveBeenCalled();
    expect(mockUploadImageBatchViaXhr).not.toHaveBeenCalled();
  });

  it('shows the processed image dimensions in the preview header', async () => {
    renderScreen();
    decrementToMinCount();

    fireEvent.press(screen.getByTestId('capture-button'));

    await waitFor(() => {
      expect(screen.getByText(/1280 × 960px/)).toBeTruthy();
    });
  });
});

// ─── CAP-02 ──────────────────────────────────────────────────────────────────

describe('CAP-02: below-minimum resolution is caught client-side (screen level)', () => {
  it('surfaces the resolution error inline and stays on the live camera', async () => {
    mockProcessCapture.mockRejectedValueOnce(new ImageResolutionError(320, 240));
    renderScreen();
    decrementToMinCount();

    fireEvent.press(screen.getByTestId('capture-button'));

    await waitFor(() => {
      expect(screen.getByText(/320×240 is below the minimum/)).toBeTruthy();
    });
    // Never left 'capturing' for 'previewing' — no keep/retake step offered.
    expect(screen.queryByTestId('keep-photo-button')).toBeNull();
    expect(mockApiPost).not.toHaveBeenCalled();
  });
});

describe('an image over the upload limit is caught client-side', () => {
  it('shows the size message inline and never uploads', async () => {
    mockProcessCapture.mockRejectedValueOnce(new ImageTooLargeError());
    renderScreen();
    decrementToMinCount();

    fireEvent.press(screen.getByTestId('capture-button'));

    await waitFor(() => {
      expect(screen.getByText(/too large to upload \(the limit is 10 MB\)/)).toBeTruthy();
    });
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('keeps unexpected failures generic', async () => {
    mockProcessCapture.mockRejectedValueOnce(new Error('native module crashed'));
    renderScreen();
    decrementToMinCount();

    fireEvent.press(screen.getByTestId('capture-button'));

    await waitFor(() => {
      expect(screen.getByText('Failed to capture image. Please try again.')).toBeTruthy();
    });
    expect(screen.queryByText(/native module crashed/)).toBeNull();
  });
});

// ─── CAP-03 ──────────────────────────────────────────────────────────────────

describe('CAP-03: preview → retake before commit', () => {
  it('a first-time capture (no existing batch) discards locally on Retake — no network call', async () => {
    renderScreen({ existingImageIds: undefined });
    decrementToMinCount();

    fireEvent.press(screen.getByTestId('capture-button'));
    await waitFor(() => expect(screen.getByText('Photo 1 of')).toBeTruthy());

    fireEvent.press(screen.getByTestId('retake-button'));

    await waitFor(() => {
      expect(screen.getByTestId('capture-button')).toBeTruthy();
    });
    expect(screen.queryByTestId('keep-photo-button')).toBeNull();
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('retaking the first shot over an existing batch requires explicit discard confirmation', async () => {
    renderScreen({ existingImageIds: ['existing-image-id-1', 'existing-image-id-2'] });
    decrementToMinCount();

    fireEvent.press(screen.getByTestId('capture-button'));
    await waitFor(() => expect(screen.getByTestId('keep-photo-button')).toBeTruthy());

    fireEvent.press(screen.getByTestId('retake-button'));

    expect(mockApiPost).not.toHaveBeenCalled();
    expect(screen.getByTestId('keep-photo-button')).toBeTruthy();
  });

  it('confirming the discard modal discards every existing image and returns to the camera', async () => {
    mockApiPost.mockResolvedValue({ data: {} });
    renderScreen({ existingImageIds: ['existing-image-id-1', 'existing-image-id-2'] });
    decrementToMinCount();

    fireEvent.press(screen.getByTestId('capture-button'));
    await waitFor(() => expect(screen.getByTestId('keep-photo-button')).toBeTruthy());

    fireEvent.press(screen.getByTestId('retake-button'));
    fireEvent.press(screen.getByRole('button', { name: 'Confirm discard and retake' }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/images/existing-image-id-1/discard');
      expect(mockApiPost).toHaveBeenCalledWith('/images/existing-image-id-2/discard');
    });
    await waitFor(() => {
      expect(screen.getByTestId('capture-button')).toBeTruthy();
    });
  });

  it('cancelling the discard modal keeps the pending preview image intact', async () => {
    renderScreen({ existingImageIds: ['existing-image-id-1'] });
    decrementToMinCount();

    fireEvent.press(screen.getByTestId('capture-button'));
    await waitFor(() => expect(screen.getByTestId('keep-photo-button')).toBeTruthy());

    fireEvent.press(screen.getByTestId('retake-button'));
    fireEvent.press(screen.getByRole('button', { name: 'Cancel — keep current image' }));

    expect(mockApiPost).not.toHaveBeenCalled();
    expect(screen.getByTestId('keep-photo-button')).toBeTruthy();
  });

  it('only gates the first retake of a session — later retakes skip the modal', async () => {
    mockApiPost.mockResolvedValue({ data: {} });
    renderScreen({ existingImageIds: ['existing-image-id-1'] });
    decrementToMinCount();

    // First shot: retake, confirm discard, retake again.
    fireEvent.press(screen.getByTestId('capture-button'));
    await waitFor(() => expect(screen.getByTestId('keep-photo-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('retake-button'));
    fireEvent.press(screen.getByRole('button', { name: 'Confirm discard and retake' }));
    await waitFor(() => expect(screen.getByTestId('capture-button')).toBeTruthy());

    mockApiPost.mockClear();

    // Second shot of the same session: retake should not show the modal again.
    fireEvent.press(screen.getByTestId('capture-button'));
    await waitFor(() => expect(screen.getByTestId('keep-photo-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('retake-button'));

    await waitFor(() => {
      expect(screen.getByTestId('capture-button')).toBeTruthy();
    });
    expect(mockApiPost).not.toHaveBeenCalled();
  });
});

// ─── Full session: capture loop → review grid → upload-all ─────────────────

describe('full session: capturing the full set lands on the review grid', () => {
  it('moves to the grid once the target count is reached, then uploads the whole batch in one request', async () => {
    mockUploadImageBatchViaXhr.mockResolvedValue({
      id: 'result-1',
      resultId: 'result-1',
      specimenId: 'specimen-server-1',
      imageIds: Array.from({ length: 10 }, (_, i) => `img-${i + 1}`),
      primaryImageId: 'img-1',
      imageCount: 10,
      status: 'PENDING_CONFIRM',
      aiFindings: {},
      flaggedAnomalies: null,
      smartDiagnosis: null,
      smartDiagnosisUnavailable: false,
    });

    renderScreen();
    decrementToMinCount();

    await captureAndKeep(10);

    await waitFor(() => expect(screen.getByTestId('upload-all-button')).toBeTruthy());
    expect(screen.getByText(/^10 photos · tap one to retake it/)).toBeTruthy();

    fireEvent.press(screen.getByTestId('upload-all-button'));

    await waitFor(() => expect(mockUploadImageBatchViaXhr).toHaveBeenCalledTimes(1));
    expect(mockBuildBatchUploadFormData).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ filename: 'captured-1.jpg' })]),
      'specimen-server-1',
    );
    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith({
        pathname: '/(medtech)/sample/[id]',
        params: { id: 'specimen-local-1', resultId: 'result-1' },
      });
    });
  });

  it('retaking a slot from the grid replaces only that photo', async () => {
    renderScreen();
    decrementToMinCount();
    await captureAndKeep(10);
    await waitFor(() => expect(screen.getByTestId('grid-slot-2')).toBeTruthy());

    fireEvent.press(screen.getByTestId('grid-slot-2'));
    await waitFor(() => expect(screen.getByTestId('capture-progress')).toBeTruthy());
    expect(screen.getByText('Retaking photo 3 of 10')).toBeTruthy();

    fireEvent.press(screen.getByTestId('capture-button'));
    await waitFor(() => expect(screen.getByTestId('keep-photo-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('keep-photo-button'));

    // Straight back to the grid (no "is the set full yet" detour) with still 10 photos.
    await waitFor(() => expect(screen.getByTestId('upload-all-button')).toBeTruthy());
    expect(screen.getByText(/^10 photos · tap one to retake it/)).toBeTruthy();
  });

  it('"Add Photo" on the grid grows the target and reopens the camera for one more shot', async () => {
    renderScreen();
    decrementToMinCount(); // target 10
    await captureAndKeep(10);
    await waitFor(() => expect(screen.getByTestId('add-photo-button')).toBeTruthy());

    fireEvent.press(screen.getByTestId('add-photo-button'));

    await waitFor(() => expect(screen.getByText('Photo 11 of')).toBeTruthy());
    expect(screen.getByTestId('capture-count-value').props.children).toBe(11);

    fireEvent.press(screen.getByTestId('capture-button'));
    await waitFor(() => expect(screen.getByTestId('keep-photo-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('keep-photo-button'));

    await waitFor(() => expect(screen.getByTestId('upload-all-button')).toBeTruthy());
    expect(screen.getByText(/^11 photos/)).toBeTruthy();
  });

  it('hides "Add Photo" once the set reaches MAX_BATCH_IMAGES', async () => {
    renderScreen();
    for (let i = 0; i < 20; i++) fireEvent.press(screen.getByLabelText('Increase photo count')); // target 30 (15 default + clamp)
    await captureAndKeep(30);

    await waitFor(() => expect(screen.getByTestId('upload-all-button')).toBeTruthy());
    expect(screen.queryByTestId('add-photo-button')).toBeNull();
  });
});

describe('submission requires a connection', () => {
  it('blocks Upload All and never builds the form data while offline', async () => {
    mockUseNetworkStatus.mockReturnValue({ isOnline: false });
    renderScreen();
    decrementToMinCount();
    await captureAndKeep(10);

    await waitFor(() => expect(screen.getByTestId('upload-all-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('upload-all-button'));

    expect(mockBuildBatchUploadFormData).not.toHaveBeenCalled();
    expect(mockUploadImageBatchViaXhr).not.toHaveBeenCalled();
  });
});
