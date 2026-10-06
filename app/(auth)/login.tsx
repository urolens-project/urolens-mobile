import { useLocalSearchParams } from 'expo-router';

import { LoginForm } from '@features/auth/components/LoginForm';

/**
 * @description Route entry for /login. Renders the auth feature's login form, forwarding
 * `?reason=` (e.g. "inactivity") so it can explain why the medtech landed back here.
 */
export default function LoginScreen(): React.JSX.Element {
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  return <LoginForm reason={reason} />;
}
