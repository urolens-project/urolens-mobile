// src/features/image-retake/components/CaptureGridReviewPanel.tsx
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ProcessedImage } from '@lib/camera/imageUtils';
import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

export interface CaptureGridReviewPanelProps {
  images: ProcessedImage[];
  validationError: string | null;
  /** Whether the set can still grow past MAX_BATCH_IMAGES — hides "Add Photo" once it can't. */
  canAddMore: boolean;
  onGoBack: () => void;
  onRetakeSlot: (index: number) => void;
  onAddMore: () => void;
  onUploadAll: () => void;
}

/**
 * @description Final review step of a capture session — every field of view as a
 * thumbnail grid. Tapping one reopens the camera to retake just that slot; nothing
 * is uploaded until the MedTech confirms the whole set. "Add Photo" reopens the
 * camera for one more shot instead of locking the count once review is reached.
 * @param images - The completed batch, in capture order.
 * @param validationError - Surfaced if the batch upload itself failed and sent the
 * MedTech back here to retry.
 * @param canAddMore - Whether the set is below MAX_BATCH_IMAGES.
 * @param onGoBack - Leaves the capture flow entirely.
 * @param onRetakeSlot - Reopens the camera targeted at the given slot index.
 * @param onAddMore - Grows the session target by one and reopens the camera.
 * @param onUploadAll - Confirms the set and starts the batch upload.
 */
export function CaptureGridReviewPanel({
  images,
  validationError,
  canAddMore,
  onGoBack,
  onRetakeSlot,
  onAddMore,
  onUploadAll,
}: CaptureGridReviewPanelProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onGoBack}
          accessibilityRole="button"
          accessibilityLabel="Leave capture"
        >
          <Icon name="close" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Review Photos</Text>
          <Text style={styles.subtitle}>
            {images.length} photo{images.length === 1 ? '' : 's'} · tap one to retake it
            {canAddMore ? ', or add more' : ''}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.gridContent}>
        <View style={styles.grid}>
          {images.map((image, index) => (
            <TouchableOpacity
              key={image.uri}
              style={styles.cell}
              onPress={() => onRetakeSlot(index)}
              accessibilityRole="button"
              accessibilityLabel={`Retake photo ${index + 1}`}
              testID={`grid-slot-${index}`}
            >
              <View style={styles.thumbnailWrap}>
                <Image source={{ uri: image.uri }} style={styles.thumbnail} resizeMode="cover" />
                <View style={styles.indexBadge}>
                  <Text style={styles.indexBadgeText}>{index + 1}</Text>
                </View>
                <View style={styles.retakeOverlay}>
                  <Icon name="camera-reverse-outline" size={16} color={colors.white} />
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {canAddMore && (
            <TouchableOpacity
              style={styles.cell}
              onPress={onAddMore}
              accessibilityRole="button"
              accessibilityLabel="Add another photo"
              testID="add-photo-button"
            >
              <View style={[styles.thumbnailWrap, styles.addCell]}>
                <Icon name="add" size={22} color={colors.gray400} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {validationError && (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle-outline" size={14} color={colors.red700} />
          <Text style={styles.errorText}>{validationError}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={onUploadAll}
          testID="upload-all-button"
        >
          <Icon name="cloud-upload-outline" size={18} color={colors.white} />
          <Text style={styles.uploadLabel}>Upload All ({images.length})</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const CELL_GAP = spacing.xs;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerSpacer: { width: 40 },
  headerText: { flex: 1, alignItems: 'center' },
  title: { ...typography.title, color: colors.white },
  subtitle: { ...typography.caption, color: colors.gray500, marginTop: spacing.xxs },
  gridContent: { paddingHorizontal: CELL_GAP, paddingBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 3}%`,
    aspectRatio: 1,
    padding: CELL_GAP,
  },
  thumbnailWrap: {
    flex: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.blackAlt,
  },
  thumbnail: { width: '100%', height: '100%' },
  addCell: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    minWidth: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  indexBadgeText: { ...typography.micro, color: colors.white, fontWeight: fontWeight.semibold },
  retakeOverlay: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.red100,
    marginHorizontal: spacing.lg,
    borderRadius: radius.sm,
    padding: spacing.smd,
    marginBottom: spacing.sm,
  },
  errorText: { ...typography.body, color: colors.red700, lineHeight: 18, flex: 1 },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    backgroundColor: colors.blackAlt,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.teal,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
  },
  uploadLabel: { ...typography.subtitle, fontWeight: fontWeight.semibold, color: colors.white },
});
