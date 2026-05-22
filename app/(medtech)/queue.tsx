import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Implemented in EPIC-MOB-03 (STORY-MOB-05)
export default function QueueScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Queue — EPIC-MOB-03</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  text: { fontSize: 16, color: '#6B7280' },
});
