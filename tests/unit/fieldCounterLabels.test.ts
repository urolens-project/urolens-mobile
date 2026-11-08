/**
 * minFields is a minimum, not a cap — capturing beyond it is expected and fine.
 * These three near-duplicate "X of Y fields" labels must stop reading like a
 * limit (or a bug) once the accepted count passes it.
 */
import { FIELD_CAPTURE_TEXT } from '../../src/features/field-capture/constants/fieldCaptureText.constant';
import { formatFieldCounterLabel } from '../../src/features/queue/constants/queueText.constant';
import { SAMPLE_TEXT } from '../../src/features/sample/constants/sampleText.constant';

describe('fieldCounterLabel (field-capture)', () => {
  it('shows "X of Y fields" below the minimum', () => {
    expect(FIELD_CAPTURE_TEXT.fieldCounterLabel(7, 10)).toBe('7 of 10 fields');
  });

  it('switches to a plain count once the minimum is met', () => {
    expect(FIELD_CAPTURE_TEXT.fieldCounterLabel(10, 10)).toBe('10 fields (min. 10 met)');
  });

  it('does not keep comparing against the minimum once exceeded', () => {
    expect(FIELD_CAPTURE_TEXT.fieldCounterLabel(14, 10)).toBe('14 fields (min. 10 met)');
  });
});

describe('formatFieldCounterLabel (queue)', () => {
  it('shows "X of Y fields" below the minimum', () => {
    expect(formatFieldCounterLabel(7, 10)).toBe('7 of 10 fields');
  });

  it('switches to a plain count once exceeded', () => {
    expect(formatFieldCounterLabel(12, 10)).toBe('12 fields (min. 10 met)');
  });
});

describe('getCapturingFieldsBody (sample)', () => {
  it('tells the MedTech to keep capturing below the minimum', () => {
    expect(SAMPLE_TEXT.getCapturingFieldsBody(7, 10)).toBe(
      '7 of 10 fields accepted so far. Continue capturing until the minimum is reached, then submit for verification on the website.',
    );
  });

  it('says the minimum is met instead of "X of 10" once exceeded', () => {
    expect(SAMPLE_TEXT.getCapturingFieldsBody(12, 10)).toBe(
      '12 fields accepted — minimum of 10 met. Submit for verification on the website when ready.',
    );
  });
});
