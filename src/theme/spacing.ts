/**
 * @description Semantic spacing scale for margin/padding/gap, per the shape in
 * .claude/skills/code-standards/references/examples.md. Migrating a component from a
 * raw number should pick the nearest step; small (1-3px) differences from the legacy
 * value are expected and are the point of converging on a shared scale.
 */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  smd: 10,
  md: 12,
  mlg: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  jumbo: 48,
} as const;
