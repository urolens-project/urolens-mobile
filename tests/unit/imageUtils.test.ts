/**
 * Unit tests for imageUtils (T2.7)
 *
 * Covers:
 *  - ImageResolutionError: message format, name, instanceof
 *  - ImageFormatError: message format, name, instanceof
 *  - buildUploadFormData: fields appended to FormData
 *  - processCapture: JPEG default, resolution guard, EXIF strip call
 *  - processPickerAsset: missing URI guard, PNG path, filename fallback
 *  - sizeBytes falls back to 0 when fetch is unavailable
 */

// ─── Mocks (hoisted before imports) ─────────────────────────────────────────

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {
    manipulate: jest.fn(),
  },
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

// expo-camera is import-only (types) — auto-mocked to avoid native module error
jest.mock('expo-camera', () => ({
  CameraType: { back: 'back' },
}));

jest.mock('expo-image-picker', () => ({}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import {
  ImageResolutionError,
  ImageFormatError,
  buildUploadFormData,
  processCapture,
  processPickerAsset,
  MIN_WIDTH,
  MIN_HEIGHT,
  type ProcessedImage,
} from '../../src/lib/camera/imageUtils';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeImageRef(overrides: { width?: number; height?: number } = {}) {
  const width = overrides.width ?? 1280;
  const height = overrides.height ?? 960;
  const mockSaveAsync = jest.fn().mockResolvedValue({
    uri: 'file://processed.jpg',
    width,
    height,
  });
  return { width, height, saveAsync: mockSaveAsync };
}

function setupManipulator(imageRef = makeImageRef()) {
  const mockRenderAsync = jest.fn().mockResolvedValue(imageRef);
  const mockContext = { renderAsync: mockRenderAsync };
  (ImageManipulator.manipulate as jest.Mock).mockReturnValue(mockContext);
  return { imageRef, mockContext, mockRenderAsync };
}

const mockProcessedImage: ProcessedImage = {
  uri: 'file://test.jpg',
  width: 1280,
  height: 960,
  mimeType: 'image/jpeg',
  sizeBytes: 204800,
  filename: 'test.jpg',
};

// ─── Test setup ──────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Default: fetch resolves with a blob of known size
  global.fetch = jest.fn().mockResolvedValue({
    blob: () => Promise.resolve({ size: 102400 }),
  }) as jest.Mock;
});

afterEach(() => {
  // Restore fetch so other test files are not affected
  delete (global as Record<string, unknown>).fetch;
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ImageResolutionError', () => {
  it('includes both dimensions in the error message', () => {
    const err = new ImageResolutionError(320, 240);
    expect(err.message).toContain('320×240');
  });

  it('references the minimum required resolution', () => {
    const err = new ImageResolutionError(400, 300);
    expect(err.message).toContain(`${MIN_WIDTH}×${MIN_HEIGHT}`);
  });

  it('sets the error name to ImageResolutionError', () => {
    expect(new ImageResolutionError(1, 1).name).toBe('ImageResolutionError');
  });

  it('is an instance of Error', () => {
    expect(new ImageResolutionError(1, 1)).toBeInstanceOf(Error);
  });
});

describe('ImageFormatError', () => {
  it('includes the rejected MIME type in the message', () => {
    const err = new ImageFormatError('image/bmp');
    expect(err.message).toContain('image/bmp');
  });

  it('sets the error name to ImageFormatError', () => {
    expect(new ImageFormatError('image/bmp').name).toBe('ImageFormatError');
  });

  it('is an instance of Error', () => {
    expect(new ImageFormatError('image/bmp')).toBeInstanceOf(Error);
  });
});

describe('buildUploadFormData', () => {
  it('returns a FormData instance', () => {
    const form = buildUploadFormData(mockProcessedImage, 'specimen-abc');
    expect(form).toBeInstanceOf(FormData);
  });

  it('appends specimen_id with the correct value', () => {
    const appendSpy = jest.spyOn(FormData.prototype, 'append');
    buildUploadFormData(mockProcessedImage, 'specimen-abc');
    expect(appendSpy).toHaveBeenCalledWith('specimen_id', 'specimen-abc');
    appendSpy.mockRestore();
  });

  it('appends file with uri, name, and type from the ProcessedImage', () => {
    const appendSpy = jest.spyOn(FormData.prototype, 'append');
    buildUploadFormData(mockProcessedImage, 'specimen-abc');
    expect(appendSpy).toHaveBeenCalledWith(
      'file',
      expect.objectContaining({
        uri: mockProcessedImage.uri,
        name: mockProcessedImage.filename,
        type: mockProcessedImage.mimeType,
      }),
    );
    appendSpy.mockRestore();
  });
});

describe('processCapture', () => {
  it('calls ImageManipulator.manipulate with the picture URI', async () => {
    setupManipulator();
    await processCapture({ uri: 'file://photo.jpg', width: 1280, height: 960 } as any);
    expect(ImageManipulator.manipulate).toHaveBeenCalledWith('file://photo.jpg');
  });

  it('returns mimeType image/jpeg by default (camera always produces JPEG)', async () => {
    setupManipulator();
    const result = await processCapture({ uri: 'file://photo.jpg', width: 1280, height: 960 } as any);
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('returns the URI from ImageManipulator saveAsync output', async () => {
    const imageRef = makeImageRef();
    imageRef.saveAsync.mockResolvedValue({ uri: 'file://stripped.jpg', width: 1280, height: 960 });
    setupManipulator(imageRef);
    const result = await processCapture({ uri: 'file://photo.jpg' } as any);
    expect(result.uri).toBe('file://stripped.jpg');
  });

  it('throws ImageResolutionError when manipulated width is below minimum', async () => {
    setupManipulator(makeImageRef({ width: MIN_WIDTH - 1, height: MIN_HEIGHT }));
    await expect(
      processCapture({ uri: 'file://tiny.jpg' } as any),
    ).rejects.toBeInstanceOf(ImageResolutionError);
  });

  it('throws ImageResolutionError when manipulated height is below minimum', async () => {
    setupManipulator(makeImageRef({ width: MIN_WIDTH, height: MIN_HEIGHT - 1 }));
    await expect(
      processCapture({ uri: 'file://tiny.jpg' } as any),
    ).rejects.toBeInstanceOf(ImageResolutionError);
  });

  it('accepts an image at exactly the minimum resolution', async () => {
    setupManipulator(makeImageRef({ width: MIN_WIDTH, height: MIN_HEIGHT }));
    await expect(
      processCapture({ uri: 'file://exact.jpg' } as any),
    ).resolves.toMatchObject({ width: MIN_WIDTH, height: MIN_HEIGHT });
  });

  it('reads sizeBytes from the fetch blob', async () => {
    setupManipulator();
    const result = await processCapture({ uri: 'file://photo.jpg' } as any);
    expect(result.sizeBytes).toBe(102400);
  });

  it('falls back to sizeBytes=0 when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as jest.Mock;
    setupManipulator();
    const result = await processCapture({ uri: 'file://photo.jpg' } as any);
    expect(result.sizeBytes).toBe(0);
  });

  it('saves with compress=0.92 and JPEG format', async () => {
    const imageRef = makeImageRef();
    setupManipulator(imageRef);
    await processCapture({ uri: 'file://photo.jpg' } as any);
    expect(imageRef.saveAsync).toHaveBeenCalledWith({
      compress: 0.92,
      format: SaveFormat.JPEG,
    });
  });

  it('filename includes the stem "captured" and ends with .jpg', async () => {
    setupManipulator();
    const result = await processCapture({ uri: 'file://photo.jpg' } as any);
    expect(result.filename).toMatch(/^captured-\d+\.jpg$/);
  });
});

describe('processPickerAsset', () => {
  it('throws ImageFormatError when asset has no URI', async () => {
    await expect(
      processPickerAsset({ uri: '', width: 1280, height: 960 } as any),
    ).rejects.toBeInstanceOf(ImageFormatError);
  });

  it('uses image/png format when mimeType is image/png', async () => {
    setupManipulator();
    const result = await processPickerAsset({
      uri: 'file://shot.png',
      width: 1280,
      height: 960,
      mimeType: 'image/png',
    } as any);
    expect(result.mimeType).toBe('image/png');
  });

  it('saves with PNG SaveFormat when mimeType is image/png', async () => {
    const imageRef = makeImageRef();
    setupManipulator(imageRef);
    await processPickerAsset({
      uri: 'file://shot.png',
      width: 1280,
      height: 960,
      mimeType: 'image/png',
    } as any);
    expect(imageRef.saveAsync).toHaveBeenCalledWith(
      expect.objectContaining({ format: SaveFormat.PNG }),
    );
  });

  it('falls back to image/jpeg for unsupported mimeType', async () => {
    setupManipulator();
    const result = await processPickerAsset({
      uri: 'file://shot.heic',
      width: 1280,
      height: 960,
      mimeType: 'image/heic',
    } as any);
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('uses the asset fileName in the output filename', async () => {
    setupManipulator();
    const result = await processPickerAsset({
      uri: 'file://shot.jpg',
      width: 1280,
      height: 960,
      fileName: 'microscope-001.jpg',
    } as any);
    expect(result.filename).toMatch(/^microscope-001\.jpg-\d+\.jpg$/);
  });

  it('falls back to "gallery-image" stem when fileName is null', async () => {
    setupManipulator();
    const result = await processPickerAsset({
      uri: 'file://shot.jpg',
      width: 1280,
      height: 960,
      fileName: null,
    } as any);
    expect(result.filename).toMatch(/^gallery-image-\d+\.jpg$/);
  });
});
