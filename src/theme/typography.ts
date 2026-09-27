/**
 * @description Text style presets, per the shape in
 * .claude/skills/code-standards/references/examples.md. Spread one of these into a
 * style key (`title: { ...typography.title, color: colors.ink }`) instead of inlining
 * fontSize/fontWeight. `fontWeight` is exported separately for one-off cases (e.g. a
 * bold variant of an existing preset) that don't warrant a new named preset.
 */
export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

export const typography = {
  tiny: { fontSize: 9 },
  micro: { fontSize: 11 },
  caption: { fontSize: 12 },
  body: { fontSize: 13 },
  bodyLg: { fontSize: 14 },
  label: { fontSize: 14, fontWeight: fontWeight.semibold },
  subtitle: { fontSize: 15, fontWeight: fontWeight.medium },
  title: { fontSize: 16, fontWeight: fontWeight.semibold },
  titleLg: { fontSize: 18, fontWeight: fontWeight.semibold },
  heading: { fontSize: 20, fontWeight: fontWeight.semibold },
  headingLg: { fontSize: 22, fontWeight: fontWeight.bold },
  display: { fontSize: 26, fontWeight: fontWeight.bold },
  displayLg: { fontSize: 30, fontWeight: fontWeight.bold },
  hero: { fontSize: 32, fontWeight: fontWeight.bold },
  jumbo: { fontSize: 36, fontWeight: fontWeight.bold },
} as const;
