import { Redirect } from 'expo-router';

import { useAuthStore } from '@lib/auth/authStore';

/**
 * @description Root route. Redirects to the queue or login screen based on session state.
 */
export default function Index(): React.JSX.Element | null {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return null;

  if (isAuthenticated) {
    return <Redirect href="/(medtech)/queue" />;
  }

  return <Redirect href="/(auth)/login" />;
}
