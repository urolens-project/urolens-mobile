import {
  buildFindingRows,
  formatParticleName,
} from '../../src/features/result-confirmation/lib/findingRows';

describe('formatParticleName', () => {
  it('title-cases and replaces underscores', () => {
    expect(formatParticleName('epithelial_cells')).toBe('Epithelial Cells');
    expect(formatParticleName('rbc')).toBe('Rbc');
  });
});

describe('buildFindingRows', () => {
  it('lists the AI findings as reported when nothing was overridden', () => {
    const rows = buildFindingRows({ rbc: 3, wbc: 12 }, {});
    expect(rows).toEqual([
      { key: 'rbc', label: 'Rbc', count: 3, aiCount: 3, isOverridden: false },
      { key: 'wbc', label: 'Wbc', count: 12, aiCount: 12, isOverridden: false },
    ]);
  });

  // Bug: an override was merged straight into the AI counts, so a corrected value was
  // indistinguishable from what the AI reported.
  it('marks a corrected parameter as overridden and keeps the AI value alongside', () => {
    const [row] = buildFindingRows({ wbc: 12 }, { wbc: 5 });
    expect(row).toMatchObject({ count: 5, aiCount: 12, isOverridden: true });
  });

  // Bug: a class overridden to zero was filtered out with the AI's own zeros, so the
  // correction silently vanished — and if it was the only row, the card rendered empty.
  it('keeps a parameter the MedTech corrected to zero, marked as overridden', () => {
    const rows = buildFindingRows({ bacteria: 4 }, { bacteria: 0 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: 'bacteria', count: 0, aiCount: 4, isOverridden: true });
  });

  it('hides zero-count classes the MedTech did not touch', () => {
    const rows = buildFindingRows({ rbc: 0, wbc: 3 }, {});
    expect(rows.map((r) => r.key)).toEqual(['wbc']);
  });

  it('is empty when there is nothing to show, so the caller can say "No particles detected"', () => {
    expect(buildFindingRows({}, {})).toEqual([]);
    expect(buildFindingRows({ rbc: 0 }, {})).toEqual([]);
  });

  it('includes an override for a parameter the AI did not report', () => {
    const rows = buildFindingRows({ rbc: 2 }, { casts: 1 });
    expect(rows.map((r) => r.key)).toEqual(['rbc', 'casts']);
    expect(rows[1]).toMatchObject({ count: 1, aiCount: 0, isOverridden: true });
  });
});
