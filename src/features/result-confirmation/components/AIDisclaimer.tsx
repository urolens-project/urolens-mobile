// Path: urolens-mobile/src/features/result-confirmation/components/AIDisclaimer.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Mandatory compliance component per SRS.
// Must appear at the top of ResultReviewScreen.
// Never conditionally hide or remove.
export function AIDisclaimer(): React.JSX.Element {
  return (
    <View style={styles.container} accessibilityRole="text" accessibilityLabel="AI disclaimer">
      <View style={styles.iconRow}>
        <Text style={styles.icon}>ℹ</Text>
        <Text style={styles.title}>Clinical Decision Support</Text>
      </View>
      <Text style={styles.body}>
        UroLens is a clinical decision-support tool. AI-generated findings and Smart
        Diagnosis indicators are not substitutes for professional medical judgment.
        All results must be reviewed and confirmed by a licensed Medical Technologist
        and Laboratory Supervisor.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    borderRadius: 6,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  icon: {
    fontSize: 14,
    color: '#1D4ED8',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  body: {
    fontSize: 12,
    lineHeight: 18,
    color: '#1E40AF',
  },
});