import { projectPercentBox } from '@features/result-confirmation/lib/imageBoxGeometry';

describe('projectPercentBox', () => {
  it('projects a letterboxed landscape image inside a square container', (): void => {
    // 1000x500 image inside a 300x300 container displays as 300x150, centered with a
    // 75pt top margin — the worked example from the implementation plan.
    const rect = projectPercentBox(
      { x: 20, y: 30, w: 10, h: 8 },
      { width: 1000, height: 500 },
      { width: 300, height: 300 },
    );
    expect(rect).toEqual({ left: 60, top: 120, width: 30, height: 12 });
  });

  it('projects a portrait image with no horizontal letterboxing', (): void => {
    const rect = projectPercentBox(
      { x: 0, y: 0, w: 50, h: 50 },
      { width: 400, height: 800 },
      { width: 400, height: 800 },
    );
    expect(rect).toEqual({ left: 0, top: 0, width: 200, height: 400 });
  });

  it('centers letterboxing for a landscape image inside a taller container', (): void => {
    // 800x400 image inside a 400x400 container displays as 400x200, centered with a
    // 100pt top margin.
    const rect = projectPercentBox(
      { x: 0, y: 0, w: 100, h: 100 },
      { width: 800, height: 400 },
      { width: 400, height: 400 },
    );
    expect(rect).toEqual({ left: 0, top: 100, width: 400, height: 200 });
  });

  it('keeps an edge box flush with the displayed image bounds', (): void => {
    const rect = projectPercentBox(
      { x: 90, y: 0, w: 10, h: 10 },
      { width: 1000, height: 500 },
      { width: 300, height: 300 },
    );
    expect(rect).toEqual({ left: 270, top: 75, width: 30, height: 15 });
  });

  it.each([
    [
      { width: 0, height: 500 },
      { width: 300, height: 300 },
    ],
    [
      { width: 1000, height: 500 },
      { width: 300, height: 0 },
    ],
  ])(
    'returns null when either size has not been measured yet',
    (imageSize, containerSize): void => {
      expect(projectPercentBox({ x: 0, y: 0, w: 10, h: 10 }, imageSize, containerSize)).toBeNull();
    },
  );
});
