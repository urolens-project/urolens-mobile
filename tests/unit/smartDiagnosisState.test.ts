import {
  getSmartDiagnosisState,
  SMART_DIAGNOSIS_MESSAGES,
} from '../../src/features/result-confirmation/lib/smartDiagnosisState';
import type { SmartDiagnosisJson } from '../../src/db/models/AnalysisResult';

const diagnosis = (overrides: Partial<SmartDiagnosisJson> = {}): SmartDiagnosisJson => ({
  gout: { level: 'LOW', weighted_score: 0, evidence: [] },
  glomerulonephritis: { level: 'LOW', weighted_score: 0, evidence: [] },
  nephrolithiasis: { level: 'LOW', weighted_score: 0, evidence: [] },
  no_significant_indicators: true,
  ...overrides,
});

const base = { smartDiagnosis: null, unavailable: false, isSynced: true } as const;

describe('getSmartDiagnosisState', () => {
  it('is READY when a diagnosis exists', () => {
    expect(
      getSmartDiagnosisState({
        ...base,
        status: 'PENDING_SUPERVISOR_APPROVAL',
        smartDiagnosis: diagnosis(),
      }),
    ).toBe('READY');
  });

  // Bug: "Diagnosis not available." was shown for all of these, so a MedTech couldn't
  // tell "not generated yet" from "the engine failed".
  it('says it is generated after confirmation while the result awaits the MedTech', () => {
    expect(getSmartDiagnosisState({ ...base, status: 'PENDING_CONFIRM' })).toBe(
      'AFTER_CONFIRMATION',
    );
  });

  it('says the same after a return, since re-confirming regenerates it', () => {
    expect(getSmartDiagnosisState({ ...base, status: 'RETURNED_FOR_CORRECTION' })).toBe(
      'AFTER_CONFIRMATION',
    );
  });

  it('is UNAVAILABLE when the result is flagged as failed', () => {
    expect(
      getSmartDiagnosisState({ ...base, status: 'PENDING_SUPERVISOR_APPROVAL', unavailable: true }),
    ).toBe('UNAVAILABLE');
  });

  it('is UNAVAILABLE when the diagnosis payload itself says so', () => {
    expect(
      getSmartDiagnosisState({
        ...base,
        status: 'PENDING_SUPERVISOR_APPROVAL',
        smartDiagnosis: diagnosis({ unavailable: true }),
      }),
    ).toBe('UNAVAILABLE');
  });

  it('is AWAITING_SYNC when the confirmation is still queued on this device', () => {
    expect(
      getSmartDiagnosisState({ ...base, status: 'PENDING_SUPERVISOR_APPROVAL', isSynced: false }),
    ).toBe('AWAITING_SYNC');
  });

  it('is UNAVAILABLE when a synced confirmation still has no diagnosis', () => {
    expect(getSmartDiagnosisState({ ...base, status: 'APPROVED', isSynced: true })).toBe(
      'UNAVAILABLE',
    );
  });
});

describe('SMART_DIAGNOSIS_MESSAGES', () => {
  it('gives each non-ready state its own wording', () => {
    const messages = Object.values(SMART_DIAGNOSIS_MESSAGES);
    expect(new Set(messages).size).toBe(messages.length);
    expect(SMART_DIAGNOSIS_MESSAGES.AFTER_CONFIRMATION).toMatch(/after you confirm/);
    expect(SMART_DIAGNOSIS_MESSAGES.UNAVAILABLE).toMatch(/unavailable/i);
  });
});
