import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Implemented in EPIC-MOB-05 (STORY-MOB-08)
export default function CaptureScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Capture — EPIC-MOB-05</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  text: { fontSize: 16, color: '#6B7280' },
});
