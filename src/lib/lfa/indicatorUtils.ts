/**
 * Indicator Utility Functions
 * Sanitizes and parses internal IDs (e.g. IND-OP-4.1, IND-OC-1.1) from indicator texts.
 */

export interface ParsedIndicator {
  /** Internal ID badge if detected (e.g. "IND-OP-4.1") */
  code: string | null;
  /** Clean human-readable indicator text */
  text: string;
}

/**
 * Strips internal ID prefixes like "IND-OP-4.1: ", "IND-OC-1.1:", "IND-GOAL: ", etc.
 */
export function parseIndicatorText(text: string | null | undefined): ParsedIndicator {
  if (!text) return { code: null, text: '' };
  const trimmed = text.trim();
  const match = trimmed.match(/^(IND-[A-Z0-9.-]+|IND_[A-Z0-9._-]+)\s*:\s*(.*)$/i);
  if (match) {
    return {
      code: match[1].toUpperCase(),
      text: match[2].trim(),
    };
  }
  return { code: null, text: trimmed };
}

/**
 * Returns human-readable indicator text stripped of internal ID prefix.
 */
export function cleanIndicatorText(text: string | null | undefined): string {
  return parseIndicatorText(text).text;
}
