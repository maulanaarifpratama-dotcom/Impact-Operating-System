/**
 * Activity-to-Budget Autoload — deterministic, no AI.
 *
 * Takes an Activity name/description and returns budget item candidates from
 * the existing static SBM and INKINDO reference data. All candidates are
 * marked ESTIMATE_UNVERIFIED because the reference tables have not yet been
 * verified against source documents (GW-B1, BUDGET-R1 contract).
 *
 * This module is pure functions only. No Supabase calls, no network, no AI.
 */

import { SBM_FLAT_ITEMS, type SbmItem } from '@/data/sbm2026';
import { INKINDO_ROLES, type InkindoRole } from '@/data/inkindo2026';
import {
  getProvenanceLabel,
  type BudgetProvenanceState,
} from '@/lib/grant-writer/deterministic/budget-provenance';

// ── Types ───────────────────────────────────────────────────────────────────

export type ReferenceFamily = 'sbm' | 'inkindo' | 'none';

export interface AutoloadCandidate {
  stableId: string;
  sourceActivityName: string;
  referenceFamily: ReferenceFamily;
  referenceItemName: string;
  itemName: string;
  category: string;
  unit: string;
  suggestedQuantity: number;
  suggestedUnitPrice: number | null;
  provenanceState: BudgetProvenanceState;
  requiresUserConfirmation: boolean;
  matchReason: string;
  matchedKeywords: string[];
  matchScore: number;
  duplicateKey: string;
  selected: boolean;
}

export interface AutoloadInput {
  activityName: string;
  existingItemKeys: string[];
  participantCount?: number;
  durationDays?: number;
}

// ── Normalization ───────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

// ── Keyword Families ────────────────────────────────────────────────────────

interface KeywordFamily {
  keywords: string[];
  sbmCategories: string[];
  inkindoRoles: string[];
  defaultUnit: string;
}

const KEYWORD_FAMILIES: KeywordFamily[] = [
  {
    keywords: ['pelatihan', 'workshop', 'bimtek', 'sosialisasi', 'training', 'lokakarya', 'diseminasi'],
    sbmCategories: ['Honorarium', 'Konsumsi', 'Transport', 'ATK', 'Cetak'],
    inkindoRoles: ['Fasilitator'],
    defaultUnit: 'Orang',
  },
  {
    keywords: ['rapat', 'pertemuan', 'fgd', 'diskusi', 'focus group', 'musyawarah', 'koordinasi'],
    sbmCategories: ['Konsumsi', 'Transport', 'Akomodasi', 'Cetak'],
    inkindoRoles: ['Fasilitator', 'Moderator'],
    defaultUnit: 'Orang',
  },
  {
    keywords: ['perjalanan', 'kunjungan', 'monitoring', 'pemantauan', 'evaluasi lapangan', 'supervisi'],
    sbmCategories: ['Transport', 'Akomodasi', 'Konsumsi'],
    inkindoRoles: ['Surveyor', 'Inspektur'],
    defaultUnit: 'Orang',
  },
  {
    keywords: ['penginapan', 'akomodasi', 'hotel', 'losmen', 'penginapan'],
    sbmCategories: ['Akomodasi'],
    inkindoRoles: [],
    defaultUnit: 'Hari',
  },
  {
    keywords: ['konsumsi', 'makan', 'snack', 'katering', 'minum', 'hidangan'],
    sbmCategories: ['Konsumsi'],
    inkindoRoles: [],
    defaultUnit: 'Orang',
  },
  {
    keywords: ['transportasi', 'transport', 'perjalanan', 'mobil', 'bus', 'bensin', 'bbm'],
    sbmCategories: ['Transport'],
    inkindoRoles: ['Pengemudi'],
    defaultUnit: 'Orang',
  },
  {
    keywords: ['pencetakan', 'cetak', 'publikasi', 'modul', 'buku', 'materi', 'spanduk', 'banner', 'backdrop'],
    sbmCategories: ['Cetak', 'ATK'],
    inkindoRoles: ['Desain Grafis'],
    defaultUnit: 'Unit',
  },
  {
    keywords: ['atk', 'perlengkapan', 'alat tulis', 'fotokopi', 'penggandaan'],
    sbmCategories: ['ATK'],
    inkindoRoles: [],
    defaultUnit: 'Paket',
  },
  {
    keywords: ['fasilitator', 'narasumber', 'moderator', 'pemateri', 'instruktur', 'trainer', 'pelatih'],
    sbmCategories: ['Honorarium'],
    inkindoRoles: ['Fasilitator'],
    defaultUnit: 'Hari',
  },
  {
    keywords: ['survei', 'pengumpulan data', 'data collection', 'kuesioner', 'wawancara', 'enumerator'],
    sbmCategories: ['Transport', 'Honorarium'],
    inkindoRoles: ['Surveyor'],
    defaultUnit: 'Orang',
  },
  {
    keywords: ['tenaga ahli', 'konsultan', 'studi', 'kajian', 'analisis', 'penelitian', 'riset', 'assessment'],
    sbmCategories: ['Honorarium', 'Transport', 'Cetak'],
    inkindoRoles: ['Asisten Tenaga Ahli', 'Surveyor'],
    defaultUnit: 'Bulan',
  },
  {
    keywords: ['dokumentasi', 'foto', 'video', 'dokumentasi'],
    sbmCategories: ['Cetak'],
    inkindoRoles: [],
    defaultUnit: 'Paket',
  },
  {
    keywords: ['komunikasi', 'internet', 'pulsa', 'data', 'telpon'],
    sbmCategories: [],
    inkindoRoles: ['Operator Komputer'],
    defaultUnit: 'Bulan',
  },
];

// ── Matching ────────────────────────────────────────────────────────────────

function keywordScore(tokens: string[], keywords: string[]): number {
  const matched = keywords.filter((kw) =>
    tokens.some((t) => t.includes(kw) || kw.includes(t)),
  );
  return matched.length / Math.max(keywords.length, 1);
}

function findBestFamily(tokens: string[]): KeywordFamily | null {
  let best: KeywordFamily | null = null;
  let bestScore = 0;

  for (const fam of KEYWORD_FAMILIES) {
    const score = keywordScore(tokens, fam.keywords);
    if (score > bestScore) {
      bestScore = score;
      best = fam;
    }
  }

  // Require at least one keyword match
  if (bestScore === 0) return null;

  return best;
}

function matchSbm(family: KeywordFamily, tokens: string[]): AutoloadCandidate[] {
  const candidates: AutoloadCandidate[] = [];
  const seenKeys = new Set<string>();

  for (const cat of family.sbmCategories) {
    const items = SBM_FLAT_ITEMS.filter((item) => item.category === cat);

    for (const item of items) {
      const itemTokens = tokenize(item.name);
      const directMatch = itemTokens.some((it) => tokens.some((t) => it.includes(t) || t.includes(it)));

      // Score: category match gives base, direct name match boosts
      let score = 0.5;
      if (directMatch) score = 0.9;

      const dupKey = `sbm|${normalize(item.name)}|${item.unit}`;
      if (seenKeys.has(dupKey)) continue;
      seenKeys.add(dupKey);

      candidates.push({
        stableId: `autoload-sbm-${item.name.replace(/\s+/g, '-').toLowerCase()}`,
        sourceActivityName: '',
        referenceFamily: 'sbm',
        referenceItemName: item.name,
        itemName: item.name,
        category: item.category,
        unit: item.unit,
        suggestedQuantity: 1,
        suggestedUnitPrice: item.price,
        provenanceState: 'ESTIMATE_UNVERIFIED',
        requiresUserConfirmation: true,
        matchReason: `Kategori "${cat}" cocok dengan kata kunci aktivitas`,
        matchedKeywords: family.keywords.filter((kw) =>
          tokens.some((t) => t.includes(kw) || kw.includes(t)),
        ),
        matchScore: score,
        duplicateKey: dupKey,
        selected: false,
      });
    }
  }

  return candidates;
}

function matchInkindo(family: KeywordFamily, tokens: string[]): AutoloadCandidate[] {
  const candidates: AutoloadCandidate[] = [];
  const seenKeys = new Set<string>();

  for (const roleName of family.inkindoRoles) {
    const role = INKINDO_ROLES.find((r) => r.role === roleName);
    if (!role) continue;

    const dupKey = `inkindo|${normalize(role.role)}|bulan`;
    if (seenKeys.has(dupKey)) continue;
    seenKeys.add(dupKey);

    const roleTokens = tokenize(role.role);
    const directMatch = roleTokens.some((rt) => tokens.some((t) => rt.includes(t) || t.includes(rt)));

    candidates.push({
      stableId: `autoload-inkindo-${role.role.replace(/\s+/g, '-').toLowerCase()}`,
      sourceActivityName: '',
      referenceFamily: 'inkindo',
      referenceItemName: role.role,
      itemName: role.role,
      category: role.category,
      unit: 'Bulan',
      suggestedQuantity: 1,
      suggestedUnitPrice: role.price_idr,
      provenanceState: 'ESTIMATE_UNVERIFIED',
      requiresUserConfirmation: true,
      matchReason: `Peran INKINDO "${role.role}" relevan dengan tipe aktivitas`,
      matchedKeywords: family.keywords.filter((kw) =>
        tokens.some((t) => t.includes(kw) || kw.includes(t)),
      ),
      matchScore: directMatch ? 0.8 : 0.4,
      duplicateKey: dupKey,
      selected: false,
    });
  }

  return candidates;
}

// ── Duplicate Prevention ────────────────────────────────────────────────────

export function buildDuplicateKey(
  referenceFamily: ReferenceFamily,
  itemName: string,
  unit: string,
): string {
  return `${referenceFamily}|${normalize(itemName)}|${normalize(unit)}`;
}

function filterDuplicateCandidates(
  candidates: AutoloadCandidate[],
  existingKeys: string[],
): AutoloadCandidate[] {
  const seen = new Set<string>();
  const externalKeys = new Set(existingKeys.map((k) => k.toLowerCase()));

  return candidates.filter((c) => {
    const key = c.duplicateKey.toLowerCase();
    if (seen.has(key) || externalKeys.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Ranking ─────────────────────────────────────────────────────────────────

function rankCandidates(candidates: AutoloadCandidate[]): AutoloadCandidate[] {
  return [...candidates].sort((a, b) => {
    // INKINDO below SBM (more specific, not always needed)
    if (a.referenceFamily === 'sbm' && b.referenceFamily === 'inkindo') return -1;
    if (a.referenceFamily === 'inkindo' && b.referenceFamily === 'sbm') return 1;
    // Higher score first
    return b.matchScore - a.matchScore;
  });
}

// ── Quantity Derivation ─────────────────────────────────────────────────────

function deriveQuantity(
  itemName: string,
  category: string,
  unit: string,
  participantCount?: number,
  durationDays?: number,
): number {
  const lower = normalize(itemName);

  if (category === 'Konsumsi' && participantCount && durationDays) {
    return participantCount * durationDays;
  }

  if ((category === 'Honorarium' || lower.includes('honorarium')) && durationDays) {
    if (unit === 'Hari') return durationDays;
    if (unit === 'jam') return durationDays;
  }

  if ((category === 'Transport' || lower.includes('transport')) && participantCount) {
    return participantCount;
  }

  if (category === 'Akomodasi' && durationDays) {
    return Math.max(durationDays - 1, 1);
  }

  return 1;
}

// ── Public API ──────────────────────────────────────────────────────────────

export function generateAutoloadCandidates(input: AutoloadInput): AutoloadCandidate[] {
  const { activityName, existingItemKeys, participantCount, durationDays } = input;
  const tokens = tokenize(activityName);
  const family = findBestFamily(tokens);

  if (!family) {
    return [];
  }

  const sbmCandidates = matchSbm(family, tokens);
  const inkindoCandidates = matchInkindo(family, tokens);

  let all = [...sbmCandidates, ...inkindoCandidates];

  all = filterDuplicateCandidates(all, existingItemKeys);
  all = rankCandidates(all);

  // Apply quantity derivation
  for (const c of all) {
    c.sourceActivityName = activityName;
    c.suggestedQuantity = deriveQuantity(
      c.itemName,
      c.category,
      c.unit,
      participantCount,
      durationDays,
    );
  }

  return all;
}

// ── Build existing item keys from budget items ──────────────────────────────

export function buildExistingKeys(
  budgetItems: Array<{ item_name?: string; unit?: string; wbs_item_id?: string | null }>,
): string[] {
  return budgetItems
    .filter((b) => b.item_name)
    .map((b) => {
      // Best-effort duplicate key for existing items
      return `sbm|${normalize(b.item_name || '')}|${normalize(b.unit || 'Paket')}`;
    });
}
