import { Alert } from 'react-native';
import { confirmRetake } from '../../src/features/image-retake/lib/confirmRetake';

beforeEach(() => jest.clearAllMocks());

describe('confirmRetake', () => {
  it('retakes straight away when there are no overrides to lose', () => {
    const onRetake = jest.fn();
    confirmRetake(false, onRetake);
    expect(onRetake).toHaveBeenCalledTimes(1);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('asks first when overrides would be discarded, and does not retake yet', () => {
    const onRetake = jest.fn();
    confirmRetake(true, onRetake);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Discard Overrides?',
      expect.stringContaining('manual overrides will be removed'),
      expect.any(Array),
    );
    expect(onRetake).not.toHaveBeenCalled();
  });

  it('retakes only when the destructive button is chosen, not on Cancel', () => {
    const onRetake = jest.fn();
    confirmRetake(true, onRetake);
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as {
      text: string;
      style?: string;
      onPress?: () => void;
    }[];

    const cancel = buttons.find((b) => b.text === 'Cancel');
    const retake = buttons.find((b) => b.text === 'Retake');
    expect(cancel?.style).toBe('cancel');
    expect(retake?.style).toBe('destructive');

    cancel?.onPress?.();
    expect(onRetake).not.toHaveBeenCalled();
    retake?.onPress?.();
    expect(onRetake).toHaveBeenCalledTimes(1);
  });
});
