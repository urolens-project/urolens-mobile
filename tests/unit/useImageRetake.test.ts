/**
 * Unit tests for useImageRetake hook (T2.7)
 *
 * Covers:
 *  - Initial state (idle)
 *  - Gallery upload: selecting → processing → uploading → success
 *  - Gallery cancelled: selecting → idle
 *  - Camera path returns to idle (capture is driven by the component)
 *  - Camera permission denied → error
 *  - Gallery permission denied → error
 *  - Resolution validation failure → error
 *  - API error → error (Axios error envelope parsed)
 *  - discard: calls POST /images/{id}/discard and resets to idle
 *  - discard API error → error
 *  - reset() returns to idle from any state
 */

// ─── Mocks (hoisted before imports) ─────────────────────────────────────────

jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(),
  },
  CameraType: { back: 'back' },
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('@lib/camera/imageUtils', () => ({
  processCapture: jest.fn(),
  processPickerAsset: jest.fn(),
  buildUploadFormData: jest.fn().mockReturnValue(new FormData()),
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

jest.mock('@lib/apiClient', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import { renderHook, act } from '@testing-library/react-native';
import { useImageRetake } from '../../src/features/image-retake/hooks/useImageRetake';
import apiClient from '../../src/lib/apiClient';
import * as imageUtils from '../../src/lib/camera/imageUtils';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';

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
      result_id: 'result-uuid',
      specimen_id: 'specimen-uuid',
      image_id: 'image-uuid',
      status: 'PENDING_CONFIRM',
      ai_findings: null,
      flagged_anomalies: null,
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
  (imageUtils.buildUploadFormData as jest.Mock).mockReturnValue(new FormData());
  (apiClient.post as jest.Mock).mockResolvedValue(makeUploadResponse());
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

  describe('gallery upload — happy path', () => {
    it('ends in success phase with PENDING_CONFIRM status', async () => {
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.selectAndUpload('gallery', 'specimen-uuid');
      });

      expect(result.current.state.phase).toBe('success');
      if (result.current.state.phase === 'success') {
        expect(result.current.state.status).toBe('PENDING_CONFIRM');
        expect(result.current.state.resultId).toBe('result-uuid');
      }
    });

    it('stores the processed image in capturedImage', async () => {
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.selectAndUpload('gallery', 'specimen-uuid');
      });

      expect(result.current.capturedImage).toEqual(mockProcessedImage);
    });

    it('calls apiClient.post with the upload endpoint and clears Content-Type', async () => {
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.selectAndUpload('gallery', 'specimen-uuid');
      });

      // Content-Type must be undefined so React Native XHR sets the boundary
      expect(apiClient.post).toHaveBeenCalledWith(
        '/images/upload',
        expect.anything(),
        expect.objectContaining({ headers: { 'Content-Type': undefined } }),
      );
    });

    it('surfaces ai_findings in success state when server returns them', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue(
        makeUploadResponse({ ai_findings: { RBC: 3, WBC: 1 } }),
      );
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.selectAndUpload('gallery', 'specimen-uuid');
      });

      if (result.current.state.phase === 'success') {
        expect(result.current.state.aiFindings).toEqual({ RBC: 3, WBC: 1 });
      }
    });
  });

  describe('gallery — cancelled', () => {
    it('returns to idle when the user cancels the picker', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: true,
        assets: [],
      });
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.selectAndUpload('gallery', 'specimen-uuid');
      });

      expect(result.current.state.phase).toBe('idle');
      expect(apiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('camera path', () => {
    it('returns to idle after permission granted (capture driven by component)', async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.selectAndUpload('camera', 'specimen-uuid');
      });

      expect(result.current.state.phase).toBe('idle');
    });

    it('transitions to error phase when camera permission is denied', async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.selectAndUpload('camera', 'specimen-uuid');
      });

      expect(result.current.state.phase).toBe('error');
      if (result.current.state.phase === 'error') {
        expect(result.current.state.message).toContain('Camera permission');
      }
    });
  });

  describe('permission errors', () => {
    it('transitions to error when gallery permission is denied', async () => {
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.selectAndUpload('gallery', 'specimen-uuid');
      });

      expect(result.current.state.phase).toBe('error');
      if (result.current.state.phase === 'error') {
        expect(result.current.state.message).toContain('Photo library permission');
      }
    });
  });

  describe('validation errors', () => {
    it('transitions to error when image resolution is too low', async () => {
      const { ImageResolutionError } = jest.requireActual(
        '../../src/lib/camera/imageUtils',
      ) as typeof imageUtils;
      (imageUtils.processPickerAsset as jest.Mock).mockRejectedValue(
        new ImageResolutionError(320, 240),
      );
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.selectAndUpload('gallery', 'specimen-uuid');
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
        await result.current.selectAndUpload('gallery', 'specimen-uuid');
      });

      expect(result.current.state.phase).toBe('error');
      if (result.current.state.phase === 'error') {
        expect(result.current.state.message).toContain('image/bmp');
      }
    });
  });

  describe('API errors', () => {
    it('transitions to error when upload fails', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('network timeout'));
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.selectAndUpload('gallery', 'specimen-uuid');
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
      (apiClient.post as jest.Mock).mockRejectedValue(axiosError);
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.selectAndUpload('gallery', 'specimen-uuid');
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
        await result.current.discardImage('image-abc');
      });

      expect(result.current.state.phase).toBe('idle');
      expect(result.current.capturedImage).toBeNull();
    });

    it('transitions to error when discard API call fails', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('server error'));
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.discardImage('image-abc');
      });

      expect(result.current.state.phase).toBe('error');
    });
  });

  describe('reset()', () => {
    it('returns to idle from success state', async () => {
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.selectAndUpload('gallery', 'specimen-uuid');
      });
      expect(result.current.state.phase).toBe('success');

      act(() => {
        result.current.reset();
      });

      expect(result.current.state.phase).toBe('idle');
      expect(result.current.capturedImage).toBeNull();
    });

    it('returns to idle from error state', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('fail'));
      const { result } = renderHook(() => useImageRetake());

      await act(async () => {
        await result.current.selectAndUpload('gallery', 'specimen-uuid');
      });
      expect(result.current.state.phase).toBe('error');

      act(() => {
        result.current.reset();
      });

      expect(result.current.state.phase).toBe('idle');
    });
  });
});
