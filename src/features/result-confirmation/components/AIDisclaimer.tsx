// Path: urolens-mobile/src/features/result-confirmation/components/AIDisclaimer.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Mandatory compliance component per SRS.
// Must appear at the top of ResultReviewScreen.
// Never conditionally hide or remove.
export function AIDisclaimer(): React.JSX.Element {
  return (
    <View style={styles.container} accessibilityRole="text" accessibilityLabel="AI disclaimer">
      <Text style={styles.label}>Clinical Decision Support</Text>
      <Text style={styles.body}>
        AI-generated findings are decision support only — not a substitute for professional
        judgment. All results must be reviewed and confirmed by a licensed Medical Technologist
        and Laboratory Supervisor.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EEF9F8',
    borderLeftWidth: 3,
    borderLeftColor: '#2E7D7A',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D7A',
    letterSpacing: 0.3,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  body: {
    fontSize: 12,
    lineHeight: 17,
    color: '#3D7874',
  },
});
