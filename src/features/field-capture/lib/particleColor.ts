import { colors } from '@src/theme';

/** Visually distinct against the black image backdrop — order doesn't matter, only
 * that every particle type lands on a different entry (field-post-analysis-report.md,
 * Section 2 item 2: legend swatches must match their box color in the overlay). */
const PARTICLE_COLOR_PALETTE = [
  colors.tealAlt,
  colors.red500,
  colors.amber600,
  colors.violet600,
  colors.emerald500,
  colors.blueAlt,
  colors.indigo800,
  colors.greenDeep2,
] as const;

/**
 * @description Assigns a stable color to a particle type, so the same type always
 * draws the same overlay box color and legend swatch for a given field.
 * @param particleType - Raw AI particle type key, e.g. "uric_acid_crystals".
 */
export function getParticleColor(particleType: string): string {
  let hash = 0;
  for (let i = 0; i < particleType.length; i++) {
    hash = (hash * 31 + particleType.charCodeAt(i)) >>> 0;
  }
  return PARTICLE_COLOR_PALETTE[hash % PARTICLE_COLOR_PALETTE.length];
}

/**
 * @description Humanizes a raw particle type key for display, e.g.
 * "uric_acid_crystals" -> "Uric Acid Crystals".
 */
export function formatParticleName(particleType: string): string {
  return particleType
    .split('_')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}
