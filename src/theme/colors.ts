/**
 * @description Color palette extracted from hex values already in use across the app,
 * following the shape documented in .claude/skills/code-standards/references/examples.md.
 * Values are exact matches to what screens rendered before tokenization, so swapping a
 * raw hex for one of these tokens is a zero-visual-diff change. Add new tokens here
 * instead of inlining a hex value; prefer reusing a close match over adding a near-duplicate.
 */
export const colors = {
  white: '#FFFFFF',
  black: '#000000',
  blackAlt: '#0D0D0D',

  // Neutral gray scale (Tailwind gray)
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  slate300: '#CBD5E1',

  // Warm neutrals used on the cream/ink screens
  cream: '#F7F6F3',
  creamAlt: '#F1EFE8',
  ink: '#1A1A1A',
  warmGray200: '#C9C7C1',
  warmGray400: '#AEABA5',
  warmGray500: '#888780',
  warmGray600: '#5F5E5A',

  // Brand teal
  teal: '#2E7D7A',
  tealLight: '#5FA9A5',
  tealDark: '#3D7874',
  tealAlt: '#4DB6AC',
  tealTint: '#E0F2F1',
  tealTint2: '#EEF7F6',
  tealTint3: '#F0FDFB',
  tealTint4: '#F0F9F8',
  tealTint5: '#EEF9F8',
  tealTint6: '#E9F8F1',
  tealTint7: '#E3F2F1',
  tealTint8: '#BFE3E0',
  tealTintLight: '#F0FAFA',

  // Red / danger
  red50: '#FEF2F2',
  redTint2: '#FFF5F5',
  redTint3: '#FDEDED',
  redTint4: '#FCEBEB',
  redTint5: '#FBC9C9',
  red100: '#FEE2E2',
  red200: '#FECACA',
  red300: '#FCA5A5',
  red500: '#EF4444',
  red600: '#DC2626',
  red700: '#B91C1C',
  redDeep: '#A32D2D',
  red800: '#991B1B',
  red900: '#7F1D1D',

  // Amber / warning
  amber50: '#FFFBEB',
  amberTint1: '#FFFBF0',
  amberTint2: '#FFF8E7',
  amberTint3: '#FFF7E6',
  amberTint4: '#FDE7B0',
  amber100: '#FEF3C7',
  amber200: '#FDE68A',
  amber600: '#D97706',
  amber700: '#B45309',
  amber800: '#92400E',
  amberBrown: '#7C4A0A',

  // Green / emerald / success
  green50: '#F0FDF4',
  green100: '#DCFCE7',
  green200: '#BBF7D0',
  greenTint2: '#EAF3DE',
  greenTint3: '#E8F5E9',
  greenTint4: '#BFEBD6',
  greenDeep: '#3B6D11',
  greenDeep2: '#2E7D32',
  green800: '#166534',
  emerald50: '#ECFDF5',
  emerald100: '#D1FAE5',
  emerald200: '#A7F3D0',
  emerald500: '#10B981',
  emerald600: '#059669',
  emerald700: '#047857',
  emerald800: '#065F46',

  // Blue / info
  blue50: '#EFF6FF',
  blue200: '#BFDBFE',
  blue800: '#1E40AF',
  blueAlt: '#185FA5',
  navy: '#1E3A5F',
  navyAlt: '#1C2431',

  // Indigo / violet
  indigo100: '#E0E7FF',
  indigo800: '#3730A3',
  violet50: '#F5F3FF',
  violet100: '#EDE9FE',
  violet600: '#7C3AED',
  violet800: '#5B21B6',

  // Overlays
  overlayDark: 'rgba(0,0,0,0.4)',
  overlayLight: 'rgba(255,255,255,0.85)',
} as const;
