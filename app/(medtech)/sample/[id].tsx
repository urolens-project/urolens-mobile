import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

// Implemented in EPIC-MOB-03 (STORY-MOB-06) and EPIC-MOB-04 (STORY-MOB-07)
export default function SampleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Sample: {id}</Text>
      <Text style={styles.sub}>EPIC-MOB-03 / MOB-04</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  text: { fontSize: 16, fontWeight: '600', color: '#1E3A5F' },
  sub: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
});
