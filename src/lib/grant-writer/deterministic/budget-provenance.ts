/**
 * Canonical Budget Value Provenance Contract (GW-B1).
 *
 * Every budget value in the GrantWriter pipeline must carry provenance metadata
 * so consumers (BudgetCalculator, materialization RPC, Programme Design, PM
 * Finance) can distinguish verified references from unverified estimates.
 *
 * SBM and INKINDO labels are NOT provenance by themselves — they are only
 * valid when accompanied by document identity, version, page/reference, and
 * verification status. Without those, the value is ESTIMATE_UNVERIFIED.
 *
 * This module is pure functions and types only. No database, no AI, no mutations.
 */

// ── Provenance State ──

export type BudgetProvenanceState =
  | 'VERIFIED_REFERENCE'
  | 'USER_PROVIDED'
  | 'ORGANIZATION_CATALOG'
  | 'ESTIMATE_UNVERIFIED'
  | 'VALUE_REQUIRED';

// ── Source Reference (required for VERIFIED_REFERENCE) ──

export interface VerifiedBudgetSource {
  sourceType: string;            // e.g. "sbm2026", "inkindo2026", "organization_catalog"
  sourceTitle: string;           // full document title
  sourceDocumentId?: string;     // document/version identity
  sourceUrl?: string;            // resolvable URL
  sourceVersion?: string;        // version/edition
  sourceYear?: number;           // publication year
  sourceRegion?: string;         // applicable region
  sourceCategory?: string;       // category/role
  sourceUnit?: string;           // unit of measure
  sourceReference?: string;      // page, table, or entry reference
  verificationStatus: 'verified'; // must be explicitly verified
}

// ── Price Basis Label Validation ──

const SBM_PATTERN = /\bSBM\b/i;
const IKKINDO_PATTERN = /\bIKKINDO\b|\bINKINDO\b/i;

const UNVERIFIED_PRICE_BASIS_LABELS = new Set([
  'estimasi',
  'estimasi internal',
  'perkiraan',
  'survei harga pasar',
  'harga pasar',
  'tarif kargo',
  'tarif langganan',
  'alokasi server',
  'biaya fasilitasi',
  'dukungan operasional',
  'rencana anggaran biaya',
  'rab',
  'standar biaya',
  'standar billing',
]);

/**
 * Determines whether a price_basis label makes an authoritative SBM or IKKINDO
 * claim. Returns true if the label purports to represent an official standard
 * without verifiable provenance.
 */
export function claimsAuthoritativeSource(priceBasis?: string): boolean {
  if (!priceBasis) return false;
  const normalized = priceBasis.trim().toLowerCase();

  if (SBM_PATTERN.test(normalized) || IKKINDO_PATTERN.test(normalized)) {
    return true;
  }

  return false;
}

/**
 * Classifies a budget value's provenance based on available metadata.
 *
 * Rules (fail-closed):
 * - If source metadata is complete → VERIFIED_REFERENCE
 * - If user explicitly provided the value → USER_PROVIDED
 * - If source claims SBM/IKKINDO but lacks provenance → ESTIMATE_UNVERIFIED
 * - If any value is present but source is unverifiable → ESTIMATE_UNVERIFIED
 * - If no value is available → VALUE_REQUIRED
 */
export function classifyBudgetProvenance(params: {
  unitPriceIdr?: number | null;
  priceBasis?: string;
  source?: VerifiedBudgetSource | null;
  isUserProvided?: boolean;
}): {
  state: BudgetProvenanceState;
  requiresUserConfirmation: boolean;
  downgradedFrom?: string;
} {
  const { unitPriceIdr, priceBasis, source, isUserProvided } = params;

  const hasValue = unitPriceIdr != null && Number.isFinite(unitPriceIdr) && unitPriceIdr > 0;

  if (!hasValue) {
    return { state: 'VALUE_REQUIRED', requiresUserConfirmation: true };
  }

  if (isUserProvided) {
    return { state: 'USER_PROVIDED', requiresUserConfirmation: false };
  }

  if (source && source.verificationStatus === 'verified') {
    const hasMinimalMetadata = source.sourceType && source.sourceTitle;
    if (hasMinimalMetadata) {
      return { state: 'VERIFIED_REFERENCE', requiresUserConfirmation: false };
    }
  }

  if (claimsAuthoritativeSource(priceBasis)) {
    return {
      state: 'ESTIMATE_UNVERIFIED',
      requiresUserConfirmation: true,
      downgradedFrom: priceBasis,
    };
  }

  return { state: 'ESTIMATE_UNVERIFIED', requiresUserConfirmation: true };
}

// ── Display Labels (Bahasa Indonesia) ──

const PROVENANCE_LABELS: Record<BudgetProvenanceState, string> = {
  VERIFIED_REFERENCE: 'Sumber terverifikasi',
  USER_PROVIDED: 'Dimasukkan pengguna',
  ORGANIZATION_CATALOG: 'Dari katalog organisasi',
  ESTIMATE_UNVERIFIED: 'Estimasi, belum terverifikasi',
  VALUE_REQUIRED: 'Harga perlu diisi',
};

export function getProvenanceLabel(state: BudgetProvenanceState): string {
  return PROVENANCE_LABELS[state];
}

// ── Downgrade: strip SBM/IKKINDO labels from price_basis ──

/**
 * Returns a safe price_basis label that never claims authoritative SBM/IKKINDO
 * reference without verified provenance.
 *
 * If the label claims SBM or IKKINDO, it is downgraded to a generic estimate
 * label. Existing data is not mutated — this is a display/computation function.
 */
export function safePriceBasisLabel(priceBasis?: string): string | null {
  if (!priceBasis) return null;

  const normalized = priceBasis.trim();

  if (SBM_PATTERN.test(normalized) || IKKINDO_PATTERN.test(normalized)) {
    return `Estimasi (${normalized})`;
  }

  const lower = normalized.toLowerCase();
  for (const unverified of UNVERIFIED_PRICE_BASIS_LABELS) {
    if (lower.includes(unverified)) {
      return `Estimasi (${normalized})`;
    }
  }

  return normalized;
}

/**
 * Returns explicit unverified prefix so the user knows the value is not
 * authoritative. Use when storing into lfa_budget_items or displaying.
 */
export function provenancePrefix(priceBasis?: string): string {
  const safe = safePriceBasisLabel(priceBasis);
  if (!safe) return 'Estimasi, belum terverifikasi';
  if (safe.startsWith('Estimasi')) return safe;
  return `Estimasi — ${safe}`;
}
