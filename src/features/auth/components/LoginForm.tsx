import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';

import { colors, spacing } from '@src/theme';

import { useAuth } from '../hooks/useAuth';
import { LoginHeader } from './LoginHeader';
import { LoginCredentialsCard } from './LoginCredentialsCard';
import { LoginFooter } from './LoginFooter';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { InactivityBanner } from './InactivityBanner';

export interface LoginFormProps {
  /** `?reason=` forwarded from the route, e.g. "inactivity" after an idle sign-out. */
  reason?: string;
}

/**
 * @description Login screen for laboratory staff: username/password fields, a
 * "keep me logged in" toggle, and build/environment info in the footer.
 * @param reason - If "inactivity", shows a banner explaining the medtech was signed
 * out automatically rather than landing back here unexplained.
 */
export function LoginForm({ reason }: LoginFormProps): React.JSX.Element {
  // 1. Store / service hooks
  const { login, isSubmitting, error } = useAuth();

  // 3. State & derived
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [isForgotPasswordVisible, setIsForgotPasswordVisible] = useState(false);
  const [isInactivityBannerDismissed, setIsInactivityBannerDismissed] = useState(false);
  const showInactivityBanner = reason === 'inactivity' && !isInactivityBannerDismissed;

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

  const handleOpenForgotPassword = useCallback((): void => {
    setIsForgotPasswordVisible(true);
  }, []);

  const handleCloseForgotPassword = useCallback((): void => {
    setIsForgotPasswordVisible(false);
  }, []);

  const handleDismissInactivityBanner = useCallback((): void => {
    setIsInactivityBannerDismissed(true);
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
        <LoginHeader />
        {showInactivityBanner && <InactivityBanner onDismiss={handleDismissInactivityBanner} />}
        <LoginCredentialsCard
          username={username}
          onUsernameChange={setUsername}
          onUsernameSubmit={handleUsernameSubmit}
          password={password}
          onPasswordChange={setPassword}
          passwordRef={passwordRef}
          showPassword={showPassword}
          onTogglePassword={handleTogglePassword}
          keepLoggedIn={keepLoggedIn}
          onToggleKeepLoggedIn={handleToggleKeepLoggedIn}
          onForgotPassword={handleOpenForgotPassword}
          error={error}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
        <LoginFooter />
      </ScrollView>
      <ForgotPasswordModal visible={isForgotPasswordVisible} onClose={handleCloseForgotPassword} />
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
});
