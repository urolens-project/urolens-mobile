import type { RefObject } from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView } from 'expo-camera';

import { colors, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { IMAGE_RETAKE_TEXT } from '../constants/imageRetakeText.constant';

export interface FieldSessionInfo {
  acceptedCount: number;
  minFields: number;
  magnification: 'HPF' | 'LPF';
  onToggleMagnification: () => void;
  thumbnails: string[];
}

export interface CameraLiveViewProps {
  cameraRef: RefObject<CameraView | null>;
  validationError: string | null;
  onMountError: () => void;
  onGoBack: () => void;
  onGalleryPick: () => void;
  onCapture: () => void;
  /** Multi-field capture session only (SDD Module 2 proposal) — field counter,
   * magnification switch and accepted-field thumbnail strip. Omitted entirely on
   * the legacy single-image retake path. */
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
            <Text style={styles.fieldCounter}>
              {fieldSession.acceptedCount} of {fieldSession.minFields}
            </Text>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        <View style={styles.instructionBanner}>
          <Text style={styles.instructionText}>{IMAGE_RETAKE_TEXT.cameraInstructionText}</Text>
        </View>

        {fieldSession && (
          <TouchableOpacity
            style={styles.magnificationSwitch}
            onPress={fieldSession.onToggleMagnification}
            testID="magnification-switch"
          >
            <Text style={styles.magnificationText}>{fieldSession.magnification}</Text>
          </TouchableOpacity>
        )}

        {validationError && (
          <View style={styles.errorBannerCamera}>
            <Text style={styles.errorText}>{validationError}</Text>
          </View>
        )}

        {fieldSession && fieldSession.thumbnails.length > 0 && (
          <View style={styles.thumbnailStrip}>
            {fieldSession.thumbnails.map((uri, index) => (
              <Image key={`${uri}-${index}`} source={{ uri }} style={styles.thumbnail} />
            ))}
          </View>
        )}

        {/* Bottom controls — gallery left, capture centered, mirror spacer right */}
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.galleryButton} onPress={onGalleryPick}>
            <Icon name="images-outline" size={28} color="rgba(255,255,255,0.85)" />
            <Text style={styles.galleryLabel}>{IMAGE_RETAKE_TEXT.galleryButtonLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureRing} onPress={onCapture} testID="capture-button">
            <View style={styles.captureButton} />
          </TouchableOpacity>

          <View style={styles.captureSpacer} />
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
  fieldCounter: {
    ...typography.subtitle,
    color: colors.tealAlt,
    minWidth: 40,
    textAlign: 'right',
  },
  magnificationSwitch: {
    position: 'absolute',
    top: spacing.jumbo + spacing.xxxl,
    right: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  magnificationText: { ...typography.label, color: colors.white },
  thumbnailStrip: {
    position: 'absolute',
    bottom: spacing.jumbo + spacing.huge + spacing.xxl,
    left: spacing.xl,
    right: spacing.xl,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  thumbnail: {
    width: 36,
    height: 36,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.tealAlt,
  },
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
