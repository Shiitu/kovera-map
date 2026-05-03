/**
 * @file backend/src/utils/addressNormalizer.ts
 * @description Provides normalization logic for address comparison and deduplication.
 */

/**
 * Normalizes an address string for comparison.
 * - lowercase everything
 * - strip unit/apt/# suffixes
 * - trim whitespace
 * - collapse multiple spaces
 * 
 * Used for duplicate detection, NOT for display.
 */
export function normalizeAddress(address: string): string {
  if (!address) return '';

  return address
    .toLowerCase()
    .trim()
    // replace /\b(apt|unit|#|ste|suite)\s*[\w-]+/gi with ''
    .replace(/\b(apt|unit|#|ste|suite)\s*[\w-]+\b/gi, '')
    // remove some common punc
    .replace(/[.,]/g, '')
    // collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}
