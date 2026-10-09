import { colors, spacing } from '@src/theme';

import type { ImageBoxSource } from '../types';

/**
 * @description Border/label colors for the AI engine's canonical particle classes
 * (see urolens-ai-engine `smart_diagnosis/config.yaml` display_names). Particle types
 * not listed here fall back to DEFAULT_PARTICLE_COLOR.
 */
export const PARTICLE_COLORS: Record<string, string> = {
  erythrocytes: colors.red600,
  leukocytes: colors.blueAlt,
  epithelial_cells: colors.amber600,
  urinary_casts: colors.violet600,
  bacteria: colors.emerald600,
  crystals: colors.indigo800,
  mucus_threads: colors.warmGray600,
  sperm_cells: colors.navy,
  trichomonas_vaginalis: colors.greenDeep2,
  yeast: colors.amberBrown,
};

export const DEFAULT_PARTICLE_COLOR = colors.gray500;

/**
 * @description Resolves a box's border/label color, with a neutral fallback for
 * particle types the color map does not recognize yet.
 * @param particleType - Canonical particle key from a spatial annotation.
 */
export function getParticleColor(particleType: string): string {
  return PARTICLE_COLORS[particleType] ?? DEFAULT_PARTICLE_COLOR;
}

export const SOURCE_LABELS: Record<ImageBoxSource, string> = {
  AI: 'AI',
  MEDTECH: 'MedTech',
  SUPERVISOR: 'Supervisor',
  REVIEWER: 'Reviewer',
};

export const BOX_BORDER_WIDTH = spacing.xxs;
export const LEGEND_SWATCH_SIZE = spacing.md;
