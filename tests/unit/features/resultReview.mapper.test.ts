import {
  mapResultReviewDetail,
  mapSmartDiagnosis,
} from '@features/result-confirmation/mappers/resultReview.mapper';
import type { components } from '@app-types/api';

type FullResultDetail = components['schemas']['FullResultDetail'];

function makeDto(overrides: Partial<FullResultDetail> = {}): FullResultDetail {
  return {
    resultId: 'result-1',
    specimenId: 'specimen-1',
    patientUid: 'PT-1',
    medtechName: 'Tech One',
    aiFindings: {},
    flaggedAnomalies: {},
    particleClasses: {},
    modelVersion: 'v1',
    manualOverrides: [],
    smartDiagnosisUnavailable: false,
    status: 'APPROVED',
    annotations: [],
    ...overrides,
  };
}

const evidence = {
  particle_name: 'crystals',
  particle_display_name: 'Crystals',
  detected_count: 60,
  normal_range_max: 5,
  contribution_role: 'primary',
};

describe('Smart Diagnosis payload mapping', () => {
  it.each([
    {
      goutScore: 'HIGH',
      gnScore: 'LOW',
      nephroScore: 'MODERATE',
      noSignificantIndicators: false,
      evidenceMap: { gout: { evidence: [evidence] } },
    },
    {
      gout: { level: 'HIGH', evidence: [evidence] },
      glomerulonephritis: { level: 'LOW' },
      nephrolithiasis: { level: 'MODERATE' },
      no_significant_indicators: false,
    },
  ])('maps API details and synced previews to the same scores and evidence', (payload): void => {
    const diagnosis = mapSmartDiagnosis(payload);
    expect(diagnosis).toMatchObject({ goutScore: 'HIGH', gnScore: 'LOW', nephroScore: 'MODERATE' });
    expect(diagnosis?.evidenceMap.gout).toEqual([
      {
        particleName: 'crystals',
        particleDisplayName: 'Crystals',
        detectedCount: 60,
        normalRangeMax: 5,
        contributionRole: 'primary',
      },
    ]);
  });

  it('maps the all-low response without losing the no-indicators flag', (): void => {
    expect(
      mapSmartDiagnosis({
        goutScore: 'LOW',
        gnScore: 'LOW',
        nephroScore: 'LOW',
        noSignificantIndicators: true,
      })?.noSignificantIndicators,
    ).toBe(true);
  });

  it.each([null, {}, { unavailable: true }, { goutScore: 'INVALID' }])(
    'treats missing or malformed diagnosis data as unavailable',
    (payload): void => {
      expect(mapSmartDiagnosis(payload)).toBeNull();
    },
  );

  it('does not interpret incomplete scores as normal', (): void => {
    expect(mapSmartDiagnosis({ goutScore: 'LOW', noSignificantIndicators: true })).toMatchObject({
      goutScore: 'LOW',
      gnScore: null,
      nephroScore: null,
      noSignificantIndicators: false,
    });
  });
});

// mobile-n8-todo-rem.md B4: FullResultDetail has no field_summary (only GET /sync/pull
// does, backend #105), but it does carry particleClasses — the confirmed counts —
// which should win over the raw, unconfirmed aiFindings once a result is confirmed.
describe('mapResultReviewDetail — aiFindings source', () => {
  it('prefers particleClasses over aiFindings when both are present', () => {
    const detail = mapResultReviewDetail(
      makeDto({ aiFindings: { RBC: 99 }, particleClasses: { RBC: 3 } }),
    );
    expect(detail.aiFindings).toEqual([{ parameter: 'RBC', count: 3, isAnomalous: false }]);
  });

  it('falls back to aiFindings when particleClasses is empty', () => {
    const detail = mapResultReviewDetail(makeDto({ aiFindings: { RBC: 3 }, particleClasses: {} }));
    expect(detail.aiFindings).toEqual([{ parameter: 'RBC', count: 3, isAnomalous: false }]);
  });

  it('rounds a decimal mean instead of showing it bare', () => {
    const detail = mapResultReviewDetail(
      makeDto({ aiFindings: {}, particleClasses: { RBC: 2.4 } }),
    );
    expect(detail.aiFindings).toEqual([{ parameter: 'RBC', count: 2, isAnomalous: false }]);
  });
});
