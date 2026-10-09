import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { ResultImagePanel } from '@features/result-confirmation/components/ResultImagePanel';
import type { ImageBox } from '@features/result-confirmation/types';

const box: ImageBox = {
  renderKey: 'medtech-1:box-1',
  id: 'box-1',
  particleType: 'erythrocytes',
  label: 'Erythrocytes',
  x: 20,
  y: 30,
  w: 10,
  h: 8,
  source: 'MEDTECH',
  confidence: null,
  reviewedBy: 'medtech-1',
  reviewerRole: 'MEDTECH',
  updatedAt: '2026-10-01T00:00:00Z',
};

function loadImage(): void {
  fireEvent(screen.getByLabelText('Microscopy image'), 'load', {
    nativeEvent: { source: { width: 1000, height: 500 } },
  });
}

function layoutWrapper(): void {
  fireEvent(screen.getByTestId('sampleImageWrapper'), 'layout', {
    nativeEvent: { layout: { width: 300, height: 300 } },
  });
}

describe('ResultImagePanel', () => {
  it('shows the unavailable message when there is no image URL', () => {
    render(<ResultImagePanel imageUrl={null} />);
    expect(screen.getByText(/Microscopy image unavailable/)).toBeTruthy();
  });

  it('falls back to the unavailable message after an image load error', () => {
    render(<ResultImagePanel imageUrl="https://example.test/img.jpg" boxes={[box]} />);
    fireEvent(screen.getByLabelText('Microscopy image'), 'error');
    expect(screen.getByText(/Microscopy image unavailable/)).toBeTruthy();
    expect(screen.queryByText('Erythrocytes', { includeHiddenElements: true })).toBeNull();
  });

  it('renders no overlay or legend when there are no boxes', () => {
    render(<ResultImagePanel imageUrl="https://example.test/img.jpg" boxes={[]} />);
    loadImage();
    layoutWrapper();
    expect(screen.queryByText(/annotation/)).toBeNull();
  });

  it('withholds the overlay until both image load and layout are known', () => {
    render(<ResultImagePanel imageUrl="https://example.test/img.jpg" boxes={[box]} />);
    loadImage();
    expect(screen.queryByText('Erythrocytes', { includeHiddenElements: true })).toBeNull();
    layoutWrapper();
    expect(screen.getByText('Erythrocytes', { includeHiddenElements: true })).toBeTruthy();
  });

  it('shows a legend summarizing annotation count and source once ready', () => {
    render(<ResultImagePanel imageUrl="https://example.test/img.jpg" boxes={[box]} />);
    loadImage();
    layoutWrapper();
    expect(screen.getByText('1 annotation · MedTech')).toBeTruthy();
  });

  it('resets an error and withholds boxes when a replacement image arrives', (): void => {
    const { rerender } = render(
      <ResultImagePanel imageId="old" imageUrl="old.jpg" boxes={[box]} />,
    );
    loadImage();
    layoutWrapper();
    fireEvent(screen.getByLabelText('Microscopy image'), 'error');
    rerender(<ResultImagePanel imageId="new" imageUrl="new.jpg" boxes={[box]} />);
    expect(screen.queryByText(/Microscopy image unavailable/)).toBeNull();
    expect(screen.queryByText('Erythrocytes', { includeHiddenElements: true })).toBeNull();
    loadImage();
    layoutWrapper();
    expect(screen.getByText('Erythrocytes', { includeHiddenElements: true })).toBeTruthy();
  });

  it('clears readiness for a changed image identity even when its URL is unchanged', (): void => {
    const { rerender } = render(
      <ResultImagePanel imageId="old" imageUrl="image.jpg" boxes={[box]} />,
    );
    loadImage();
    layoutWrapper();
    rerender(<ResultImagePanel imageId="new" imageUrl="image.jpg" boxes={[box]} />);
    expect(screen.queryByText('Erythrocytes', { includeHiddenElements: true })).toBeNull();
  });

  it('projects a box to the contained image', (): void => {
    render(<ResultImagePanel imageUrl="image.jpg" boxes={[{ ...box, x: 0, y: 0 }]} />);
    loadImage();
    layoutWrapper();
    expect(
      screen.getByTestId(`imageBox:${box.renderKey}`, { includeHiddenElements: true }),
    ).toHaveStyle({ left: 0, top: 75, width: 30, height: 12 });
  });

  it('identifies first-review AI boxes separately from saved reviewer boxes', (): void => {
    render(
      <ResultImagePanel
        imageUrl="image.jpg"
        boxes={[{ ...box, source: 'AI', confidence: 0.85 }]}
      />,
    );
    loadImage();
    layoutWrapper();
    expect(screen.getByText('1 annotation · AI')).toBeTruthy();
    expect(screen.getByLabelText(/Erythrocytes, AI/)).toBeTruthy();
  });

  it('refreshes boxes from new props without requiring a new image load', () => {
    const { rerender } = render(
      <ResultImagePanel imageUrl="https://example.test/img.jpg" boxes={[]} />,
    );
    loadImage();
    layoutWrapper();
    expect(screen.queryByText('Erythrocytes', { includeHiddenElements: true })).toBeNull();

    rerender(<ResultImagePanel imageUrl="https://example.test/img.jpg" boxes={[box]} />);
    expect(screen.getByText('Erythrocytes', { includeHiddenElements: true })).toBeTruthy();
  });
});
