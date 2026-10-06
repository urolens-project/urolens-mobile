import { StyleSheet, Text, View } from 'react-native';

import type { ResultStatus } from '@db/models/AnalysisResult';
import { formatDateTime } from '@lib/dateTime';
import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { getSampleStatusLabel } from '@features/queue/lib/sampleState';
import type { QueueItem } from '@features/queue/types';

import { DetailRow } from './DetailRow';

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  HIGH: { bg: colors.redTint4, text: colors.redDeep },
  NORMAL: { bg: colors.greenTint2, text: colors.greenDeep },
  LOW: { bg: colors.creamAlt, text: colors.warmGray600 },
  ROUTINE: { bg: colors.greenTint3, text: colors.greenDeep2 },
};

export interface SpecimenSummaryCardProps {
  specimen: QueueItem;
  resultStatus: ResultStatus | null;
}

/**
 * @description Specimen identity header (sample UID, priority badge, patient UID) and
 * the details card (test type, status, received time) shown at the top of the sample
 * detail screen.
 * @param specimen - Loaded specimen, adapted to the Queue's QueueItem shape.
 * @param resultStatus - The linked analysis result's status, for the Status row's label.
 */
export function SpecimenSummaryCard({
  specimen,
  resultStatus,
}: SpecimenSummaryCardProps): React.JSX.Element {
  const pColor = PRIORITY_COLORS[specimen.priorityLevel ?? 'NORMAL'] ?? PRIORITY_COLORS.NORMAL;

  return (
    <>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderTop}>
          <Text style={styles.sampleUid}>{specimen.sampleUid}</Text>
          <View style={[styles.priorityBadge, { backgroundColor: pColor.bg }]}>
            <Text style={[styles.priorityText, { color: pColor.text }]}>
              {specimen.priorityLevel ?? 'NORMAL'}
            </Text>
          </View>
        </View>
        {/* Intentional privacy decision: shows patientUid, not patientName. */}
        <Text style={styles.patientName}>{specimen.patientUid}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.detailsHeader}>
          <Icon name="person-outline" size={16} color={colors.teal} />
          <Text accessibilityRole="header" style={styles.title}>
            Patient & Sample
          </Text>
        </View>
        <View style={styles.detailsBody}>
          <DetailRow label="Patient UID" value={specimen.patientUid} />
          <View style={styles.divider} />
          <DetailRow label="Test Type" value={specimen.testType} />
          <View style={styles.divider} />
          <DetailRow label="Status" value={getSampleStatusLabel(specimen.status, resultStatus)} />
          <View style={styles.divider} />
          <DetailRow label="Received" value={formatDateTime(specimen.receivedAt)} />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  cardHeader: { marginBottom: spacing.lg },
  cardHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sampleUid: {
    fontFamily: 'Courier',
    ...typography.caption,
    color: colors.warmGray500,
    letterSpacing: 0.5,
  },
  priorityBadge: {
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  priorityText: { ...typography.caption, fontWeight: fontWeight.medium },
  patientName: {
    fontSize: 24,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
    marginTop: spacing.xxs,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.creamAlt,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  title: { ...typography.label, color: colors.ink },
  detailsBody: { padding: spacing.lg },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.gray200 },
});
