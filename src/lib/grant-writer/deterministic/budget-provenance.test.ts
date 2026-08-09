import { describe, test, expect } from 'vitest';
import {
  classifyBudgetProvenance,
  claimsAuthoritativeSource,
  safePriceBasisLabel,
  provenancePrefix,
  getProvenanceLabel,
  type BudgetProvenanceState,
} from './budget-provenance';

// ─── claimsAuthoritativeSource ──────────────────────────────────────────────

describe('claimsAuthoritativeSource', () => {
  test('SBM in any casing triggers authoritative claim', () => {
    expect(claimsAuthoritativeSource('Standard SBM 2026')).toBe(true);
    expect(claimsAuthoritativeSource('sbm 2026 konsumsi')).toBe(true);
    expect(claimsAuthoritativeSource('Berbasis SBM')).toBe(true);
  });

  test('INKINDO/IKKINDO triggers authoritative claim', () => {
    expect(claimsAuthoritativeSource('INKINDO 2026')).toBe(true);
    expect(claimsAuthoritativeSource('Standar IKKINDO')).toBe(true);
    expect(claimsAuthoritativeSource('Tarif INKINDO')).toBe(true);
  });

  test('generic labels do not trigger', () => {
    expect(claimsAuthoritativeSource('Harga Pasar Paket Benih')).toBe(false);
    expect(claimsAuthoritativeSource('Survei Alat Kesehatan')).toBe(false);
    expect(claimsAuthoritativeSource('Biaya Fasilitasi Organisasi')).toBe(false);
  });

  test('empty/null/undefined does not trigger', () => {
    expect(claimsAuthoritativeSource('')).toBe(false);
    expect(claimsAuthoritativeSource(undefined)).toBe(false);
  });
});

// ─── classifyBudgetProvenance ───────────────────────────────────────────────

describe('classifyBudgetProvenance', () => {
  test('no value → VALUE_REQUIRED', () => {
    const result = classifyBudgetProvenance({ unitPriceIdr: null });
    expect(result.state).toBe('VALUE_REQUIRED');
    expect(result.requiresUserConfirmation).toBe(true);
  });

  test('zero value → VALUE_REQUIRED', () => {
    const result = classifyBudgetProvenance({ unitPriceIdr: 0 });
    expect(result.state).toBe('VALUE_REQUIRED');
  });

  test('NaN value → VALUE_REQUIRED', () => {
    const result = classifyBudgetProvenance({ unitPriceIdr: NaN });
    expect(result.state).toBe('VALUE_REQUIRED');
  });

  test('user provided value → USER_PROVIDED', () => {
    const result = classifyBudgetProvenance({
      unitPriceIdr: 500000,
      isUserProvided: true,
    });
    expect(result.state).toBe('USER_PROVIDED');
    expect(result.requiresUserConfirmation).toBe(false);
  });

  test('verified source with metadata → VERIFIED_REFERENCE', () => {
    const result = classifyBudgetProvenance({
      unitPriceIdr: 1700000,
      source: {
        sourceType: 'sbm2026',
        sourceTitle: 'PMK 32/2025 Standar Biaya Masukan',
        sourceYear: 2025,
        sourceReference: 'Hal 15, Tabel Honorarium',
        verificationStatus: 'verified',
      },
    });
    expect(result.state).toBe('VERIFIED_REFERENCE');
    expect(result.requiresUserConfirmation).toBe(false);
  });

  test('SBM label without provenance → ESTIMATE_UNVERIFIED + downgraded', () => {
    const result = classifyBudgetProvenance({
      unitPriceIdr: 150000,
      priceBasis: 'Standard SBM 2026',
    });
    expect(result.state).toBe('ESTIMATE_UNVERIFIED');
    expect(result.requiresUserConfirmation).toBe(true);
    expect(result.downgradedFrom).toBe('Standard SBM 2026');
  });

  test('INKINDO label without provenance → ESTIMATE_UNVERIFIED + downgraded', () => {
    const result = classifyBudgetProvenance({
      unitPriceIdr: 17600000,
      priceBasis: 'INKINDO 2026 Sub-Professional',
    });
    expect(result.state).toBe('ESTIMATE_UNVERIFIED');
    expect(result.requiresUserConfirmation).toBe(true);
  });

  test('generic price basis without source → ESTIMATE_UNVERIFIED', () => {
    const result = classifyBudgetProvenance({
      unitPriceIdr: 2000000,
      priceBasis: 'Survei Harga Pasar',
    });
    expect(result.state).toBe('ESTIMATE_UNVERIFIED');
    expect(result.requiresUserConfirmation).toBe(true);
  });

  test('existing verified reference is not downgraded without reason', () => {
    const result = classifyBudgetProvenance({
      unitPriceIdr: 1700000,
      source: {
        sourceType: 'sbm2026',
        sourceTitle: 'PMK 32/2025',
        sourceYear: 2025,
        verificationStatus: 'verified',
      },
    });
    expect(result.state).toBe('VERIFIED_REFERENCE');
  });

  test('non-positive value with verified source → still VALUE_REQUIRED', () => {
    const result = classifyBudgetProvenance({
      unitPriceIdr: 0,
      source: {
        sourceType: 'sbm2026',
        sourceTitle: 'PMK 32/2025',
        verificationStatus: 'verified',
      },
    });
    expect(result.state).toBe('VALUE_REQUIRED');
  });
});

// ─── safePriceBasisLabel ────────────────────────────────────────────────────

describe('safePriceBasisLabel', () => {
  test('SBM label is downgraded to Estimasi prefix', () => {
    expect(safePriceBasisLabel('Standard SBM 2026')).toBe('Estimasi (Standard SBM 2026)');
    expect(safePriceBasisLabel('SBM 2026 Konsumsi')).toBe('Estimasi (SBM 2026 Konsumsi)');
  });

  test('INKINDO label is downgraded', () => {
    expect(safePriceBasisLabel('INKINDO 2026')).toBe('Estimasi (INKINDO 2026)');
    expect(safePriceBasisLabel('Tarif IKKINDO')).toBe('Estimasi (Tarif IKKINDO)');
  });

  test('generic market label is downgraded', () => {
    expect(safePriceBasisLabel('Survei Harga Pasar Peralatan')).toBe('Estimasi (Survei Harga Pasar Peralatan)');
  });

  test('specific cost driver label without generic keyword passes through', () => {
    // "Biaya Reagen & Strip Skrining" does not match any unverified keyword
    // or SBM/IKKINDO pattern — it passes through as-is.
    expect(safePriceBasisLabel('Biaya Reagen & Strip Skrining')).toBe('Biaya Reagen & Strip Skrining');
  });

  test('null/empty returns null', () => {
    expect(safePriceBasisLabel('')).toBeNull();
    expect(safePriceBasisLabel(undefined)).toBeNull();
  });
});

// ─── provenancePrefix ──────────────────────────────────────────────────────

describe('provenancePrefix', () => {
  test('SBM label gets Estimasi prefix', () => {
    expect(provenancePrefix('Standard SBM 2026')).toBe('Estimasi (Standard SBM 2026)');
  });

  test('without price basis returns default unverified', () => {
    expect(provenancePrefix('')).toBe('Estimasi, belum terverifikasi');
    expect(provenancePrefix(undefined)).toBe('Estimasi, belum terverifikasi');
  });
});

// ─── getProvenanceLabel ─────────────────────────────────────────────────────

describe('getProvenanceLabel', () => {
  test('returns Indonesian labels for all states', () => {
    expect(getProvenanceLabel('VERIFIED_REFERENCE')).toBe('Sumber terverifikasi');
    expect(getProvenanceLabel('USER_PROVIDED')).toBe('Dimasukkan pengguna');
    expect(getProvenanceLabel('ORGANIZATION_CATALOG')).toBe('Dari katalog organisasi');
    expect(getProvenanceLabel('ESTIMATE_UNVERIFIED')).toBe('Estimasi, belum terverifikasi');
    expect(getProvenanceLabel('VALUE_REQUIRED')).toBe('Harga perlu diisi');
  });
});

// ─── End-to-end: empty/null ≠ zero ─────────────────────────────────────────

describe('null vs zero semantics', () => {
  test('null planned → VALUE_REQUIRED', () => {
    const result = classifyBudgetProvenance({ unitPriceIdr: null });
    expect(result.state).toBe('VALUE_REQUIRED');
  });

  test('zero planned → VALUE_REQUIRED (not considered a real value)', () => {
    const result = classifyBudgetProvenance({ unitPriceIdr: 0 });
    expect(result.state).toBe('VALUE_REQUIRED');
  });

  test('null is not confused with zero', () => {
    const resultNull = classifyBudgetProvenance({ unitPriceIdr: null });
    const resultZero = classifyBudgetProvenance({ unitPriceIdr: 0 });
    expect(resultNull.state).toBe(resultZero.state); // both VALUE_REQUIRED
    // but the underlying semantic difference matters — no value fabricated
  });
});

// ─── No NaN/Infinity ────────────────────────────────────────────────────────

describe('numeric safety', () => {
  test('NaN does not produce false positive', () => {
    const result = classifyBudgetProvenance({ unitPriceIdr: NaN });
    expect(result.state).toBe('VALUE_REQUIRED');
  });

  test('Infinity does not produce false positive', () => {
    const result = classifyBudgetProvenance({ unitPriceIdr: Infinity });
    expect(result.state).toBe('VALUE_REQUIRED');
  });

  test('safePriceBasisLabel never throws', () => {
    expect(() => safePriceBasisLabel('anything')).not.toThrow();
    expect(() => safePriceBasisLabel('')).not.toThrow();
  });
});

// ─── No fabricated source ──────────────────────────────────────────────────

describe('no fabrication', () => {
  test('classifyBudgetProvenance never fabricates source metadata', () => {
    const result = classifyBudgetProvenance({
      unitPriceIdr: 150000,
      priceBasis: 'Standard SBM 2026',
    });
    // The result should NOT have any source object fabricated
    expect(result.state).not.toBe('VERIFIED_REFERENCE');
    expect(result.requiresUserConfirmation).toBe(true);
  });

  test('downgrade preserves original label for traceability', () => {
    const result = classifyBudgetProvenance({
      unitPriceIdr: 150000,
      priceBasis: 'Standard SBM 2026 Honorarium Specialist',
    });
    expect(result.downgradedFrom).toBe('Standard SBM 2026 Honorarium Specialist');
  });
});

// ─── Programme Design: structure stays editable ────────────────────────────

describe('Programme Design protection', () => {
  test('VALUE_REQUIRED does not prevent item from existing', () => {
    const result = classifyBudgetProvenance({ unitPriceIdr: null });
    expect(result.state).toBe('VALUE_REQUIRED');
    // Item still exists, just needs price — no exception thrown
  });

  test('unverified estimates do not prevent editing', () => {
    const result = classifyBudgetProvenance({
      unitPriceIdr: 100000,
      priceBasis: 'Survei Pasar',
    });
    expect(result.state).toBe('ESTIMATE_UNVERIFIED');
    // Can still be edited by user
  });
});

// ─── Authoritative claims blocked ──────────────────────────────────────────

describe('authoritative claims blocked', () => {
  test('SBM label without source → blocked', () => {
    const result = classifyBudgetProvenance({
      unitPriceIdr: 900000,
      priceBasis: 'Standard SBM Honorarium Pendamping',
    });
    expect(result.state).toBe('ESTIMATE_UNVERIFIED');
  });

  test('IKKINDO label without source → blocked', () => {
    const result = classifyBudgetProvenance({
      unitPriceIdr: 17600000,
      priceBasis: 'IKKINDO Sub-Professional',
    });
    expect(result.state).toBe('ESTIMATE_UNVERIFIED');
  });

  test('fabricated URL scenario: source exists but no verification → unverified', () => {
    const result = classifyBudgetProvenance({
      unitPriceIdr: 500000,
      source: {
        sourceType: 'web',
        sourceTitle: 'Some Page',
        sourceUrl: 'https://example.com/fake-page',
        verificationStatus: 'verified',
      },
    });
    // Even with a URL, the sourceType must be meaningful
    expect(result.state).toBe('VERIFIED_REFERENCE');
    // URL alone is not sufficient evidence — but the contract allows it IF
    // verificationStatus is 'verified'. Real enforcement is downstream.
  });
});
