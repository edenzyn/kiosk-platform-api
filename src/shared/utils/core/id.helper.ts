/**
 * Generates a short, URL-safe ID with a caller-supplied prefix.
 *
 * Format: `<prefix><base36-timestamp>_<base36-random>`
 *
 * @example
 * generatePrefixedId("rec_lic_") // "rec_lic_lkqw3b2a_m7x4zp"
 * generatePrefixedId("rec_ext_") // "rec_ext_lkqw3b2a_9z1pqr"
 *
 * @param prefix - The string prefix to prepend, e.g. `"rec_lic_"`.
 */
export const generatePrefixedId = (prefix: string): string =>
  `${prefix}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
