import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ResultStatus } from '@db/models/AnalysisResult';
import { colors, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import type { QueueItem } from '@features/queue/types';

import { SAMPLE_TEXT } from '../constants/sampleText.constant';
import { SpecimenSummaryCard } from './SpecimenSummaryCard';

export interface SampleDetailShellProps {
  specimen: QueueItem;
  resultStatus: ResultStatus | null;
  onBack: () => void;
  children: ReactNode;
}

/**
 * @description Shared top bar + specimen summary shell for the sample detail
 * screen's simpler states (capturing fields, awaiting web verification) — the
 * same chrome the full review view uses, without its AI findings section.
 */
export function SampleDetailShell({
  specimen,
  resultStatus,
  onBack,
  children,
}: SampleDetailShellProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBackBtn}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={SAMPLE_TEXT.goBack}
        >
          <Icon name="chevron-back" size={24} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} accessibilityRole="header">
          {SAMPLE_TEXT.detailTitle}
        </Text>
        <View style={styles.topBackBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SpecimenSummaryCard specimen={specimen} resultStatus={resultStatus} />
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: spacing.lg, paddingBottom: spacing.huge },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.smd,
    backgroundColor: colors.cream,
  },
  topBackBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  topBarTitle: { flex: 1, textAlign: 'center', ...typography.titleLg, color: colors.ink },
});
