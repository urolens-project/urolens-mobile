import { colors } from '@src/theme';

import type { DiagnosisCondition, ScoreLevel } from '../types';

interface DiagnosisConditionOption {
  condition: DiagnosisCondition;
  scoreKey: 'goutScore' | 'gnScore' | 'nephroScore';
  label: string;
  description: string;
}

interface DiagnosisLevelStyle {
  label: string;
  backgroundColor: string;
  color: string;
}

export const DIAGNOSIS_CONDITIONS: DiagnosisConditionOption[] = [
  {
    condition: 'gout',
    scoreKey: 'goutScore',
    label: 'Gout',
    description: 'Crystal indicators based on particle classification',
  },
  {
    condition: 'glomerulonephritis',
    scoreKey: 'gnScore',
    label: 'Glomerulonephritis',
    description: 'Urinary cast and red blood cell indicators',
  },
  {
    condition: 'nephrolithiasis',
    scoreKey: 'nephroScore',
    label: 'Nephrolithiasis',
    description: 'Crystal and red blood cell indicators',
  },
];

export const DIAGNOSIS_LEVEL_STYLES: Record<ScoreLevel, DiagnosisLevelStyle> = {
  LOW: { label: 'Low', backgroundColor: colors.emerald100, color: colors.emerald800 },
  MODERATE: { label: 'Moderate', backgroundColor: colors.amber100, color: colors.amber800 },
  HIGH: { label: 'High', backgroundColor: colors.red100, color: colors.red700 },
};

export const UNKNOWN_DIAGNOSIS_LEVEL_STYLE: DiagnosisLevelStyle = {
  label: 'Unavailable',
  backgroundColor: colors.gray100,
  color: colors.gray500,
};
