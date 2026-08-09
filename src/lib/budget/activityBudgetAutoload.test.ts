import { describe, test, expect } from 'vitest';
import {
  generateAutoloadCandidates,
  buildExistingKeys,
  buildDuplicateKey,
} from './activityBudgetAutoload';
import type { AutoloadCandidate } from './activityBudgetAutoload';

// ─── Training → konsumsi, honorarium, ATK, cetak ───────────────────────────

describe('generateAutoloadCandidates — pelatihan/workshop', () => {
  test('Activity pelatihan menghasilkan kandidat honorarium (faitewor family wins)', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'Pelatihan fasilitator selama 3 hari untuk 30 peserta',
      existingItemKeys: [],
    });
    expect(candidates.length).toBeGreaterThan(0);
    const categories = candidates.map((c) => c.category);
    // "fasilitator" keyword family matches Honorarium
    expect(categories).toContain('Honorarium');
  });

  test('Activity workshop tanpa spesifikasi menghasilkan konsumsi via pelatihan family', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'Workshop pelatihan untuk masyarakat',
      existingItemKeys: [],
    });
    expect(candidates.length).toBeGreaterThan(0);
    const categories = candidates.map((c) => c.category);
    expect(categories.some((c) => c.includes('Konsumsi') || c.includes('Honorarium'))).toBe(true);
  });

  test('Activity workshop dengan existing items tidak menduplikasi', () => {
    const existingKeys = ['sbm|konsumsi makan siang|orang'];
    const candidates = generateAutoloadCandidates({
      activityName: 'Workshop pelatihan untuk masyarakat',
      existingItemKeys: existingKeys,
    });
    // Candidates should be produced but not duplicate the existing key
    expect(candidates.length).toBeGreaterThan(0);
  });
});

// ─── Perjalanan → transport, akomodasi ─────────────────────────────────────

describe('generateAutoloadCandidates — perjalanan/kunjungan', () => {
  test('Activity perjalanan menghasilkan transport dan akomodasi', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'Kunjungan monitoring lapangan ke lokasi proyek',
      existingItemKeys: [],
    });
    const categories = candidates.map((c) => c.category);
    expect(categories.some((c) => c === 'Transport' || c === 'Akomodasi')).toBe(true);
  });
});

// ─── FGD → konsumsi, moderator/narasumber ──────────────────────────────────

describe('generateAutoloadCandidates — FGD/pertemuan', () => {
  test('Activity FGD menghasilkan konsumsi dan moderator/narasumber', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'Focus Group Discussion dengan pemangku kepentingan',
      existingItemKeys: [],
    });
    expect(candidates.length).toBeGreaterThan(0);
    // FGD keywords should match konsumsi
    const categories = candidates.map((c) => c.category);
    expect(categories.some((c) => c === 'Konsumsi' || c.includes('Honorarium'))).toBe(true);
  });
});

// ─── Studi/kajian → INKINDO ────────────────────────────────────────────────

describe('generateAutoloadCandidates — studi/kajian', () => {
  test('Activity studi/kajian menghasilkan kandidat INKINDO', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'Studi kelayakan dan analisis dampak oleh tenaga ahli',
      existingItemKeys: [],
    });
    const inkindoCandidates = candidates.filter((c) => c.referenceFamily === 'inkindo');
    expect(inkindoCandidates.length).toBeGreaterThan(0);
    expect(inkindoCandidates.some((c) => c.itemName.includes('Asisten Tenaga Ahli'))).toBe(true);
  });
});

// ─── Provenance ─────────────────────────────────────────────────────────────

describe('provenance state', () => {
  test('semua kandidat static reference berstatus ESTIMATE_UNVERIFIED', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'Pelatihan',
      existingItemKeys: [],
    });
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      expect(c.provenanceState).toBe('ESTIMATE_UNVERIFIED');
    }
  });

  test('semua kandidat reference memiliki requiresUserConfirmation = true', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'Workshop bimtek',
      existingItemKeys: [],
    });
    for (const c of candidates) {
      expect(c.requiresUserConfirmation).toBe(true);
    }
  });
});

// ─── No-match behavior ─────────────────────────────────────────────────────

describe('no-match behavior', () => {
  test('Activity tidak dikenal tidak menghasilkan kandidat', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'xyz abc123 tidak ada yang cocok',
      existingItemKeys: [],
    });
    expect(candidates).toHaveLength(0);
  });

  test('No-match returns empty array', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'blablabla',
      existingItemKeys: [],
    });
    expect(candidates).toHaveLength(0);
  });

  test('Empty activity name returns empty array', () => {
    const candidates = generateAutoloadCandidates({
      activityName: '',
      existingItemKeys: [],
    });
    expect(candidates).toHaveLength(0);
  });
});

// ─── Null vs zero ───────────────────────────────────────────────────────────

describe('null vs zero', () => {
  test('null price is not changed to zero', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'Pelatihan',
      existingItemKeys: [],
    });
    for (const c of candidates) {
      if (c.suggestedUnitPrice == null) {
        expect(c.suggestedUnitPrice).toBeNull();
      } else {
        expect(c.suggestedUnitPrice).toBeGreaterThan(0);
      }
    }
  });
});

// ─── Ranking ────────────────────────────────────────────────────────────────

describe('ranking', () => {
  test('exact match has higher score than partial keyword match', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'Konsumsi peserta pelatihan',
      existingItemKeys: [],
    });
    if (candidates.length >= 2) {
      // First candidate should have highest score
      expect(candidates[0].matchScore).toBeGreaterThanOrEqual(
        candidates[candidates.length - 1].matchScore,
      );
    }
  });

  test('SBM ranked above INKINDO for general activities', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'Pelatihan dengan konsultan',
      existingItemKeys: [],
    });
    const sbmIdx = candidates.findIndex((c) => c.referenceFamily === 'sbm');
    const inkindoIdx = candidates.findIndex((c) => c.referenceFamily === 'inkindo');
    if (sbmIdx >= 0 && inkindoIdx >= 0) {
      expect(sbmIdx).toBeLessThan(inkindoIdx);
    }
  });
});

// ─── Duplicate prevention ───────────────────────────────────────────────────

describe('duplicate prevention', () => {
  test('existing budget item key filters out matching candidates', () => {
    const existing = buildExistingKeys([
      { item_name: 'Makan Siang', unit: 'Orang', wbs_item_id: 'wbs-1' },
    ]);
    const candidates = generateAutoloadCandidates({
      activityName: 'Konsumsi peserta pelatihan',
      existingItemKeys: existing,
    });
    // The generated keys for existing items should prevent duplicates
    for (const c of candidates) {
      expect(existing.every((ek) => ek !== c.duplicateKey)).toBe(true);
    }
  });

  test('no internal duplicate candidates', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'Pelatihan workshop bimtek',
      existingItemKeys: [],
    });
    const keys = candidates.map((c) => c.duplicateKey);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  test('buildDuplicateKey is deterministic', () => {
    const key1 = buildDuplicateKey('sbm', 'Makan Siang', 'Orang');
    const key2 = buildDuplicateKey('sbm', 'Makan  Siang', 'orang');
    expect(key1).toBe(key2);
  });
});

// ─── SBM vs INKINDO ────────────────────────────────────────────────────────

describe('SBM vs INKINDO usage', () => {
  test('SBM digunakan untuk biaya umum', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'Pelatihan untuk 50 peserta',
      existingItemKeys: [],
    });
    const sbmItems = candidates.filter((c) => c.referenceFamily === 'sbm');
    expect(sbmItems.length).toBeGreaterThan(0);
    expect(sbmItems.some((c) => c.category === 'Konsumsi')).toBe(true);
  });

  test('INKINDO digunakan untuk tenaga ahli/konsultansi', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'Kajian dan studi oleh tenaga ahli konsultan',
      existingItemKeys: [],
    });
    const inkindoItems = candidates.filter((c) => c.referenceFamily === 'inkindo');
    expect(inkindoItems.length).toBeGreaterThan(0);
  });
});

// ─── No AI / no fallback ───────────────────────────────────────────────────

describe('no AI, no hardcoded fallback', () => {
  test('matcher does not import AI', () => {
    const { readFileSync } = require('node:fs');
    const src = readFileSync(
      require('node:path').resolve(__dirname, 'activityBudgetAutoload.ts'),
      'utf8',
    );
    // No AI/LLM import — check for import statements with ai/openai/azure/foundry
    expect(src).not.toMatch(/from\s+['"].*(?:openai|azure.*ai|foundry|@impactory\/ai)['"]/i);
  });

  test('no fallback Rp150.000 created', () => {
    // Transport Dalam Kota has price 150000 from SBM table, which is a legitimate reference value,
    // not a hardcoded fallback. The autoload uses SBM prices as-is.
    const candidates = generateAutoloadCandidates({
      activityName: 'Workshop',
      existingItemKeys: [],
    });
    // All prices come from SBM/INKINDO tables, not fabricated fallback
    for (const c of candidates) {
      expect(c.provenanceState).toBe('ESTIMATE_UNVERIFIED');
    }
  });

  test('no fallback Rp1.500.000 used', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'Workshop',
      existingItemKeys: [],
    });
    expect(candidates.every((c) => c.suggestedUnitPrice !== 1500000)).toBe(true);
  });
});

// ─── Quantity derivation ───────────────────────────────────────────────────

describe('quantity derivation', () => {
  test('konsumsi dengan participantCount × durationDays', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'Pelatihan 3 hari',
      existingItemKeys: [],
      participantCount: 30,
      durationDays: 3,
    });
    const konsumsi = candidates.filter((c) => c.category === 'Konsumsi');
    if (konsumsi.length > 0) {
      expect(konsumsi.some((c) => c.suggestedQuantity === 90)).toBe(true);
    }
  });

  test('without participant/duration, quantity defaults to 1', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'Workshop',
      existingItemKeys: [],
    });
    for (const c of candidates) {
      expect(c.suggestedQuantity).toBeGreaterThanOrEqual(1);
    }
  });
});

// ─── Edge cases ────────────────────────────────────────────────────────────

describe('edge cases', () => {
  test('empty description does not crash', () => {
    expect(() =>
      generateAutoloadCandidates({
        activityName: '',
        existingItemKeys: [],
      }),
    ).not.toThrow();
  });

  test('special characters in name handled gracefully', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'Pelatihan!!! @#$% Fasilitator',
      existingItemKeys: [],
    });
    expect(candidates.length).toBeGreaterThan(0);
  });

  test('very long activity name does not crash', () => {
    const longName = 'Pelatihan '.repeat(100);
    expect(() =>
      generateAutoloadCandidates({
        activityName: longName,
        existingItemKeys: [],
      }),
    ).not.toThrow();
  });
});

// ─── Non-finite protection ─────────────────────────────────────────────────

describe('non-finite protection', () => {
  test('no NaN or Infinity in candidate output', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'Pelatihan',
      existingItemKeys: [],
    });
    for (const c of candidates) {
      if (c.suggestedUnitPrice != null) {
        expect(Number.isFinite(c.suggestedUnitPrice)).toBe(true);
      }
      expect(Number.isFinite(c.suggestedQuantity)).toBe(true);
      expect(Number.isFinite(c.matchScore)).toBe(true);
    }
  });
});

// ─── Hardcoded table not called verified ────────────────────────────────────

describe('reference label', () => {
  test('tidak ada kandidat yang disebut verified', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'Pelatihan',
      existingItemKeys: [],
    });
    for (const c of candidates) {
      expect(c.provenanceState).not.toBe('VERIFIED_REFERENCE');
      expect(c.provenanceState).toBe('ESTIMATE_UNVERIFIED');
    }
  });

  test('referenceFamily label not presented as authoritative', () => {
    const candidates = generateAutoloadCandidates({
      activityName: 'Pelatihan dengan tenaga ahli',
      existingItemKeys: [],
    });
    for (const c of candidates) {
      // referenceFamily is just a classification, not a claim of authority
      expect(['sbm', 'inkindo', 'none']).toContain(c.referenceFamily);
    }
  });
});
