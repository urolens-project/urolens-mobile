import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function AIDisclaimer() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        ⚕ UroLens is a clinical decision-support tool. AI-generated findings and Smart
        Diagnosis indicators are not substitutes for professional medical judgment.
        All results must be reviewed and confirmed by a licensed Medical Technologist
        and Laboratory Supervisor.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E0E7FF',
    borderLeftWidth: 3,
    borderLeftColor: '#312E81',
    padding: 10,
    borderRadius: 6,
    marginVertical: 8,
  },
  text: {
    fontSize: 11,
    color: '#312E81',
    lineHeight: 16,
  },
});
