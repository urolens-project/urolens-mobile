import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '@src/theme';

import { ANNOTATION_PARTICLE_TYPES } from '../constants/annotation.constant';
import { formatParticleName } from '../lib/findingRows';
import type { AnnotationDraft, ReviewerAnnotation, SpatialAnnotation } from '../types';
import { AnnotationImage } from './AnnotationImage';

export interface ResultAnnotationPanelProps {
  imageUrl: string | null;
  draft: AnnotationDraft;
  otherAnnotations: ReviewerAnnotation[];
  isEditable: boolean;
  isDirty: boolean;
  isSaving: boolean;
  error: string | null;
  onNotesChange: (notes: string) => void;
  onBoxesChange: (boxes: SpatialAnnotation[]) => void;
  onSave: () => void;
}

/**
 * @description Lets the MedTech edit their own image boxes and notes while keeping other reviewers' notes attributed.
 * @param props - Saved image, annotation draft and guarded save callbacks.
 */
export function ResultAnnotationPanel({
  imageUrl,
  draft,
  otherAnnotations,
  isEditable,
  isDirty,
  isSaving,
  error,
  onNotesChange,
  onBoxesChange,
  onSave,
}: ResultAnnotationPanelProps): React.JSX.Element {
  const [particleType, setParticleType] = useState<string>(ANNOTATION_PARTICLE_TYPES[0]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'draw' | 'move' | 'resize'>('draw');
  const hasSelection = draft.spatialAnnotations.some((box): boolean => box.id === selectedId);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Microscopy image & annotations</Text>
      <AnnotationImage
        key={imageUrl}
        imageUrl={imageUrl}
        boxes={draft.spatialAnnotations}
        otherBoxes={otherAnnotations.flatMap((item): SpatialAnnotation[] =>
          item.spatialAnnotations.map(
            (box): SpatialAnnotation => ({ ...box, id: `${item.reviewedBy}:${box.id}` }),
          ),
        )}
        particleType={particleType}
        selectedId={selectedId}
        mode={mode}
        isEditable={isEditable}
        onChange={onBoxesChange}
        onSelect={setSelectedId}
      />
      {isEditable && (
        <>
          <Text style={styles.body}>
            Choose a particle and drag on the image to draw a box. Select a box below to move or
            resize it.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {ANNOTATION_PARTICLE_TYPES.map(
              (particle): React.JSX.Element => (
                <Pressable
                  key={particle}
                  accessibilityRole="button"
                  accessibilityState={{ selected: particle === particleType }}
                  onPress={(): void => setParticleType(particle)}
                  style={[styles.chip, particle === particleType && styles.chipSelected]}
                >
                  <Text style={styles.body}>{formatParticleName(particle)}</Text>
                </Pressable>
              ),
            )}
          </ScrollView>
          <View style={styles.tools}>
            <EditorTool
              label="Draw"
              isSelected={mode === 'draw'}
              onPress={(): void => setMode('draw')}
            />
            <EditorTool
              label="Move"
              isDisabled={!hasSelection}
              isSelected={mode === 'move'}
              onPress={(): void => setMode('move')}
            />
            <EditorTool
              label="Resize"
              isDisabled={!hasSelection}
              isSelected={mode === 'resize'}
              onPress={(): void => setMode('resize')}
            />
            <EditorTool
              label="Delete box"
              isDisabled={!hasSelection}
              onPress={(): void => {
                onBoxesChange(
                  draft.spatialAnnotations.filter((box): boolean => box.id !== selectedId),
                );
                setSelectedId(null);
                setMode('draw');
              }}
            />
          </View>
          <View style={styles.tools}>
            {draft.spatialAnnotations.map(
              (box, index): React.JSX.Element => (
                <EditorTool
                  key={box.id}
                  label={`Box ${index + 1}: ${formatParticleName(box.particleType)}`}
                  isSelected={box.id === selectedId}
                  onPress={(): void => {
                    setSelectedId(box.id);
                    setMode('move');
                  }}
                />
              ),
            )}
          </View>
        </>
      )}
      <Text style={styles.title}>Annotation notes</Text>
      <TextInput
        accessibilityLabel="Annotation notes"
        value={draft.annotationNotes}
        onChangeText={onNotesChange}
        editable={isEditable}
        multiline
        style={styles.notes}
        placeholder="Add observations about this result"
      />
      {otherAnnotations.map(
        (item): React.JSX.Element => (
          <View key={item.reviewedBy} style={styles.otherNote}>
            <Text style={styles.title}>
              {item.reviewerRole === 'SUPERVISOR' ? 'Supervisor' : 'Other reviewer'} annotation
            </Text>
            <Text style={styles.body}>{item.annotationNotes || 'Image annotations only.'}</Text>
          </View>
        ),
      )}
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {isEditable && (
        <Pressable
          accessibilityRole="button"
          disabled={!isDirty || isSaving}
          onPress={onSave}
          style={styles.chip}
        >
          <Text style={styles.title}>{isSaving ? 'Saving annotations…' : 'Save annotations'}</Text>
        </Pressable>
      )}
      {isDirty && <Text style={styles.body}>Unsaved changes will be saved when you confirm.</Text>}
    </View>
  );
}

interface EditorToolProps {
  label: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  onPress: () => void;
}
function EditorTool({
  label,
  isSelected,
  isDisabled,
  onPress,
}: EditorToolProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!isSelected, disabled: !!isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={[styles.chip, isSelected && styles.chipSelected, isDisabled && styles.chipDisabled]}
    >
      <Text style={styles.body}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  title: { ...typography.label, color: colors.ink },
  body: { ...typography.body, color: colors.gray700 },
  chip: {
    padding: spacing.sm,
    marginRight: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  chipSelected: { backgroundColor: colors.tealTint, borderColor: colors.teal },
  chipDisabled: { opacity: 0.5 },
  tools: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  notes: {
    ...typography.bodyLg,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radius.sm,
    padding: spacing.md,
    minHeight: spacing.jumbo * 2,
    textAlignVertical: 'top',
  },
  otherNote: {
    padding: spacing.md,
    backgroundColor: colors.gray50,
    borderRadius: radius.sm,
    gap: spacing.xs,
  },
  error: { ...typography.body, color: colors.red700 },
});
