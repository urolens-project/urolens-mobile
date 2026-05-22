import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AlertsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Ionicons name="notifications-outline" size={48} color="#9CA3AF" />
        <Text style={styles.title}>Alerts</Text>
        <Text style={styles.sub}>Notifications will appear here.</Text>
        <Text style={styles.badge}>Coming in EPIC-MOB-05</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 14, color: '#6B7280' },
  badge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E0F2F1',
    color: '#2E7D7A',
    fontSize: 12,
    fontWeight: '600',
  },
});
