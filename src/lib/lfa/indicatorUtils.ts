/**
 * Indicator Utility Functions
 *
 * Sanitizes internal registry identifiers out of text that a human reads.
 *
 * The codes come from the ontology registry (`ontology/*.yaml`, surfaced as
 * `generated/registry.generated.ts`) and are fed to the reasoning model inside
 * the grounding message as `- IND-001 [name]: definition`. They are selection
 * aids, not content. The model echoes them back into indicator statements
 * anyway, so anything on its way into the LFA matrix is scrubbed here as well
 * — the prompt rule reduces the leak, this makes it deterministic.
 *
 * Shapes observed in production output: `IND-001`, `IND-WASH-USE-018`,
 * `IND-OP-4.1`, `SECTOR-007`, `OF-...`, `OPF-...`, `PF-...`, `ACT-...`, plus
 * the space-separated form the model sometimes produces, `IND 01`.
 */

/** Registry prefixes that are internal identifiers rather than content. */
const REGISTRY_PREFIXES = ['IND', 'OF', 'OPF', 'PF', 'ACT', 'SECTOR'];

/**
 * A full registry code: a known prefix joined by `-`, `_` or a single space to
 * at least one segment of digits or uppercase letters, e.g. `IND-001`,
 * `IND-WASH-USE-018`, `IND-OP-4.1`, `IND 01`.
 *
 * Case-sensitive on the prefix on purpose: lowercase "act" and "of" are
 * ordinary English words, and matching them would corrupt real sentences.
 */
const CODE_BODY = `(?:${REGISTRY_PREFIXES.join('|')})(?:[-_ ][A-Z0-9]+(?:\\.[0-9]+)*)+`;

/** The code wrapped in brackets or parentheses: `(IND-001)`, `[IND-001]`. */
const WRAPPED_CODE = new RegExp(`[([]\\s*${CODE_BODY}\\s*[)\\]]`, 'g');

/** A bare code anywhere in the text, bounded so `INDIKATOR` is never matched. */
const BARE_CODE = new RegExp(`\\b${CODE_BODY}\\b`, 'g');

/** A code used as a label at the very start: `IND-001: `, `IND-001 - `. */
const LEADING_LABEL = new RegExp(`^\\s*(${CODE_BODY})\\s*[:\\-–—]\\s*`);

export interface ParsedIndicator {
  /** Internal registry code if the text was labelled with one (e.g. "IND-001") */
  code: string | null;
  /** Clean human-readable indicator text */
  text: string;
}

/**
 * Collapses the whitespace and dangling punctuation left behind once codes are
 * removed, so `"Prevalensi stunting (IND-001) di desa"` does not become
 * `"Prevalensi stunting  di desa"` and `"IND-001 , Cakupan"` does not keep its
 * orphaned comma.
 */
function tidy(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\(\s*\)|\[\s*\]/g, '')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/^[\s,;:\-–—]+/, '')
    .replace(/[\s,;:]+$/, '')
    .trim();
}

/**
 * Removes every registry code from a string, wherever it appears.
 *
 * Returns the input unchanged when it holds no codes, so callers can apply it
 * broadly without rewriting clean text.
 */
export function stripRegistryCodes(text: string | null | undefined): string {
  if (!text) return '';
  const withoutWrapped = text.replace(WRAPPED_CODE, ' ');
  const withoutBare = withoutWrapped.replace(BARE_CODE, ' ');
  return tidy(withoutBare);
}

/**
 * Splits a leading registry label off the text, keeping the code so a caller
 * that wants to show provenance can render it as a separate badge. Codes that
 * appear mid-sentence are stripped rather than captured — they are noise, not a
 * label for the row.
 */
export function parseIndicatorText(text: string | null | undefined): ParsedIndicator {
  if (!text) return { code: null, text: '' };
  const trimmed = text.trim();
  const labelled = trimmed.match(LEADING_LABEL);
  if (labelled) {
    return {
      code: labelled[1].replace(/[_ ]/g, '-').toUpperCase(),
      text: stripRegistryCodes(trimmed.slice(labelled[0].length)),
    };
  }
  return { code: null, text: stripRegistryCodes(trimmed) };
}

/**
 * Returns human-readable indicator text with all internal registry codes gone.
 */
export function cleanIndicatorText(text: string | null | undefined): string {
  return parseIndicatorText(text).text;
}
