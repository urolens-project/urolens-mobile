export const AUTH_TEXT = {
  forgotPasswordModalTitle: 'Forgot your password?',
  forgotPasswordModalBody:
    'Password resets must be handled by your lab administrator. Contact them directly to have your password reset and regain access to your account.',
  forgotPasswordModalCloseAccessibilityLabel: 'Got it, close dialog',
  forgotPasswordModalButtonText: 'Got it',

  inactivityBannerMessage:
    'You were signed out due to inactivity. Please sign in again to continue.',
  inactivityBannerDismissAccessibilityLabel: 'Dismiss',

  loginUsernameLabel: 'Username',
  loginUsernamePlaceholder: 'Enter laboratory ID',
  loginUsernameAccessibilityLabel: 'Username',
  loginPasswordLabel: 'Password',
  loginForgotPasswordText: 'Forgot password?',
  loginForgotPasswordAccessibilityLabel: 'Forgot password',
  loginForgotPasswordAccessibilityHint:
    'Shows how to reset your password through your lab administrator',
  loginPasswordPlaceholder: 'Enter password',
  loginPasswordAccessibilityLabel: 'Password',
  loginShowPasswordAccessibilityLabel: 'Show password',
  loginHidePasswordAccessibilityLabel: 'Hide password',
  loginKeepLoggedInText: 'Keep me logged in for this shift',
  loginKeepLoggedInAccessibilityHint: 'Stay signed in after the app is closed',
  loginButtonAccessibilityLabel: 'Login',
  loginButtonAccessibilityHint: 'Signs in with the entered username and password',
  loginButtonText: 'Login →',

  loginFooterAuthorizedNotice: 'Authorized laboratory personnel only.',
  loginFooterCopyright: '© 2026 UroLens Medical Systems. All Rights Reserved.',

  loginHeaderTitle: 'UroLens',
  loginHeaderSubtitle: 'Clinical Laboratory Management System',

  sessionExpiryModalTitle: 'Session Expiring Soon',
  sessionExpiryStaySignedInAccessibilityLabel: 'Stay signed in',
  sessionExpiryStaySignedInButtonText: 'Stay Signed In',
  /**
   * @description Builds the "session expiring soon" modal body, which needs the caller's
   * remaining-minutes figure inline.
   * @param warningMinutes - Minutes until sign-out, from the active session's warning lead time.
   */
  getSessionExpiryModalBody: (warningMinutes: number): string =>
    `Your session will expire in ${warningMinutes} minutes due to inactivity. Tap anywhere or press the button below to stay signed in.`,

  loginRequiredFieldsError: 'Username and password are required.',

  loginErrorMessages: {
    serverError: 'The server could not complete login. Please try again later.',
    accountInactive: 'Your account is inactive. Contact an administrator.',
    networkError: 'Cannot reach the server. Check your connection and try again.',
    timeout: 'The server took too long to respond. Please try again.',
    invalidCredentials: 'Invalid username or password.',
    default: 'Login failed. Please try again.',
  },
} as const;
