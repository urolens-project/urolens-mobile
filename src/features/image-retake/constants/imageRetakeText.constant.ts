// src/features/image-retake/constants/imageRetakeText.constant.ts
/**
 * User-facing copy for the shared camera/upload screens (live view, permission
 * request, unavailable view, image preview, upload progress) and the capture/gallery
 * -pick errors they raise. Shared by the multi-field capture flow
 * (FieldCaptureSessionScreen) — the legacy single-image retake screen that
 * originally owned this file is gone (mobile PR #55 review, #3).
 */
export const IMAGE_RETAKE_TEXT = {
  // Shared across the camera/preview screens
  leaveCaptureA11yLabel: 'Leave capture',
  uploadFromGalleryLabel: 'Upload from Gallery Instead',
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

  // Capture/upload flow errors and alerts
  captureFailedMessage: 'Failed to capture image. Please try again.',
  galleryPickFailedMessage: 'Could not process the selected image. Please try another.',
  galleryAccessDeniedTitle: 'Gallery Access Denied',
  galleryAccessDeniedMessage:
    'UroLens could not access your photo library. Allow Photos access in Settings, or take a photo instead.',
  missingSpecimenIdTitle: 'Missing Specimen ID',
  missingSpecimenIdMessage:
    'The specimen server ID was not passed to this screen. Go back and try again.',

  // ImagePreviewPanel
  imagePreviewTitle: 'Image Preview',
  useThisImageLabel: 'Use This Image',

  // UploadProgressView
  uploadingImageTitle: 'Uploading image…',
  uploadSubtitle: 'AI analysis will begin automatically',
} as const;
