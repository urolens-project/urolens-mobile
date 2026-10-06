import type { SpatialAnnotation } from '../types';

interface ImagePoint {
  x: number;
  y: number;
}

/**
 * @description Keeps annotation geometry within the image regardless of drag direction.
 * @param start - Starting percentage coordinates.
 * @param end - Ending percentage coordinates.
 */
export function boxFromPoints(
  start: ImagePoint,
  end: ImagePoint,
): Pick<SpatialAnnotation, 'x' | 'y' | 'w' | 'h'> {
  const startX = Math.min(100, Math.max(0, start.x));
  const startY = Math.min(100, Math.max(0, start.y));
  const endX = Math.min(100, Math.max(0, end.x));
  const endY = Math.min(100, Math.max(0, end.y));
  return {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    w: Math.abs(endX - startX),
    h: Math.abs(endY - startY),
  };
}

/**
 * @description Moves a selected box without changing its size or allowing it outside the image.
 * @param box - Selected annotation.
 * @param delta - Movement in percentage coordinates.
 */
export function moveAnnotation(box: SpatialAnnotation, delta: ImagePoint): SpatialAnnotation {
  return {
    ...box,
    x: Math.max(0, Math.min(100 - box.w, box.x + delta.x)),
    y: Math.max(0, Math.min(100 - box.h, box.y + delta.y)),
  };
}
