import { useCallback } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { colors } from '@src/theme';

import { FIELD_CAPTURE_TEXT } from '../constants/fieldCaptureText.constant';
import { useFieldActions } from '../hooks/useFieldActions';
import { useFieldDetail } from '../hooks/useFieldDetail';
import { useFieldList } from '../hooks/useFieldList';
import { FieldResultScreen } from './FieldResultScreen';

export interface FieldDetailScreenProps {
  localFieldId: string;
  specimenId: string;
  minFields: number;
}

/**
 * @description Re-opens one field for a Proceed/Discard decision outside a live capture
 * session — the backlog case (a field captured offline finished uploading while the
 * MedTech was elsewhere) and the "look at it again" case. Reuses FieldResultScreen,
 * the same screen a just-captured field lands on.
 *
 * After deciding this field, steps straight to the next field still needing a decision
 * (lowest fieldNo first) instead of returning to the list — the offline backlog's
 * step-through (mobile-n8-todo-rem.md C6, decision #1). Returns to the list once none
 * are left.
 * @param localFieldId - Local WatermelonDB id of the field to open.
 * @param specimenId - Server specimen id, for the live accepted-count header.
 * @param minFields - Minimum accepted fields required, for the header counter.
 */
export function FieldDetailScreen({
  localFieldId,
  specimenId,
  minFields,
}: FieldDetailScreenProps): React.JSX.Element {
  const { acceptedCount, fields } = useFieldList(specimenId);
  const { field, isLoading } = useFieldDetail(localFieldId, acceptedCount, minFields);
  const { acceptField, discardField, isLoading: isActing, error } = useFieldActions();

  // `fields` is already sorted by fieldNo ascending (useFieldList's query), so the
  // first match here is the lowest-numbered field still waiting.
  const otherUndecided = fields.filter(
    (f) => f.status === 'ANALYZED' && f.localId !== localFieldId,
  );

  const goToNextOrBack = useCallback((): void => {
    const next = otherUndecided[0];
    if (next) {
      router.replace({
        pathname: '/(medtech)/field-result',
        params: { localFieldId: next.localId, specimenId, minFields: String(minFields) },
      });
    } else {
      router.back();
    }
  }, [minFields, otherUndecided, specimenId]);

  const handleProceed = useCallback(async (): Promise<void> => {
    const outcome = await acceptField(localFieldId);
    if (outcome) goToNextOrBack();
  }, [acceptField, goToNextOrBack, localFieldId]);

  const handleDiscardConfirmed = useCallback(async (): Promise<void> => {
    const outcome = await discardField(localFieldId);
    if (outcome) goToNextOrBack();
  }, [discardField, goToNextOrBack, localFieldId]);

  const handleDiscard = useCallback((): void => {
    Alert.alert(FIELD_CAPTURE_TEXT.discardModalTitle, FIELD_CAPTURE_TEXT.discardModalBody, [
      { text: FIELD_CAPTURE_TEXT.keepFieldLabel, style: 'cancel' },
      {
        text: FIELD_CAPTURE_TEXT.confirmDiscardLabel,
        style: 'destructive',
        onPress: handleDiscardConfirmed,
      },
    ]);
  }, [handleDiscardConfirmed]);

  if (isLoading || !field) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  return (
    <FieldResultScreen
      field={field}
      isSubmitting={isActing}
      errorMessage={error?.message ?? null}
      onProceed={handleProceed}
      onDiscard={handleDiscard}
      remainingCount={otherUndecided.length}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.blackAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
