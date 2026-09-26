import type { RefObject } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

export interface LoginCredentialsCardProps {
  username: string;
  onUsernameChange: (value: string) => void;
  onUsernameSubmit: () => void;
  password: string;
  onPasswordChange: (value: string) => void;
  passwordRef: RefObject<TextInput | null>;
  showPassword: boolean;
  onTogglePassword: () => void;
  keepLoggedIn: boolean;
  onToggleKeepLoggedIn: () => void;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: () => void;
}

/**
 * @description Username/password fields, error message, "keep me logged in" toggle,
 * and the submit button — the interactive core of the login screen.
 */
export function LoginCredentialsCard({
  username,
  onUsernameChange,
  onUsernameSubmit,
  password,
  onPasswordChange,
  passwordRef,
  showPassword,
  onTogglePassword,
  keepLoggedIn,
  onToggleKeepLoggedIn,
  error,
  isSubmitting,
  onSubmit,
}: LoginCredentialsCardProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      {/* Username */}
      <Text style={styles.label}>Username</Text>
      <View style={styles.inputRow}>
        <Icon name="person-outline" size={18} color={colors.gray400} style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          value={username}
          onChangeText={onUsernameChange}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={onUsernameSubmit}
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
        <Icon name="lock-closed-outline" size={18} color={colors.gray400} style={styles.inputIcon} />
        <TextInput
          ref={passwordRef}
          style={styles.textInput}
          value={password}
          onChangeText={onPasswordChange}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          placeholder="Enter password"
          placeholderTextColor={colors.gray400}
          editable={!isSubmitting}
          onSubmitEditing={onSubmit}
          accessibilityLabel="Password"
        />
        <TouchableOpacity
          onPress={onTogglePassword}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
        >
          <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.gray500} />
        </TouchableOpacity>
      </View>

      {/* Error message */}
      {error && (
        <View style={styles.errorRow} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Icon name="alert-circle" size={16} color={colors.red600} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Keep logged in */}
      <TouchableOpacity
        style={styles.keepRow}
        onPress={onToggleKeepLoggedIn}
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
        onPress={onSubmit}
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
  );
}

const styles = StyleSheet.create({
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
});
