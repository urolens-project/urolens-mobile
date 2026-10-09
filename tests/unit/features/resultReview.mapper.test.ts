import {
  mapSmartDiagnosis,
  mapResultReviewDetail,
} from '@features/result-confirmation/mappers/resultReview.mapper';
import type { components } from '@app-types/api';

const baseDetail: components['schemas']['FullResultDetail'] = {
  resultId: 'result-1',
  specimenId: 'specimen-1',
  patientUid: 'patient-1',
  medtechName: 'Jane MedTech',
  aiFindings: {},
  flaggedAnomalies: {},
  particleClasses: {},
  modelVersion: 'v1',
  manualOverrides: [],
  smartDiagnosisUnavailable: true,
  status: 'PENDING_CONFIRM',
  annotations: [],
};

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

describe('Image box mapping', () => {
  it('maps AI detections on the first review without saved annotations', (): void => {
    const { imageBoxes, imageId } = mapResultReviewDetail({
      ...baseDetail,
      imageId: 'image-1',
      aiDetections: [
        {
          id: 'detection-1',
          particleType: 'erythrocytes',
          confidence: 0.85,
          x: 20,
          y: 30,
          w: 10,
          h: 8,
        },
      ],
    });
    expect(imageId).toBe('image-1');
    expect(imageBoxes).toEqual([
      expect.objectContaining({
        source: 'AI',
        confidence: 0.85,
        reviewedBy: null,
        renderKey: 'AI:image-1:detection-1',
        label: 'Erythrocytes',
        x: 20,
        y: 30,
        w: 10,
        h: 8,
      }),
    ]);
  });

  it.each([null, []])(
    'does not invent boxes from counts when AI coordinates are absent',
    (aiDetections): void => {
      expect(
        mapResultReviewDetail({ ...baseDetail, aiFindings: { bacteria: 10 }, aiDetections })
          .imageBoxes,
      ).toEqual([]);
    },
  );

  it('keeps unknown reviewer roles attributed as Reviewer', (): void => {
    const { imageBoxes } = mapResultReviewDetail({
      ...baseDetail,
      annotations: [
        {
          reviewedBy: 'deleted-user',
          reviewerRole: '',
          updatedAt: '2026-10-01T00:00:00Z',
          spatialAnnotations: [{ id: 'box-1', particleType: 'bacteria', x: 0, y: 0, w: 5, h: 5 }],
        },
      ],
    });
    expect(imageBoxes[0].source).toBe('REVIEWER');
  });

  it('flattens multiple reviewers into one attributed list', (): void => {
    const { imageBoxes } = mapResultReviewDetail({
      ...baseDetail,
      annotations: [
        {
          reviewedBy: 'medtech-1',
          reviewerRole: 'MEDTECH',
          updatedAt: '2026-10-01T00:00:00Z',
          spatialAnnotations: [
            { id: 'box-1', particleType: 'erythrocytes', x: 10, y: 10, w: 5, h: 5 },
          ],
        },
        {
          reviewedBy: 'supervisor-1',
          reviewerRole: 'SUPERVISOR',
          updatedAt: '2026-10-02T00:00:00Z',
          spatialAnnotations: [
            { id: 'box-1', particleType: 'leukocytes', x: 50, y: 50, w: 5, h: 5 },
          ],
        },
      ],
    });

    expect(imageBoxes).toHaveLength(2);
    expect(imageBoxes.map((box) => box.source)).toEqual(['MEDTECH', 'SUPERVISOR']);
    // Same box `id` from different reviewers must not collide once flattened.
    expect(new Set(imageBoxes.map((box) => box.renderKey)).size).toBe(2);
  });

  it('treats missing or null spatial annotations as empty', (): void => {
    const { imageBoxes } = mapResultReviewDetail({
      ...baseDetail,
      annotations: [
        { reviewedBy: 'medtech-1', reviewerRole: 'MEDTECH', updatedAt: '2026-10-01T00:00:00Z' },
        {
          reviewedBy: 'medtech-2',
          reviewerRole: 'MEDTECH',
          updatedAt: '2026-10-01T00:00:00Z',
          spatialAnnotations: null,
        },
      ],
    });

    expect(imageBoxes).toEqual([]);
  });

  it('formats an unknown particle type into a readable label instead of dropping it', (): void => {
    const { imageBoxes } = mapResultReviewDetail({
      ...baseDetail,
      annotations: [
        {
          reviewedBy: 'medtech-1',
          reviewerRole: 'MEDTECH',
          updatedAt: '2026-10-01T00:00:00Z',
          spatialAnnotations: [
            { id: 'box-1', particleType: 'unidentified_particle', x: 10, y: 10, w: 5, h: 5 },
          ],
        },
      ],
    });

    expect(imageBoxes[0]).toMatchObject({
      particleType: 'unidentified_particle',
      label: 'Unidentified Particle',
    });
  });

  it('drops boxes with non-finite numbers or non-positive size', (): void => {
    const { imageBoxes } = mapResultReviewDetail({
      ...baseDetail,
      annotations: [
        {
          reviewedBy: 'medtech-1',
          reviewerRole: 'MEDTECH',
          updatedAt: '2026-10-01T00:00:00Z',
          spatialAnnotations: [
            { id: 'nan', particleType: 'bacteria', x: NaN, y: 10, w: 5, h: 5 },
            { id: 'zero-w', particleType: 'bacteria', x: 10, y: 10, w: 0, h: 5 },
            { id: 'negative-h', particleType: 'bacteria', x: 10, y: 10, w: 5, h: -5 },
          ],
        },
      ],
    });

    expect(imageBoxes).toEqual([]);
  });

  it('skips boxes wholly outside the image bounds', (): void => {
    const { imageBoxes } = mapResultReviewDetail({
      ...baseDetail,
      annotations: [
        {
          reviewedBy: 'medtech-1',
          reviewerRole: 'MEDTECH',
          updatedAt: '2026-10-01T00:00:00Z',
          spatialAnnotations: [
            { id: 'past-right', particleType: 'bacteria', x: 100, y: 10, w: 5, h: 5 },
            { id: 'past-left', particleType: 'bacteria', x: -20, y: 10, w: 10, h: 5 },
          ],
        },
      ],
    });

    expect(imageBoxes).toEqual([]);
  });

  it('clips boxes that only partially exceed the image bounds', (): void => {
    const { imageBoxes } = mapResultReviewDetail({
      ...baseDetail,
      annotations: [
        {
          reviewedBy: 'medtech-1',
          reviewerRole: 'MEDTECH',
          updatedAt: '2026-10-01T00:00:00Z',
          spatialAnnotations: [
            { id: 'overhang', particleType: 'bacteria', x: 95, y: 90, w: 10, h: 15 },
          ],
        },
      ],
    });

    expect(imageBoxes[0]).toMatchObject({ x: 95, y: 90, w: 5, h: 10 });
  });
});
