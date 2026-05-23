import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Implemented in EPIC-MOB-06 (STORY-MOB-10)
export default function OverrideScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Override — EPIC-MOB-06</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  text: { fontSize: 16, color: '#6B7280' },
});
