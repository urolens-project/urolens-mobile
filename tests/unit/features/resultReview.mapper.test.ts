import { mapSmartDiagnosis } from '@features/result-confirmation/mappers/resultReview.mapper';

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
