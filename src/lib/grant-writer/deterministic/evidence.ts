import type { EvidenceSpan } from './types';
import { normalizeText } from './normalization';
import { getApprovedVariants } from './morphology';

export interface RawMatch {
  start: number; // in normalized text
  end: number; // in normalized text
  matchedValue: string;
  signalType: string;
  registryId: string;
}

/**
 * Finds all occurrences of phrase signals (and their approved morphological variants) in the normalized text and returns raw matches.
 */
export function findRawMatches(
  normalized: string,
  signals: string[],
  signalType: string,
  registryId: string
): RawMatch[] {
  const matches: RawMatch[] = [];
  if (!normalized) return matches;

  for (const signal of signals) {
    if (!signal) continue;
    
    // Expand to morphological variants
    const variants = getApprovedVariants(signal);
    for (const variant of variants) {
      const normSignal = normalizeText(variant).normalized;
      if (!normSignal) continue;

      let pos = normalized.indexOf(normSignal);
      while (pos !== -1) {
        matches.push({
          start: pos,
          end: pos + normSignal.length,
          matchedValue: signal, // Keep the original base signal
          signalType,
          registryId
        });
        // Move forward by 1 character to find overlapping occurrences first
        // Overlaps will be resolved by Longest-Match-First (LMF)
        pos = normalized.indexOf(normSignal, pos + 1);
      }
    }
  }

  return matches;
}

/**
 * Resolves overlapping matches using the Longest-Match-First (LMF) algorithm.
 * Prioritizes longer matches first. On equal length, prioritizes earlier matches.
 */
export function applyLongestMatchFirst(matches: RawMatch[]): RawMatch[] {
  // Sort by length descending, then by start position ascending
  const sorted = [...matches].sort((a, b) => {
    const lenA = a.end - a.start;
    const lenB = b.end - b.start;
    if (lenB !== lenA) {
      return lenB - lenA; // Longest first
    }
    return a.start - b.start; // Earlier first
  });

  const accepted: RawMatch[] = [];

  for (const match of sorted) {
    // Check if it overlaps with any already accepted match
    const overlaps = accepted.some(acc => {
      // Overlap condition: start of one is before end of other, and end of one is after start of other
      return !(match.end <= acc.start || acc.end <= match.start);
    });

    if (!overlaps) {
      accepted.push(match);
    }
  }

  // Sort accepted matches back to their original sequence order in normalized text
  return accepted.sort((a, b) => a.start - b.start);
}

/**
 * Generates EvidenceSpan objects from raw matches using index mapping.
 */
export function buildEvidenceSpans(
  rawMatches: RawMatch[],
  originalText: string,
  indexMapping: number[],
  sourceField: string
): EvidenceSpan[] {
  const spans: EvidenceSpan[] = [];

  for (const match of rawMatches) {
    if (match.start >= indexMapping.length || match.end - 1 >= indexMapping.length) {
      continue;
    }

    const startOffset = indexMapping[match.start];
    const endOffset = indexMapping[match.end - 1] + 1;

    // Retrieve original raw text from original source string
    const originalTextSlice = originalText.slice(startOffset, endOffset);

    spans.push({
      sourceField,
      originalText: originalTextSlice,
      matchedText: originalTextSlice,
      normalizedMatch: originalText.slice(startOffset, endOffset).normalize('NFKC').toLowerCase().trim(),
      startOffset,
      endOffset,
      signalType: match.signalType,
      registryId: match.registryId,
      signalId: match.matchedValue
    });
  }

  return spans;
}
