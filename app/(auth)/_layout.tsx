import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '@lib/auth/authStore';

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) return <Redirect href="/(medtech)/queue" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
