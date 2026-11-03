/**
 * FieldCaptureSessionScreen — capture id behavior (backend #108, mobile-n8-todo-rem.md B2).
 *
 * The id is generated once per photo and must survive a retried "Use Image" after a
 * failed upload (so the server recognizes the retry as the same photo and doesn't
 * analyse it twice), but a retake or a fresh capture must get its own.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

jest.mock('expo-camera', () => ({
  useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
}));

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
  UIImagePickerPreferredAssetRepresentationMode: { Automatic: 'automatic' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

const mockProcessCapture = jest.fn();
jest.mock('@lib/camera/imageUtils', () => ({
  processCapture: (...args: unknown[]) => mockProcessCapture(...args),
  processPickerAsset: jest.fn(),
  isImageValidationError: () => false,
}));

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(() => ({ isOnline: true })),
}));

const mockSynchronize = jest.fn(() => Promise.resolve());
jest.mock('@db/sync/syncManager', () => ({
  synchronize: (...args: unknown[]) => mockSynchronize(...args),
}));

jest.mock('@features/field-capture/hooks/useCurrentlyUploadingFieldId', () => ({
  useCurrentlyUploadingFieldId: () => null,
}));

let mockIdCounter = 0;
jest.mock('@nozbe/watermelondb/utils/common', () => ({
  randomId: jest.fn(() => `capture-id-${++mockIdCounter}`),
}));

const mockCaptureField = jest.fn();
jest.mock('@features/field-capture/hooks/useFieldCapture', () => ({
  useFieldCapture: () => ({ captureField: mockCaptureField, isLoading: false }),
}));

jest.mock('@features/field-capture/hooks/useFieldActions', () => ({
  useFieldActions: () => ({ acceptField: jest.fn(), discardField: jest.fn(), isLoading: false }),
}));

jest.mock('@features/field-capture/hooks/useFieldList', () => ({
  useFieldList: () => ({
    fields: [],
    acceptedCount: 0,
    undecidedCount: 0,
    pendingDecisionsCount: 0,
    resultServerId: null,
    isLoading: false,
  }),
}));

const mockCreateQueuedFieldUpload = jest.fn();
jest.mock('@features/field-capture/lib/saveUploadedField', () => ({
  createQueuedFieldUpload: (...args: unknown[]) => mockCreateQueuedFieldUpload(...args),
}));

// Child screens stubbed down to the one control each test needs to press.
jest.mock('@features/image-retake/components/CameraPermissionRequest', () => ({
  CameraPermissionRequest: () => null,
}));
jest.mock('@features/image-retake/components/CameraUnavailableView', () => ({
  CameraUnavailableView: () => null,
}));
jest.mock('@features/image-retake/components/CameraLiveView', () => {
  const ReactActual = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    // The real component forwards cameraRef to expo-camera's CameraView; handleCapture
    // bails out while cameraRef.current is null, so this stub wires up a fake one too.
    CameraLiveView: ({
      cameraRef,
      onCapture,
      onGalleryPick,
    }: {
      cameraRef: { current: unknown };
      onCapture: () => void;
      onGalleryPick: () => void;
    }) => {
      ReactActual.useEffect(() => {
        cameraRef.current = {
          takePictureAsync: () => Promise.resolve({ uri: 'file:///tmp/raw.jpg' }),
        };
      }, [cameraRef]);
      return ReactActual.createElement(
        ReactActual.Fragment,
        null,
        ReactActual.createElement(
          Pressable,
          { testID: 'capture-btn', onPress: onCapture },
          ReactActual.createElement(Text, null, 'Capture'),
        ),
        ReactActual.createElement(
          Pressable,
          { testID: 'gallery-btn', onPress: onGalleryPick },
          ReactActual.createElement(Text, null, 'Gallery'),
        ),
      );
    },
  };
});
jest.mock('@features/image-retake/components/image-preview-panel', () => {
  const ReactActual = require('react');
  const { Pressable, Text, View } = require('react-native');
  return {
    ImagePreviewPanel: ({
      onUseImage,
      onRetake,
    }: {
      onUseImage: () => void;
      onRetake: () => void;
    }) =>
      ReactActual.createElement(
        View,
        null,
        ReactActual.createElement(
          Pressable,
          { testID: 'use-image-btn', onPress: onUseImage },
          ReactActual.createElement(Text, null, 'Use This Image'),
        ),
        ReactActual.createElement(
          Pressable,
          { testID: 'retake-btn', onPress: onRetake },
          ReactActual.createElement(Text, null, 'Retake'),
        ),
      ),
  };
});
jest.mock('@features/image-retake/components/UploadProgressView', () => ({
  UploadProgressView: () => null,
}));
jest.mock('../../../src/features/field-capture/components/FieldResultScreen', () => ({
  FieldResultScreen: () => null,
}));

import { FieldCaptureSessionScreen } from '../../../src/features/field-capture/components/FieldCaptureSessionScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockIdCounter = 0;
  mockProcessCapture.mockResolvedValue({
    uri: 'file:///tmp/photo.jpg',
    width: 1000,
    height: 1000,
    mimeType: 'image/jpeg',
    sizeBytes: 1000,
    filename: 'photo.jpg',
  });
});

async function capture(): Promise<void> {
  fireEvent.press(await screen.findByTestId('capture-btn'));
  await waitFor(() => screen.getByTestId('use-image-btn'));
}

describe('FieldCaptureSessionScreen capture id', () => {
  it('reuses the same capture id when Use Image is retried after a failed upload', async () => {
    mockCaptureField.mockResolvedValue({ status: 'failed', message: 'boom' });
    render(<FieldCaptureSessionScreen specimenId="srv-1" localSpecimenId="local-1" />);

    await capture();
    fireEvent.press(screen.getByTestId('use-image-btn'));
    await waitFor(() => expect(mockCaptureField).toHaveBeenCalledTimes(1));

    // The failure returns the screen to the preview phase with the same image.
    await waitFor(() => screen.getByTestId('use-image-btn'));
    fireEvent.press(screen.getByTestId('use-image-btn'));
    await waitFor(() => expect(mockCaptureField).toHaveBeenCalledTimes(2));

    const firstCaptureId = mockCaptureField.mock.calls[0][4];
    const secondCaptureId = mockCaptureField.mock.calls[1][4];
    expect(secondCaptureId).toBe(firstCaptureId);
  });

  it('gets a new capture id after a retake', async () => {
    mockCaptureField.mockResolvedValue({ status: 'failed', message: 'boom' });
    render(<FieldCaptureSessionScreen specimenId="srv-1" localSpecimenId="local-1" />);

    await capture();
    fireEvent.press(screen.getByTestId('retake-btn'));

    await capture();
    fireEvent.press(screen.getByTestId('use-image-btn'));
    await waitFor(() => expect(mockCaptureField).toHaveBeenCalledTimes(1));

    expect(mockCaptureField.mock.calls[0][4]).toBe('capture-id-2');
  });

  it('sends the capture id with a queued offline upload', async () => {
    jest.requireMock('@hooks/useNetworkStatus').useNetworkStatus.mockReturnValue({
      isOnline: false,
    });
    mockCreateQueuedFieldUpload.mockResolvedValue('local-field-1');
    render(<FieldCaptureSessionScreen specimenId="srv-1" localSpecimenId="local-1" />);

    await capture();
    fireEvent.press(screen.getByTestId('use-image-btn'));

    await waitFor(() =>
      expect(mockCreateQueuedFieldUpload).toHaveBeenCalledWith(
        'srv-1',
        'HPF',
        'file:///tmp/photo.jpg',
        'capture-id-1',
      ),
    );
  });
});

// Gallery multi-select: queued and uploaded in the background, one at a time,
// instead of the single-pick preview/confirm flow above.
describe('FieldCaptureSessionScreen bulk gallery pick', () => {
  const launchImageLibraryAsync = jest.requireMock('expo-image-picker').launchImageLibraryAsync;
  const processPickerAsset = jest.requireMock('@lib/camera/imageUtils').processPickerAsset;

  beforeEach(() => {
    mockCreateQueuedFieldUpload.mockResolvedValue('local-field-id');
    // Earlier tests in this file switch the shared useNetworkStatus mock to
    // offline and jest.clearAllMocks() doesn't undo a mockReturnValue — reset
    // it explicitly so this describe block isn't order-dependent on them.
    jest.requireMock('@hooks/useNetworkStatus').useNetworkStatus.mockReturnValue({
      isOnline: true,
    });
  });

  it('queues every valid asset sequentially, skips invalid ones, and syncs once while online', async () => {
    launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'a.jpg' }, { uri: 'b.jpg' }, { uri: 'c.jpg' }],
    });
    processPickerAsset
      .mockResolvedValueOnce({ uri: 'file:///a.jpg' })
      .mockRejectedValueOnce(new Error('bad format'))
      .mockResolvedValueOnce({ uri: 'file:///c.jpg' });

    render(<FieldCaptureSessionScreen specimenId="srv-1" localSpecimenId="local-1" />);
    fireEvent.press(await screen.findByTestId('gallery-btn'));

    await waitFor(() => expect(mockCreateQueuedFieldUpload).toHaveBeenCalledTimes(2));
    expect(mockCreateQueuedFieldUpload).toHaveBeenNthCalledWith(
      1,
      'srv-1',
      'HPF',
      'file:///a.jpg',
      expect.any(String),
    );
    expect(mockCreateQueuedFieldUpload).toHaveBeenNthCalledWith(
      2,
      'srv-1',
      'HPF',
      'file:///c.jpg',
      expect.any(String),
    );
    await waitFor(() => expect(mockSynchronize).toHaveBeenCalledTimes(1));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Fields Queued',
      expect.stringContaining('2 fields queued'),
    );
    // The camera stays usable throughout — no preview/blocking phase is entered.
    expect(screen.getByTestId('capture-btn')).toBeTruthy();
  });

  it('does not kick off a sync while offline, leaving the rows queued for later', async () => {
    jest.requireMock('@hooks/useNetworkStatus').useNetworkStatus.mockReturnValue({
      isOnline: false,
    });
    launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'a.jpg' }, { uri: 'b.jpg' }],
    });
    processPickerAsset.mockResolvedValue({ uri: 'file:///a.jpg' });

    render(<FieldCaptureSessionScreen specimenId="srv-1" localSpecimenId="local-1" />);
    fireEvent.press(await screen.findByTestId('gallery-btn'));

    await waitFor(() => expect(mockCreateQueuedFieldUpload).toHaveBeenCalledTimes(2));
    expect(mockSynchronize).not.toHaveBeenCalled();
  });

  it('reports that nothing was queued when every asset fails to process', async () => {
    launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'a.jpg' }, { uri: 'b.jpg' }],
    });
    processPickerAsset.mockRejectedValue(new Error('bad format'));

    render(<FieldCaptureSessionScreen specimenId="srv-1" localSpecimenId="local-1" />);
    fireEvent.press(await screen.findByTestId('gallery-btn'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Fields Queued',
        expect.stringContaining('2 images could not be processed'),
      ),
    );
    expect(mockCreateQueuedFieldUpload).not.toHaveBeenCalled();
    expect(mockSynchronize).not.toHaveBeenCalled();
  });
});
