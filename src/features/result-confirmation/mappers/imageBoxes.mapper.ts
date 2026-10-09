import type { components } from '@app-types/api';

import { formatParticleName } from '../lib/findingRows';
import type { PercentBox } from '../lib/imageBoxGeometry';
import type { ImageBox, ImageBoxSource } from '../types';

const MIN_BOX_PERCENT = 0;
const MAX_BOX_PERCENT = 100;

/**
 * @description Preserves AI detections and each reviewer's attributed boxes for the image overlay.
 * @param dto - Result detail for the image being displayed.
 */
export function mapResultImageBoxes(dto: components['schemas']['FullResultDetail']): ImageBox[] {
  const aiBoxes = (dto.aiDetections ?? []).flatMap((box): ImageBox[] => {
    const geometry = clipBoxToImageBounds(box);
    if (!geometry) return [];
    return [
      {
        ...geometry,
        id: box.id,
        renderKey: `AI:${dto.imageId ?? dto.resultId}:${box.id}`,
        particleType: box.particleType,
        label: formatParticleName(box.particleType),
        source: 'AI',
        confidence: box.confidence,
        reviewedBy: null,
        reviewerRole: null,
        updatedAt: null,
      },
    ];
  });
  const reviewerBoxes = (dto.annotations ?? []).flatMap((annotation): ImageBox[] =>
    (annotation.spatialAnnotations ?? []).flatMap((box): ImageBox[] => {
      const geometry = clipBoxToImageBounds(box);
      if (!geometry) return [];
      return [
        {
          ...geometry,
          id: box.id,
          renderKey: `REVIEWER:${annotation.reviewedBy}:${box.id}`,
          particleType: box.particleType,
          label: formatParticleName(box.particleType),
          source: mapReviewerSource(annotation.reviewerRole),
          confidence: null,
          reviewedBy: annotation.reviewedBy,
          reviewerRole: annotation.reviewerRole,
          updatedAt: annotation.updatedAt,
        },
      ];
    }),
  );
  const seen = new Set<string>();
  return [...aiBoxes, ...reviewerBoxes].filter((box): boolean => {
    if (seen.has(box.renderKey)) return false;
    seen.add(box.renderKey);
    return true;
  });
}

function mapReviewerSource(role: string): ImageBoxSource {
  if (role === 'SUPERVISOR' || role === 'MEDTECH') return role;
  return 'REVIEWER';
}

function clipBoxToImageBounds(box: PercentBox): PercentBox | null {
  const { x, y, w, h } = box;
  if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return null;
  if (x >= MAX_BOX_PERCENT || y >= MAX_BOX_PERCENT) return null;
  if (x + w <= MIN_BOX_PERCENT || y + h <= MIN_BOX_PERCENT) return null;
  const clippedX = Math.max(x, MIN_BOX_PERCENT);
  const clippedY = Math.max(y, MIN_BOX_PERCENT);
  const clippedW = Math.min(x + w, MAX_BOX_PERCENT) - clippedX;
  const clippedH = Math.min(y + h, MAX_BOX_PERCENT) - clippedY;
  if (clippedW <= 0 || clippedH <= 0) return null;
  return { x: clippedX, y: clippedY, w: clippedW, h: clippedH };
}
