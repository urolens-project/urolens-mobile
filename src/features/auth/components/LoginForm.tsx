import { useCallback, useRef, useState } from 'react';
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

import { appInfo } from '@lib/appInfo';
import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { useAuth } from '../hooks/useAuth';
import { ENV_COLORS } from '../constants/envColors.constant';

/**
 * @description Login screen for laboratory staff: username/password fields, a
 * "keep me logged in" toggle, and build/environment info in the footer.
 */
export function LoginForm(): React.JSX.Element {
  // 1. Store / service hooks
  const { login, isSubmitting, error } = useAuth();

  // 3. State & derived
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const envColors = ENV_COLORS[appInfo.environment];

  // 4. Refs
  const passwordRef = useRef<TextInput>(null);

  // 6. Handlers
  const handleSubmit = useCallback((): void => {
    void login(username, password, keepLoggedIn);
  }, [login, username, password, keepLoggedIn]);

  const handleUsernameSubmit = useCallback((): void => {
    passwordRef.current?.focus();
  }, []);

  const handleTogglePassword = useCallback((): void => {
    setShowPassword((v) => !v);
  }, []);

  const handleToggleKeepLoggedIn = useCallback((): void => {
    setKeepLoggedIn((v) => !v);
  }, []);

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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Icon name="microscope" family="material-community" size={38} color={colors.white} />
          </View>
          <Text style={styles.appTitle}>UroLens</Text>
          <Text style={styles.appSubtitle}>Clinical Laboratory Management System</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Username */}
          <Text style={styles.label}>Username</Text>
          <View style={styles.inputRow}>
            <Icon name="person-outline" size={18} color={colors.gray400} style={styles.inputIcon} />
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
              onSubmitEditing={handleUsernameSubmit}
              placeholder="Enter laboratory ID"
              placeholderTextColor={colors.gray400}
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
            <Icon
              name="lock-closed-outline"
              size={18}
              color={colors.gray400}
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
              placeholderTextColor={colors.gray400}
              editable={!isSubmitting}
              onSubmitEditing={handleSubmit}
              accessibilityLabel="Password"
            />
            <TouchableOpacity
              onPress={handleTogglePassword}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Icon
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.gray500}
              />
            </TouchableOpacity>
          </View>

          {/* Error message */}
          {error && (
            <View
              style={styles.errorRow}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              <Icon name="alert-circle" size={16} color={colors.red600} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Keep logged in */}
          <TouchableOpacity
            style={styles.keepRow}
            onPress={handleToggleKeepLoggedIn}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: keepLoggedIn }}
            accessibilityHint="Stay signed in after the app is closed"
            disabled={isSubmitting}
          >
            <View style={[styles.checkbox, keepLoggedIn && styles.checkboxChecked]}>
              {keepLoggedIn && <Icon name="checkmark" size={12} color={colors.white} />}
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
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Login →</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
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
    backgroundColor: colors.gray100,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.huge,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: radius.xxl,
    backgroundColor: colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.mlg,
  },
  appTitle: {
    ...typography.hero,
    fontWeight: fontWeight.extrabold,
    color: colors.teal,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  appSubtitle: {
    ...typography.body,
    color: colors.gray500,
    textAlign: 'center',
  },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: radius.sm,
    elevation: 3,
  },

  // Labels
  label: {
    ...typography.body,
    fontWeight: fontWeight.bold,
    color: colors.gray900,
    marginBottom: spacing.sm,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  forgotText: {
    ...typography.body,
    color: colors.teal,
    fontWeight: fontWeight.medium,
  },

  // Inputs
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray100,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  inputRowError: {
    borderColor: colors.red600,
    backgroundColor: colors.redTint2,
  },
  inputIcon: {
    marginRight: spacing.smd,
  },
  textInput: {
    flex: 1,
    fontSize: typography.subtitle.fontSize,
    color: colors.gray900,
    height: '100%',
  },

  // Error
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    ...typography.body,
    color: colors.red600,
    lineHeight: 18,
  },

  // Keep logged in
  keepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
    gap: spacing.smd,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: colors.gray400,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  keepText: {
    ...typography.body,
    color: colors.gray500,
  },

  // Button
  button: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    ...typography.title,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
    gap: spacing.smd,
  },
  authorizedNotice: {
    ...typography.caption,
    color: colors.gray500,
    textAlign: 'center',
  },
  buildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buildText: {
    ...typography.caption,
    color: colors.gray500,
  },
  envPill: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  envText: {
    ...typography.micro,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
  },
  copyright: {
    ...typography.micro,
    color: colors.gray400,
    textAlign: 'center',
  },
});
