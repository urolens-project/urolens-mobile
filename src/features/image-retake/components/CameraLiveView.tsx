import type { RefObject } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView } from 'expo-camera';

import { colors, radius, spacing, typography } from '@src/theme';
import type { FieldThumbnail } from '@features/field-capture/types';

import { Icon } from '@components/Icon';

import { IMAGE_RETAKE_TEXT } from '../constants/imageRetakeText.constant';

export interface FieldSessionInfo {
  acceptedCount: number;
  minFields: number;
  magnification: 'HPF' | 'LPF';
  onToggleMagnification: () => void;
  onViewFieldList: () => void;
  thumbnails: FieldThumbnail[];
}

export interface CameraLiveViewProps {
  cameraRef: RefObject<CameraView | null>;
  validationError: string | null;
  onMountError: () => void;
  onGoBack: () => void;
  onGalleryPick: () => void;
  onCapture: () => void;
  /** Multi-field capture session only (SDD Module 2 proposal) — magnification
   * switch and the accepted-field thumbnail stack. Omitted entirely on the
   * legacy single-image retake path. */
  fieldSession?: FieldSessionInfo;
}

/**
 * @description Live camera viewfinder with capture/gallery controls — the default
 * ("idle") phase of the capture screen.
 */
export function CameraLiveView({
  cameraRef,
  validationError,
  onMountError,
  onGoBack,
  onGalleryPick,
  onCapture,
  fieldSession,
}: CameraLiveViewProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraWrapper}>
        {/* Camera fills the wrapper; no children allowed by CameraView */}
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          ref={cameraRef}
          onMountError={onMountError}
        />

        <View style={styles.viewfinderGuide} />

        <View style={styles.cameraHeader}>
          <TouchableOpacity
            onPress={onGoBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={IMAGE_RETAKE_TEXT.leaveCaptureA11yLabel}
          >
            <Icon name="close" size={22} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <Text style={styles.cameraTitle}>{IMAGE_RETAKE_TEXT.cameraTitle}</Text>
          {fieldSession ? (
            <TouchableOpacity
              style={styles.magnificationButton}
              onPress={fieldSession.onToggleMagnification}
              testID="magnification-switch"
            >
              <Icon name="aperture-outline" size={20} color="rgba(255,255,255,0.85)" />
              <Text style={styles.magnificationLabel}>{fieldSession.magnification}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        <View style={styles.instructionBanner}>
          <Text style={styles.instructionText}>{IMAGE_RETAKE_TEXT.cameraInstructionText}</Text>
        </View>

        {validationError && (
          <View style={styles.errorBannerCamera}>
            <Text style={styles.errorText}>{validationError}</Text>
          </View>
        )}

        {/* Bottom controls — gallery left, capture centered, accepted-field
            thumbnail stack right (tapping it opens the field list) */}
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.galleryButton} onPress={onGalleryPick}>
            <Icon name="images-outline" size={28} color="rgba(255,255,255,0.85)" />
            <Text style={styles.galleryLabel}>{IMAGE_RETAKE_TEXT.galleryButtonLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureRing} onPress={onCapture} testID="capture-button">
            <View style={styles.captureButton} />
          </TouchableOpacity>

          {fieldSession && fieldSession.thumbnails.length > 0 ? (
            <TouchableOpacity
              style={styles.thumbnailStack}
              onPress={fieldSession.onViewFieldList}
              testID="view-field-list-button"
            >
              {fieldSession.thumbnails.slice(-3).map((thumb, index) => (
                <Image
                  key={thumb.localId}
                  source={{ uri: thumb.thumbnailUri }}
                  style={[
                    styles.stackedThumbnail,
                    thumb.status === 'waiting' && styles.stackedThumbnailWaiting,
                    {
                      transform: [{ translateX: index * 10 }, { rotate: `${(index - 1) * 6}deg` }],
                    },
                    { zIndex: index },
                  ]}
                />
              ))}
              {fieldSession.thumbnails.slice(-3).map(
                (thumb, index) =>
                  thumb.status === 'uploading' && (
                    <View
                      key={`${thumb.localId}-overlay`}
                      style={[
                        styles.thumbnailUploadingOverlay,
                        { transform: [{ translateX: index * 10 }], zIndex: index + 1 },
                      ]}
                    >
                      <ActivityIndicator size="small" color={colors.white} />
                    </View>
                  ),
              )}
              <View style={styles.thumbnailCountBadge}>
                <Text style={styles.thumbnailCountText}>{fieldSession.acceptedCount}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.captureSpacer} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  cameraWrapper: { flex: 1 },
  viewfinderGuide: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    right: '10%',
    bottom: '30%',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: radius.xs,
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerSpacer: { width: 40 },
  cameraTitle: { ...typography.title, color: colors.white },
  magnificationButton: { width: 60, alignItems: 'center', gap: spacing.xs },
  magnificationLabel: { ...typography.micro, color: colors.gray200 },
  // Fanned stack of the most recent accepted fields, overlapping on purpose —
  // tapping it opens the field list instead of a separate counter control.
  thumbnailStack: {
    width: 60,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedThumbnail: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: colors.tealAlt,
  },
  // A gallery field still waiting its turn in the background upload queue —
  // dimmed and muted-bordered, reads as "paused" rather than active.
  stackedThumbnailWaiting: { opacity: 0.5, borderColor: colors.gray300 },
  // The one gallery field pushChanges is uploading right now.
  thumbnailUploadingOverlay: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: radius.xs,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailCountBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: spacing.xxs,
    backgroundColor: colors.tealAlt,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  thumbnailCountText: { ...typography.micro, color: colors.white, fontWeight: 'bold' },
  instructionBanner: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    marginHorizontal: spacing.xxl,
    borderRadius: radius.sm,
    padding: spacing.smd,
    marginTop: spacing.sm,
  },
  instructionText: {
    ...typography.caption,
    color: colors.gray200,
    textAlign: 'center',
    lineHeight: 17,
  },
  // space-between with equal-width gallery + spacer perfectly centers the capture ring
  cameraControls: {
    position: 'absolute',
    bottom: spacing.jumbo,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.huge,
  },
  galleryButton: { width: 60, alignItems: 'center', gap: spacing.xs },
  galleryLabel: { ...typography.micro, color: colors.gray200 },
  captureRing: {
    // Fixed 80x80 circle: radius is half the box, not a scale value.
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    // Fixed 64x64 circle: radius is half the box, not a scale value.
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
  },
  captureSpacer: { width: 60 },
  errorBannerCamera: {
    backgroundColor: 'rgba(220,38,38,0.85)',
    marginHorizontal: spacing.xxl,
    borderRadius: radius.sm,
    padding: spacing.smd,
    marginTop: spacing.sm,
  },
  errorText: { ...typography.body, color: colors.red700, lineHeight: 18, flex: 1 },
});
