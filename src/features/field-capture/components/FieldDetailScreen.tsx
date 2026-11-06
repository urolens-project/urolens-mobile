import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { colors } from '@src/theme';

import { useFieldActions } from '../hooks/useFieldActions';
import { useFieldDetail } from '../hooks/useFieldDetail';
import { useFieldList } from '../hooks/useFieldList';
import { DiscardFieldModal } from './DiscardFieldModal';
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
  const {
    acceptField,
    discardField,
    markFieldReviewed,
    isLoading: isActing,
    error,
  } = useFieldActions();
  const [isDiscardModalVisible, setIsDiscardModalVisible] = useState(false);

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

  const handleGoBack = useCallback((): void => {
    router.back();
  }, []);

  const handleProceed = useCallback(async (): Promise<void> => {
    const outcome = await acceptField(localFieldId);
    if (outcome) goToNextOrBack();
  }, [acceptField, goToNextOrBack, localFieldId]);

  const handleDiscardConfirmed = useCallback(async (): Promise<void> => {
    setIsDiscardModalVisible(false);
    const outcome = await discardField(localFieldId);
    if (outcome) goToNextOrBack();
  }, [discardField, goToNextOrBack, localFieldId]);

  const handleDiscard = useCallback((): void => {
    setIsDiscardModalVisible(true);
  }, []);

  const handleDiscardCancel = useCallback((): void => {
    setIsDiscardModalVisible(false);
  }, []);

  const handleMarkReviewed = useCallback((): void => {
    void markFieldReviewed(localFieldId);
  }, [markFieldReviewed, localFieldId]);

  if (isLoading || !field) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  return (
    <>
      <FieldResultScreen
        field={field}
        isSubmitting={isActing}
        errorMessage={error?.message ?? null}
        onProceed={handleProceed}
        onDiscard={handleDiscard}
        onMarkReviewed={handleMarkReviewed}
        remainingCount={otherUndecided.length}
        onGoBack={handleGoBack}
      />
      <DiscardFieldModal
        visible={isDiscardModalVisible}
        onConfirm={handleDiscardConfirmed}
        onCancel={handleDiscardCancel}
      />
    </>
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
