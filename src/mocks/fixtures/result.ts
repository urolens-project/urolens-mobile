import { AnalysisResultDTO } from '@app-types/domain';
import { ResultStatus, ProbabilityLevel } from '@app-types/enums';

export const mockAnalysisResult: AnalysisResultDTO = {
  result_id: 'result-001',
  specimen_id: 'spec-001',
  status: ResultStatus.PENDING_CONFIRM,
  ai_findings: {
    uric_acid_crystals: 12,
    calcium_oxalate: 3,
    rbc_casts: 0,
    epithelial_cells: 7,
    white_blood_cells: 2,
    bacteria: 1,
  },
  flagged_anomalies: {
    uric_acid_crystals: 12,
  },
  smart_diagnosis: {
    gout: {
      condition: 'gout',
      level: ProbabilityLevel.HIGH,
      weighted_score: 9.6,
      evidence: [
        {
          particle_name: 'uric_acid_crystals',
          particle_display_name: 'Uric Acid Crystals',
          detected_count: 12,
          contribution_weight: 1.0,
          contribution_role: 'primary',
        },
      ],
    },
    glomerulonephritis: {
      condition: 'glomerulonephritis',
      level: ProbabilityLevel.LOW,
      weighted_score: 0.0,
      evidence: [],
    },
    nephrolithiasis: {
      condition: 'nephrolithiasis',
      level: ProbabilityLevel.MODERATE,
      weighted_score: 3.6,
      evidence: [
        {
          particle_name: 'calcium_oxalate',
          particle_display_name: 'Calcium Oxalate',
          detected_count: 3,
          contribution_weight: 0.8,
          contribution_role: 'primary',
        },
      ],
    },
    no_significant_indicators: false,
  },
};
