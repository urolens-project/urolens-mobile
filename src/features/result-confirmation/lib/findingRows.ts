export interface FindingRow {
  /** The raw particle key, e.g. `epithelial_cells`. */
  key: string;
  /** Display name, e.g. `Epithelial Cells`. */
  label: string;
  /** The value to show — the MedTech's correction if there is one, else the AI count. */
  count: number;
  /** What the AI originally reported. */
  aiCount: number;
  /** True when the MedTech corrected this parameter. */
  isOverridden: boolean;
}

export function formatParticleName(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * The rows for the AI Findings list. The AI engine only reports classes it
 * detected, so a class with a zero count is hidden — unless the MedTech set it
 * to zero themselves: that is a correction (usually a false positive removed)
 * and has to stay visible, marked as an override, not silently disappear.
 */
export function buildFindingRows(
  aiFindings: Record<string, number>,
  overrides: Record<string, number>,
): FindingRow[] {
  const keys = [...new Set([...Object.keys(aiFindings), ...Object.keys(overrides)])];

  return keys
    .map((key) => {
      const isOverridden = key in overrides;
      const aiCount = aiFindings[key] ?? 0;
      return {
        key,
        label: formatParticleName(key),
        count: isOverridden ? overrides[key] : aiCount,
        aiCount,
        isOverridden,
      };
    })
    .filter((row) => row.isOverridden || row.count > 0);
}
