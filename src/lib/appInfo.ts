import Constants from 'expo-constants';

export type AppEnvironment = 'production' | 'staging' | 'development';

const ENV_LABELS: Record<AppEnvironment, string> = {
  production: 'Production',
  staging: 'Staging',
  development: 'Development',
};

function resolveEnvironment(raw: string | undefined): AppEnvironment {
  const value = (raw ?? '').trim().toLowerCase();
  if (value === 'production' || value === 'prod') return 'production';
  if (value === 'staging' || value === 'stage') return 'staging';
  return 'development';
}

export const appInfo = {
  version: Constants.expoConfig?.version ?? 'unknown',
  environment: resolveEnvironment(process.env.EXPO_PUBLIC_APP_ENV),
  get environmentLabel(): string {
    return ENV_LABELS[this.environment];
  },
};
