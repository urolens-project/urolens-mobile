import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/features/auth/hooks/useAuth';

const TEAL = '#2E7D7A';

export default function ProfileScreen() {
  const { logout } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="#FFFFFF" />
        </View>
        <Text style={styles.name}>Medical Technologist</Text>
        <Text style={styles.role}>UroLens Staff</Text>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.badge}>Full profile — EPIC-MOB-06</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, gap: 8 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: TEAL,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  role: { fontSize: 14, color: '#6B7280' },
  divider: { width: '100%', height: 1, backgroundColor: '#E5E7EB', marginVertical: 24 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#DC2626' },
  badge: {
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E0F2F1',
    color: '#2E7D7A',
    fontSize: 12,
    fontWeight: '600',
  },
});
