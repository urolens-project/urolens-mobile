/** Mirrors the backend's settings.minFieldsPerSpecimen default (core/config.py).
 * Used as a local fallback wherever the real value hasn't been carried through
 * navigation params yet. Cross-feature (field-capture and queue), so it lives
 * here rather than inside one feature's folder. */
export const DEFAULT_MIN_FIELDS = 10;
