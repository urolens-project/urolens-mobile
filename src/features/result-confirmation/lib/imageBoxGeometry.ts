export interface ImageDisplaySize {
  width: number;
  height: number;
}

export interface PercentBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ProjectedBoxRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * @description Projects a percentage box (0-100 of the source image) into the pixel
 * rect of the image as actually displayed with `resizeMode="contain"` inside a measured
 * container, accounting for any letterboxing margin. Returns null when either size has
 * not been measured yet.
 * @param box - Percentage geometry from a mapped reviewer annotation.
 * @param imageSize - Natural pixel size of the loaded image.
 * @param containerSize - Measured size of the image's display area.
 */
export function projectPercentBox(
  box: PercentBox,
  imageSize: ImageDisplaySize,
  containerSize: ImageDisplaySize,
): ProjectedBoxRect | null {
  const imageRect = getContainedImageRect(imageSize, containerSize);
  if (!imageRect || ![box.x, box.y, box.w, box.h].every(Number.isFinite)) return null;
  if (box.w <= 0 || box.h <= 0) return null;
  return {
    left: imageRect.left + (box.x / 100) * imageRect.width,
    top: imageRect.top + (box.y / 100) * imageRect.height,
    width: (box.w / 100) * imageRect.width,
    height: (box.h / 100) * imageRect.height,
  };
}

/**
 * @description Measures the displayed image rect so both boxes and labels exclude letterboxing.
 * @param imageSize - Natural size of the loaded image.
 * @param containerSize - Available display area.
 */
export function getContainedImageRect(
  imageSize: ImageDisplaySize,
  containerSize: ImageDisplaySize,
): ProjectedBoxRect | null {
  const { width: imageWidth, height: imageHeight } = imageSize;
  const { width: containerWidth, height: containerHeight } = containerSize;
  if (
    ![imageWidth, imageHeight, containerWidth, containerHeight].every(
      (value): boolean => Number.isFinite(value) && value > 0,
    )
  )
    return null;

  const scale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
  const displayWidth = imageWidth * scale;
  const displayHeight = imageHeight * scale;
  const offsetX = (containerWidth - displayWidth) / 2;
  const offsetY = (containerHeight - displayHeight) / 2;

  return {
    left: offsetX,
    top: offsetY,
    width: displayWidth,
    height: displayHeight,
  };
}
