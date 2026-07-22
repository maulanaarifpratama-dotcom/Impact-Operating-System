/**
 * Indonesian Morphology matching and rules engine according to §9.2.
 * Enforces Anti-Aggressive Stemming and records Morphology-Only Confidence Cap metadata.
 */

// Mapping of canonical root words to their approved morphological variants (synonyms/informal expressions)
export const APPROVED_MORPHOLOGICAL_VARIANTS: Record<string, string[]> = {
  "melatih": ["pelatihan", "terlatih", "melatihlatih", "dilatih"],
  "pendampingan": ["mendampingi", "didampingi", "pendamping"],
  "memfasilitasi": ["fasilitasi", "difasilitasi", "fasilitator"],
  "pengadaan": ["mengadakan", "diadakan", "pengadaan"],
  "distribusi": ["membagikan", "didistribusikan", "menyerahkan", "penyerahan"],
  "pertanian": ["petani", "bertani", "tani", "pertaniannya"]
};

/**
 * Checks if a matched phrase is a morphological variant rather than the base positive signal.
 * If so, the cap metadata should flag this match with a limit of 0.40.
 *
 * @param matchedText The normalized match found in the text.
 * @param baseSignal The original base signal from the registry.
 * @returns boolean True if the match is a morphology-only match.
 */
export function isMorphologyOnlyMatch(matchedText: string, baseSignal: string): boolean {
  const normalizedMatch = matchedText.trim().toLowerCase();
  const normalizedBase = baseSignal.trim().toLowerCase();

  if (normalizedMatch === normalizedBase) {
    return false; // Exact match, not morphology-only variant
  }

  // Check if this is an approved morphological variant of the base signal
  const approvedVariants = APPROVED_MORPHOLOGICAL_VARIANTS[normalizedBase];
  if (approvedVariants && approvedVariants.includes(normalizedMatch)) {
    return true; // Match was made through an approved morphological variant
  }

  return false;
}

/**
 * Retrieves all approved morphological variants (including the base signal itself) for a given signal.
 */
export function getApprovedVariants(signal: string): string[] {
  const normSignal = signal.trim().toLowerCase();
  const variants = new Set<string>();
  variants.add(normSignal);

  // Check if it's a key
  if (APPROVED_MORPHOLOGICAL_VARIANTS[normSignal]) {
    for (const v of APPROVED_MORPHOLOGICAL_VARIANTS[normSignal]) {
      variants.add(v.trim().toLowerCase());
    }
  }

  // Check if it's a value under any key
  for (const [key, list] of Object.entries(APPROVED_MORPHOLOGICAL_VARIANTS)) {
    if (list.includes(normSignal)) {
      variants.add(key.trim().toLowerCase());
      for (const v of list) {
        variants.add(v.trim().toLowerCase());
      }
    }
  }

  return Array.from(variants);
}

