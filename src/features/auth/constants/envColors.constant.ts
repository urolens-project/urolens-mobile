import { colors } from '@src/theme';

import type { AppEnvironment } from '@lib/appInfo';

export interface EnvColorStyle {
  bg: string;
  fg: string;
}

export const ENV_COLORS: Record<AppEnvironment, EnvColorStyle> = {
  production: { bg: colors.green100, fg: colors.green800 },
  staging: { bg: colors.amber100, fg: colors.amber800 },
  development: { bg: colors.indigo100, fg: colors.indigo800 },
};
