/**
 * Unit tests for useImageRetake hook (T2.7)
 *
 * The hook splits capture/pick from upload into two steps so the UI can show
 * a preview the MedTech can retake before committing to the upload:
 *   pickFromGallery() / captureFromCamera() → previewing → confirmUpload()
 *
 * Covers:
 *  - Initial state (idle)
 *  - Gallery pick: happy path → previewing, cancelled → idle, permission denied → error
 *  - Gallery pick validation failures (resolution / format) → error
 *  - Camera capture: happy path → previewing, no picture → idle, processing failure → error
 *  - confirmUpload: happy path calls uploadImageViaXhr with progress reporting
 *  - confirmUpload API error → error (Axios-style error envelope parsed)
 *  - confirmUpload with no captured image → throws
 *  - discardImage: calls POST /images/{id}/discard and resets to idle
 *  - discardImage API error → error
 *  - reset() returns to idle from any state
 */

// ─── Mocks (hoisted before imports) ─────────────────────────────────────────

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('@lib/camera/imageUtils', () => ({
  processCapture: jest.fn(),
  processPickerAsset: jest.fn(),
  buildUploadFormData: jest.fn(),
  ImageResolutionError: class ImageResolutionError extends Error {
    constructor(w: number, h: number) {
      super(`Image resolution ${w}×${h} is below the minimum 640×480.`);
      this.name = 'ImageResolutionError';
    }
  },
  ImageFormatError: class ImageFormatError extends Error {
    constructor(mime: string) {
      super(`Unsupported image format "${mime}".`);
      this.name = 'ImageFormatError';
    }
  },
}));

jest.mock('@lib/camera/uploadImage', () => ({
  uploadImageViaXhr: jest.fn(),
}));

jest.mock('@lib/apiClient', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import { renderHook, act } from '@testing-library/react-native';
import { useImageRetake } from '../../src/features/image-retake/hooks/useImageRetake';
import apiClient from '../../src/lib/apiClient';
import * as imageUtils from '../../src/lib/camera/imageUtils';
import { uploadImageViaXhr } from '../../src/lib/camera/uploadImage';
import * as ImagePicker from 'expo-image-picker';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockProcessedImage = {
  uri: 'file://test.jpg',
  width: 1280,
  height: 960,
  mimeType: 'image/jpeg' as const,
  sizeBytes: 204800,
  filename: 'captured-123.jpg',
};

const mockGalleryAsset = {
  uri: 'file://gallery.jpg',
  width: 1280,
  height: 960,
  fileName: 'gallery.jpg',
  mimeType: 'image/jpeg',
};

function makeUploadResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      id: 'result-uuid',
      resultId: 'result-uuid',
      specimenId: 'specimen-uuid',
      imageId: 'image-uuid',
      status: 'PENDING_CONFIRM',
      aiFindings: null,
      flaggedAnomalies: null,
      ...overrides,
    },
  };
}

// ─── Test setup ──────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
    status: 'granted',
  });
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [mockGalleryAsset],
  });
  (imageUtils.processPickerAsset as jest.Mock).mockResolvedValue(mockProcessedImage);
  (imageUtils.processCapture as jest.Mock).mockResolvedValue(mockProcessedImage);
  (imageUtils.buildUploadFormData as jest.Mock).mockResolvedValue(new FormData());
  (uploadImageViaXhr as jest.Mock).mockResolvedValue(makeUploadResponse());
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useImageRetake', () => {
  describe('initial state', () => {
    it('starts in idle phase', () => {
      const { result } = renderHook(() => useImageRetake());
      expect(result.current.state.phase).toBe('idle');
    });

    it('starts with no captured image', () => {
      const { result } = renderHook(() => useImageRetake());
      expect(result.current.capturedImage).toBeNull();
    });
  });

  describe('pickFromGallery()', () => {
    it('ends in previewing phase and stores the processed image', async () => {
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.pickFromGallery();
      });

      expect(result.current.state.phase).toBe('previewing');
      expect(result.current.capturedImage).toEqual(mockProcessedImage);
    });

    it('returns to idle when the user cancels the picker', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: true,
        assets: [],
      });
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.pickFromGallery();
      });

      expect(result.current.state.phase).toBe('idle');
      expect(imageUtils.processPickerAsset).not.toHaveBeenCalled();
    });

    it('transitions to error when gallery permission is denied', async () => {
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.pickFromGallery();
      });

      expect(result.current.state.phase).toBe('error');
      if (result.current.state.phase === 'error') {
        expect(result.current.state.message).toContain('Photo library permission');
      }
    });

    it('transitions to error when image resolution is too low', async () => {
      const { ImageResolutionError } = jest.requireActual(
        '../../src/lib/camera/imageUtils',
      ) as typeof imageUtils;
      (imageUtils.processPickerAsset as jest.Mock).mockRejectedValue(
        new ImageResolutionError(320, 240),
    it('surfaces aiFindings in success state when server returns them', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue(
        makeUploadResponse({ aiFindings: { RBC: 3, WBC: 1 } }),
      );
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.pickFromGallery();
      });

      expect(result.current.state.phase).toBe('error');
      if (result.current.state.phase === 'error') {
        expect(result.current.state.message).toContain('320×240');
      }
    });

    it('transitions to error when image format is unsupported', async () => {
      const { ImageFormatError } = jest.requireActual(
        '../../src/lib/camera/imageUtils',
      ) as typeof imageUtils;
      (imageUtils.processPickerAsset as jest.Mock).mockRejectedValue(
        new ImageFormatError('image/bmp'),
      );
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.pickFromGallery();
      });

      expect(result.current.state.phase).toBe('error');
      if (result.current.state.phase === 'error') {
        expect(result.current.state.message).toContain('image/bmp');
      }
    });
  });

  describe('captureFromCamera()', () => {
    it('ends in previewing phase and stores the processed image', async () => {
      const takePicture = jest.fn().mockResolvedValue({ uri: 'file://photo.jpg' });
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.captureFromCamera(takePicture);
      });

      expect(result.current.state.phase).toBe('previewing');
      expect(result.current.capturedImage).toEqual(mockProcessedImage);
    });

    it('returns to idle when no picture is returned', async () => {
      const takePicture = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.captureFromCamera(takePicture);
      });

      expect(result.current.state.phase).toBe('idle');
      expect(imageUtils.processCapture).not.toHaveBeenCalled();
    });

    it('transitions to error when processing the capture fails', async () => {
      const { ImageResolutionError } = jest.requireActual(
        '../../src/lib/camera/imageUtils',
      ) as typeof imageUtils;
      (imageUtils.processCapture as jest.Mock).mockRejectedValue(
        new ImageResolutionError(320, 240),
      );
      const takePicture = jest.fn().mockResolvedValue({ uri: 'file://photo.jpg' });
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.captureFromCamera(takePicture);
      });

      expect(result.current.state.phase).toBe('error');
    });
  });

  describe('confirmUpload()', () => {
    it('throws when no image has been captured yet', async () => {
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await expect(result.current.confirmUpload('specimen-uuid')).rejects.toThrow(
          'No image has been captured yet.',
        );
      });
    });

    it('builds the form and uploads via uploadImageViaXhr, reporting progress', async () => {
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.pickFromGallery();
      });

      let response;
      await act(async () => {
        response = await result.current.confirmUpload('specimen-uuid');
      });

      expect(imageUtils.buildUploadFormData).toHaveBeenCalledWith(
        mockProcessedImage,
        'specimen-uuid',
      );
      expect(uploadImageViaXhr).toHaveBeenCalledWith(
        expect.any(FormData),
        expect.any(AbortSignal),
        expect.any(Function),
      );
      expect(response).toEqual(makeUploadResponse());
    });

    it('surfaces ai_findings from the server response', async () => {
      (uploadImageViaXhr as jest.Mock).mockResolvedValue(
        makeUploadResponse({ ai_findings: { RBC: 3, WBC: 1 } }),
      );
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.pickFromGallery();
      });

      let response;
      await act(async () => {
        response = await result.current.confirmUpload('specimen-uuid');
      });

      expect(response).toEqual(
        expect.objectContaining({ ai_findings: { RBC: 3, WBC: 1 } }),
      );
    });

    it('transitions to error when the upload fails', async () => {
      (uploadImageViaXhr as jest.Mock).mockRejectedValue(new Error('network timeout'));
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.pickFromGallery();
      });

      await act(async () => {
        await expect(result.current.confirmUpload('specimen-uuid')).rejects.toThrow(
          'network timeout',
        );
      });

      expect(result.current.state.phase).toBe('error');
      if (result.current.state.phase === 'error') {
        expect(result.current.state.message).toBe('network timeout');
      }
    });

    it('extracts the server error envelope message on 422', async () => {
      const axiosError = Object.assign(new Error('Request failed'), {
        response: { data: { error: { message: 'Unsupported image format. Accepted: JPEG, PNG.' } } },
      });
      (uploadImageViaXhr as jest.Mock).mockRejectedValue(axiosError);
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.pickFromGallery();
      });

      await act(async () => {
        await expect(result.current.confirmUpload('specimen-uuid')).rejects.toThrow();
      });

      if (result.current.state.phase === 'error') {
        expect(result.current.state.message).toBe('Unsupported image format. Accepted: JPEG, PNG.');
      }
    });
  });

  describe('discardImage()', () => {
    it('calls POST /images/{id}/discard with the correct path', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.discardImage('image-abc');
      });

      expect(apiClient.post).toHaveBeenCalledWith('/images/image-abc/discard');
    });

    it('resets to idle after successful discard', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.pickFromGallery();
      });
      await act(async () => {
        await result.current.discardImage('image-abc');
      });

      expect(result.current.state.phase).toBe('idle');
      expect(result.current.capturedImage).toBeNull();
    });

    it('transitions to error when discard API call fails', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('server error'));
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await expect(result.current.discardImage('image-abc')).rejects.toThrow(
          'server error',
        );
      });

      expect(result.current.state.phase).toBe('error');
    });
  });

  describe('reset()', () => {
    it('returns to idle from previewing state', async () => {
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.pickFromGallery();
      });
      expect(result.current.state.phase).toBe('previewing');

      act(() => {
        result.current.reset();
      });

      expect(result.current.state.phase).toBe('idle');
      expect(result.current.capturedImage).toBeNull();
    });

    it('returns to idle from error state', async () => {
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.pickFromGallery();
      });
      expect(result.current.state.phase).toBe('error');

      act(() => {
        result.current.reset();
      });

      expect(result.current.state.phase).toBe('idle');
    });
  });
});
