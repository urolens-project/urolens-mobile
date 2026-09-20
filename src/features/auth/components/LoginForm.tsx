import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { appInfo } from '@lib/appInfo';

const TEAL = '#2E7D7A';

const ENV_COLORS = {
  production: { bg: '#DCFCE7', fg: '#166534' },
  staging: { bg: '#FEF3C7', fg: '#92400E' },
  development: { bg: '#E0E7FF', fg: '#3730A3' },
} as const;

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const { login, isSubmitting, error } = useAuth();
  const envColors = ENV_COLORS[appInfo.environment];

  const handleSubmit = () => login(username, password, keepLoggedIn);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons name="microscope" size={38} color="#FFFFFF" />
          </View>
          <Text style={styles.appTitle}>UroLens</Text>
          <Text style={styles.appSubtitle}>Clinical Laboratory Management System</Text>
        </View>

        {/* ── Card ── */}
        <View style={styles.card}>
          {/* Username */}
          <Text style={styles.label}>Username</Text>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
              placeholder="Enter laboratory ID"
              placeholderTextColor="#9CA3AF"
              editable={!isSubmitting}
              accessibilityLabel="Username"
            />
          </View>

          {/* Password */}
          <View style={styles.passwordLabelRow}>
            <Text style={styles.label}>Password</Text>
            <TouchableOpacity accessibilityRole="button">
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color="#9CA3AF"
              style={styles.inputIcon}
            />
            <TextInput
              ref={passwordRef}
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              placeholder="Enter password"
              placeholderTextColor="#9CA3AF"
              editable={!isSubmitting}
              onSubmitEditing={handleSubmit}
              accessibilityLabel="Password"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>

          {/* Error message */}
          {error ? (
            <View
              style={styles.errorRow}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Keep logged in */}
          <TouchableOpacity
            style={styles.keepRow}
            onPress={() => setKeepLoggedIn((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: keepLoggedIn }}
            accessibilityHint="Stay signed in after the app is closed"
            disabled={isSubmitting}
          >
            <View style={[styles.checkbox, keepLoggedIn && styles.checkboxChecked]}>
              {keepLoggedIn ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
            </View>
            <Text style={styles.keepText}>Keep me logged in for this shift</Text>
          </TouchableOpacity>

          {/* Login button */}
          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Login"
            accessibilityHint="Signs in with the entered username and password"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Login →</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.authorizedNotice}>Authorized laboratory personnel only.</Text>
          <View style={styles.buildRow}>
            <Text style={styles.buildText}>v{appInfo.version}</Text>
            <View style={[styles.envPill, { backgroundColor: envColors.bg }]}>
              <Text style={[styles.envText, { color: envColors.fg }]}>
                {appInfo.environmentLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.copyright}>© 2026 UroLens Medical Systems. All Rights Reserved.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: TEAL,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: TEAL,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // Labels
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  forgotText: {
    fontSize: 13,
    color: TEAL,
    fontWeight: '500',
  },

  // Inputs
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    paddingHorizontal: 12,
    height: 50,
  },
  inputRowError: {
    borderColor: '#DC2626',
    backgroundColor: '#FFF5F5',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    height: '100%',
  },

  // Error
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    gap: 6,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    lineHeight: 18,
  },

  // Keep logged in
  keepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  keepText: {
    fontSize: 13,
    color: '#6B7280',
  },

  // Button
  button: {
    backgroundColor: TEAL,
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 32,
    gap: 10,
  },
  authorizedNotice: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  buildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buildText: {
    fontSize: 12,
    color: '#6B7280',
  },
  envPill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  envText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  copyright: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
