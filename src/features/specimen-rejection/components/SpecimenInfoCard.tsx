import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, radius, typography } from '@src/theme';

export interface SpecimenInfoCardProps {
  sampleUid: string;
  patientUid: string;
}

/**
 * @description Small identity card at the top of the reject-specimen screen.
 * @param sampleUid - The specimen's sample UID.
 * @param patientUid - The specimen's patient UID.
 */
export function SpecimenInfoCard({ sampleUid, patientUid }: SpecimenInfoCardProps): React.JSX.Element {
  return (
    <View style={styles.specimenCard}>
      <Text style={styles.specimenUid}>{sampleUid}</Text>
      <Text style={styles.specimenName}>{patientUid}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  specimenCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mlg,
  },
  specimenUid: {
    fontFamily: 'Courier',
    ...typography.caption,
    color: colors.gray500,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  specimenName: {
    ...typography.titleLg,
    color: colors.gray800,
  },
});
