import { act, fireEvent, render } from '@testing-library/react-native';

import { AnnotationImage } from '@features/result-confirmation/components/AnnotationImage';
import type { AnnotationImageProps } from '@features/result-confirmation/components/AnnotationImage';

const existingBox = { id: 'saved-box', x: 20, y: 20, w: 30, h: 40, particleType: 'crystals' };
const props: AnnotationImageProps = {
  imageUrl: 'https://example.test/microscopy.jpg',
  boxes: [],
  otherBoxes: [],
  particleType: 'crystals',
  selectedId: null,
  mode: 'draw',
  isEditable: true,
  onChange: jest.fn(),
  onSelect: jest.fn(),
};

function openImage(overrides: Partial<AnnotationImageProps> = {}) {
  const view = render(<AnnotationImage {...props} {...overrides} />);
  act(() => {
    view
      .getByTestId('annotation-image')
      .props.onLayout({ nativeEvent: { layout: { width: 300, height: 200 } } });
  });
  act(() => {
    view
      .getByLabelText('Microscopy image')
      .props.onLoad({ nativeEvent: { source: { width: 600, height: 400 } } });
  });
  return view;
}

beforeEach((): void => {
  jest.clearAllMocks();
});

describe('microscopy annotation gestures', () => {
  it('normalizes a box drawn backwards to percentage coordinates', () => {
    const view = openImage();
    const image = view.getByTestId('annotation-image');
    expect(image.props.onStartShouldSetResponder()).toBe(true);
    fireEvent(image, 'responderGrant', {
      nativeEvent: { locationX: 240, locationY: 160, pageX: 250, pageY: 180 },
    });
    fireEvent(image, 'responderMove', { nativeEvent: { pageX: 70, pageY: 60 } });
    fireEvent(image, 'responderRelease');
    expect(props.onChange).toHaveBeenCalledWith([
      expect.objectContaining({ x: 20, y: 20, w: 60, h: 60, particleType: 'crystals' }),
    ]);
  });

  it('moves a saved box while retaining its ID and keeping it inside the image', () => {
    const view = openImage({ boxes: [existingBox], selectedId: existingBox.id, mode: 'move' });
    const image = view.getByTestId('annotation-image');
    fireEvent(image, 'responderGrant', {
      nativeEvent: { locationX: 60, locationY: 40, pageX: 60, pageY: 40 },
    });
    fireEvent(image, 'responderMove', { nativeEvent: { pageX: 660, pageY: -360 } });
    fireEvent(image, 'responderRelease');
    expect(props.onChange).toHaveBeenCalledWith([{ ...existingBox, x: 70, y: 0 }]);
  });

  it('resizes a saved box without changing its annotation identity', () => {
    const view = openImage({ boxes: [existingBox], selectedId: existingBox.id, mode: 'resize' });
    const image = view.getByTestId('annotation-image');
    fireEvent(image, 'responderGrant', {
      nativeEvent: { locationX: 100, locationY: 100, pageX: 100, pageY: 100 },
    });
    fireEvent(image, 'responderMove', { nativeEvent: { pageX: 160, pageY: 120 } });
    fireEvent(image, 'responderRelease');
    expect(props.onChange).toHaveBeenCalledWith([{ ...existingBox, w: 50, h: 50 }]);
  });

  it('does not turn a tap or a cancelled drag into a saved annotation', () => {
    const view = openImage();
    const image = view.getByTestId('annotation-image');
    fireEvent(image, 'responderGrant', {
      nativeEvent: { locationX: 60, locationY: 40, pageX: 60, pageY: 40 },
    });
    fireEvent(image, 'responderRelease');
    expect(props.onChange).not.toHaveBeenCalled();
    fireEvent(image, 'responderGrant', {
      nativeEvent: { locationX: 60, locationY: 40, pageX: 60, pageY: 40 },
    });
    fireEvent(image, 'responderMove', { nativeEvent: { pageX: 100, pageY: 100 } });
    fireEvent(image, 'responderTerminate');
    expect(props.onChange).not.toHaveBeenCalled();
  });

  it('does not capture gestures in a submitted result', () => {
    const view = openImage({ isEditable: false });
    expect(view.getByTestId('annotation-image').props.onStartShouldSetResponder()).toBe(false);
  });

  it('shows a retry notice when the microscopy image cannot be loaded', () => {
    const view = openImage();
    fireEvent(view.getByLabelText('Microscopy image'), 'error');
    expect(view.getByText(/Microscopy image unavailable/)).toBeTruthy();
  });
});
