/**
 * Screen-level tests for ImageCaptureScreen — executes CAP-01, CAP-02, CAP-03
 * from urolens-mobile/docs/mvp-tier1-test-cases.md §3 (Microscopy Image Capture).
 *
 * These complement tests/unit/imageUtils.test.ts (which covers the pure
 * capture/validation functions) by verifying the *screen's* state machine:
 * that capture never touches the network (CAP-01), that a resolution
 * rejection surfaces inline without leaving idle (CAP-02), and that Retake
 * discards the pending image locally / requires explicit confirmation before
 * calling the discard endpoint when replacing an existing result (CAP-03).
 *
 * A `testID="capture-button"` was added to the capture-ring TouchableOpacity
 * in the component to make this possible — it has no text/accessible name of
 * its own (icon-only), unlike Retake/Use This Image which are queryable by
 * accessible name directly.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

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
const mockBuildUploadFormData = jest.fn(() => new FormData());

// Error classes are declared *inside* the factory (not referenced from outer
// scope) because jest.mock factories run before any outer `class`/`const`
// declaration has executed — only "mock"-prefixed outer bindings referenced
// lazily (e.g. `(...args) => mockProcessCapture(...args)`) are safe to close
// over here; a direct value reference to an externally-declared class would
// have been undefined at factory-invocation time.
jest.mock('@lib/camera/imageUtils', () => {
  class ImageResolutionError extends Error {
    constructor(width: number, height: number) {
      super(`Image resolution ${width}×${height} is below the minimum 640×480 required for AI analysis.`);
      this.name = 'ImageResolutionError';
    }
  }
  class ImageFormatError extends Error {
    constructor(mimeType: string) {
      super(`Unsupported image format "${mimeType}".`);
      this.name = 'ImageFormatError';
    }
  }
  return {
    processCapture: (...args: unknown[]) => mockProcessCapture(...args),
    processPickerAsset: (...args: unknown[]) => mockProcessPickerAsset(...args),
    buildUploadFormData: (...args: unknown[]) => mockBuildUploadFormData(...args),
    ImageResolutionError,
    ImageFormatError,
  };
});

const mockApiPost = jest.fn();
jest.mock('@lib/apiClient', () => ({
  __esModule: true,
  default: { post: (...args: unknown[]) => mockApiPost(...args) },
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

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import { ImageCaptureScreen } from '../../../src/features/image-retake/components/ImageCaptureScreen';
import { ImageResolutionError } from '@lib/camera/imageUtils';

const fakeProcessedImage = {
  uri: 'file://processed-123.jpg',
  width: 1280,
  height: 960,
  mimeType: 'image/jpeg' as const,
  sizeBytes: 204800,
  filename: 'captured-123.jpg',
};

function renderScreen(props: Partial<{ specimenId: string; localSpecimenId: string; existingImageId?: string }> = {}) {
  return render(
    <ImageCaptureScreen
      specimenId={props.specimenId ?? 'specimen-server-1'}
      localSpecimenId={props.localSpecimenId ?? 'specimen-local-1'}
      existingImageId={props.existingImageId}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTakePictureAsync = jest.fn().mockResolvedValue({ uri: 'file://raw-capture.jpg', width: 1280, height: 960 });
  mockProcessCapture.mockResolvedValue(fakeProcessedImage);
});

// ─── CAP-01 ──────────────────────────────────────────────────────────────────

describe('CAP-01: capture stores image locally before any network call', () => {
  it('processes the capture and moves to preview without ever calling the API', async () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('capture-button'));

    await waitFor(() => {
      expect(screen.getByText('Image Preview')).toBeTruthy();
    });

    expect(mockProcessCapture).toHaveBeenCalledTimes(1);
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('shows the processed image dimensions in the preview header', async () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('capture-button'));

    await waitFor(() => {
      expect(screen.getByText(/1280 × 960px/)).toBeTruthy();
    });
  });
});

// ─── CAP-02 ──────────────────────────────────────────────────────────────────

describe('CAP-02: below-minimum resolution is caught client-side (screen level)', () => {
  it('surfaces the resolution error inline and stays on the idle camera screen', async () => {
    mockProcessCapture.mockRejectedValueOnce(new ImageResolutionError(320, 240));
    renderScreen();

    fireEvent.press(screen.getByTestId('capture-button'));

    await waitFor(() => {
      expect(screen.getByText(/320×240 is below the minimum/)).toBeTruthy();
    });

    // Never left idle for previewing, and no upload was attempted
    expect(screen.queryByText('Image Preview')).toBeNull();
    expect(mockApiPost).not.toHaveBeenCalled();
  });
});

// ─── CAP-03 ──────────────────────────────────────────────────────────────────

describe('CAP-03: preview → retake before commit', () => {
  it('a first-time capture (no existing result) discards locally on Retake — no network call', async () => {
    renderScreen({ existingImageId: undefined });

    fireEvent.press(screen.getByTestId('capture-button'));
    await waitFor(() => expect(screen.getByText('Image Preview')).toBeTruthy());

    fireEvent.press(screen.getByTestId('retake-button'));

    await waitFor(() => {
      // Back to idle: capture button visible again, preview gone
      expect(screen.getByTestId('capture-button')).toBeTruthy();
    });
    expect(screen.queryByText('Image Preview')).toBeNull();
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('retaking over an existing result requires explicit discard confirmation, not an immediate call', async () => {
    renderScreen({ existingImageId: 'existing-image-id-1' });

    fireEvent.press(screen.getByTestId('capture-button'));
    await waitFor(() => expect(screen.getByText('Image Preview')).toBeTruthy());

    fireEvent.press(screen.getByTestId('retake-button'));

    // Tapping Retake alone must not have discarded anything yet
    expect(mockApiPost).not.toHaveBeenCalled();
    // Still showing the previously captured image — nothing was silently reset
    expect(screen.getByText('Image Preview')).toBeTruthy();
  });

  it('confirming the discard modal calls the discard endpoint and returns to idle', async () => {
    mockApiPost.mockResolvedValueOnce({ data: {} });
    renderScreen({ existingImageId: 'existing-image-id-1' });

    fireEvent.press(screen.getByTestId('capture-button'));
    await waitFor(() => expect(screen.getByText('Image Preview')).toBeTruthy());

    fireEvent.press(screen.getByTestId('retake-button'));
    fireEvent.press(screen.getByRole('button', { name: 'Confirm discard and retake' }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/images/existing-image-id-1/discard');
    });
    await waitFor(() => {
      expect(screen.getByTestId('capture-button')).toBeTruthy();
    });
  });

  it('cancelling the discard modal keeps the pending preview image intact', async () => {
    renderScreen({ existingImageId: 'existing-image-id-1' });

    fireEvent.press(screen.getByTestId('capture-button'));
    await waitFor(() => expect(screen.getByText('Image Preview')).toBeTruthy());

    fireEvent.press(screen.getByTestId('retake-button'));
    fireEvent.press(screen.getByRole('button', { name: 'Cancel — keep current image' }));

    expect(mockApiPost).not.toHaveBeenCalled();
    expect(screen.getByText('Image Preview')).toBeTruthy();
  });
});
