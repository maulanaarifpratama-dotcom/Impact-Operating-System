import type { NormalizerOutput } from './types';

/**
 * Normalizes input string according to specification §9.1 and maps character positions
 * in the normalized string back to original source text positions.
 *
 * @param source Original input string to normalize.
 * @returns NormalizerOutput containing the original, normalized string, and index mapping.
 */
export function normalizeText(source: string | null | undefined): NormalizerOutput {
  if (source === null || source === undefined) {
    return { original: '', normalized: '', indexMapping: [] };
  }

  // Preserve the original string, do not mutate
  const original = source;

  // Step 1: Unicode NFKC Normalization & lowercase conversion character-by-character
  // so we can track exact character mappings from nfkc back to original.
  const step1Normalized: string[] = [];
  const step1Mapping: number[] = []; // index in step1Normalized -> original index

  for (let i = 0; i < original.length; i++) {
    const origChar = original[i];
    // Strip diacritics / accents using NFD decomposition and character class stripping, then NFKC, then lowercase
    const nfkcChar = origChar
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .normalize('NFKC')
      .toLowerCase();
    
    for (let j = 0; j < nfkcChar.length; j++) {
      step1Normalized.push(nfkcChar[j]);
      step1Mapping.push(i);
    }
  }

  // Step 2: Punctuation stripping and collapsing whitespaces
  const finalNormalizedChars: string[] = [];
  const finalMapping: number[] = [];
  let inWhitespaceRun = false;

  for (let i = 0; i < step1Normalized.length; i++) {
    const char = step1Normalized[i];
    const originalIdx = step1Mapping[i];

    if (/\s/.test(char)) {
      if (!inWhitespaceRun) {
        // Skip leading space
        if (finalNormalizedChars.length > 0) {
          finalNormalizedChars.push(' ');
          finalMapping.push(originalIdx);
        }
        inWhitespaceRun = true;
      }
    } else if (/[\p{L}\p{N}-]/u.test(char)) {
      finalNormalizedChars.push(char);
      finalMapping.push(originalIdx);
      inWhitespaceRun = false;
    } else {
      // It is punctuation to strip (e.g. . , ? ! ( ) _ / " ')
      // Ignored: do not advance final normalized array, do not touch inWhitespaceRun
    }
  }

  // Trim trailing space if any
  if (finalNormalizedChars[finalNormalizedChars.length - 1] === ' ') {
    finalNormalizedChars.pop();
    finalMapping.pop();
  }

  return {
    original,
    normalized: finalNormalizedChars.join(''),
    indexMapping: finalMapping
  };
}
