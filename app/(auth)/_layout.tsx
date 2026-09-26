import { Stack, Redirect } from 'expo-router';

import { useAuthStore } from '@lib/auth/authStore';

/**
 * @description Layout for the (auth) route group. Redirects to the queue if a session
 * already exists, otherwise renders the auth stack (login screen).
 */
export default function AuthLayout(): React.JSX.Element {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) return <Redirect href="/(medtech)/queue" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
