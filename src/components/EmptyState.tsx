import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  title: string;
  subtitle?: string;
}

export function EmptyState({ title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 40 },
  title: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
});
