import { StyleSheet, Text, View } from 'react-native';

import { formatDateTime } from '@lib/dateTime';
import { colors, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import type { QueueItem } from '@features/queue/types';

import { DetailRow } from './DetailRow';

export interface RejectionDetailsCardProps {
  specimen: QueueItem;
}

/**
 * @description Shows why and when a specimen was rejected, on the sample detail screen.
 * Only rendered when the specimen's status is REJECTED.
 * @param specimen - The rejected specimen.
 */
export function RejectionDetailsCard({ specimen }: RejectionDetailsCardProps): React.JSX.Element {
  return (
    <View style={styles.rejectionCard}>
      <View style={styles.rejectionHeader}>
        <Icon name="close-circle" size={16} color={colors.red700} />
        <Text style={styles.rejectionTitle}>Specimen Rejected</Text>
      </View>
      {specimen.rejectionReason && (
        <DetailRow label="Reason" value={specimen.rejectionReason.replace(/_/g, ' ')} />
      )}
      {specimen.rejectionNote ? (
        <>
          <View style={styles.divider} />
          <DetailRow label="Note" value={specimen.rejectionNote} />
        </>
      ) : null}
      {specimen.rejectedAt && (
        <>
          <View style={styles.divider} />
          <DetailRow label="Rejected At" value={formatDateTime(specimen.rejectedAt)} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rejectionCard: {
    backgroundColor: colors.red50,
    borderRadius: radius.xl,
    borderWidth: 0.5,
    borderColor: colors.red200,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rejectionTitle: {
    ...typography.label,
    color: colors.red700,
  },
  divider: { height: 0.5, backgroundColor: 'rgba(0,0,0,0.08)' },
});
