// src/features/image-retake/constants/imageRetakeText.constant.ts
/** User-facing copy for the Image Capture & Retake flow (T2.7). */
export const IMAGE_RETAKE_TEXT = {
  // Shared across the camera screens (live view, permission request, unavailable view, preview)
  leaveCaptureA11yLabel: 'Leave capture',
  uploadFromGalleryLabel: 'Upload from Gallery Instead',
  cancelLabel: 'Cancel',
  retakeLabel: 'Retake',

  // CameraLiveView
  cameraTitle: 'Specimen Capture',
  cameraInstructionText:
    'Position the microscope eyepiece over the camera lens. Min. resolution: 640 × 480.',
  galleryButtonLabel: 'Gallery',

  // CameraPermissionRequest
  cameraPermissionTitle: 'Camera Access Required',
  cameraPermissionBody: 'UroLens needs camera access to photograph specimens for AI analysis.',
  grantPermissionLabel: 'Grant Permission',

  // CameraUnavailableView
  cameraUnavailableTitle: 'Camera Unavailable',
  cameraMountErrorMessage:
    'The camera could not be started on this device. You can still upload an image from the gallery.',

  // ImageCaptureScreen — capture/upload flow errors and alerts
  captureFailedMessage: 'Failed to capture image. Please try again.',
  galleryPickFailedMessage: 'Could not process the selected image. Please try another.',
  galleryAccessDeniedTitle: 'Gallery Access Denied',
  galleryAccessDeniedMessage:
    'UroLens could not access your photo library. Allow Photos access in Settings, or take a photo instead.',
  missingSpecimenIdTitle: 'Missing Specimen ID',
  missingSpecimenIdMessage:
    'The specimen server ID was not passed to this screen. Go back and try again.',
  offlineUploadBlockedMessage:
    'A connection is required to upload this image. Connect and try again.',
  uploadFailedTitle: 'Upload Failed',
  discardFailedTitle: 'Error',
  discardFailedMessage: 'Could not discard the image. Please try again.',
  uploadFailedFallbackMessage: 'Upload failed. Please check your connection and try again.',

  // DiscardConfirmationModal
  discardModalTitle: 'Discard this image?',
  discardModalBody:
    'The current image and its AI analysis will be discarded. You will need to recapture a new specimen image. This action cannot be undone.',
  keepImageLabel: 'Keep Image',
  discardAndRetakeLabel: 'Discard & Retake',
  cancelDiscardA11yLabel: 'Cancel — keep current image',
  confirmDiscardA11yLabel: 'Confirm discard and retake',

  // ImagePreviewPanel
  imagePreviewTitle: 'Image Preview',
  useThisImageLabel: 'Use This Image',

  // UploadProgressView
  uploadingImageTitle: 'Uploading image…',
  uploadSubtitle: 'AI analysis will begin automatically',

  // useImageRetake hook errors
  galleryPermissionRequiredMessage:
    'Photo library permission is required. Please enable it in Settings.',
  noImageCapturedMessage: 'No image has been captured yet.',
  unexpectedErrorMessage: 'An unexpected error occurred. Please try again.',

  // confirmRetake
  discardOverridesTitle: 'Discard Overrides?',
  discardOverridesMessage:
    'Retaking the image will run a new AI analysis. Your existing manual overrides will be removed.',
} as const;
