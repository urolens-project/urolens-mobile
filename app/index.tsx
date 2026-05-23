import { Redirect } from 'expo-router';
import { useAuthStore } from '@lib/auth/authStore';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return null;

  if (isAuthenticated) {
    return <Redirect href="/(medtech)/queue" />;
  }

  return <Redirect href="/(auth)/login" />;
}
