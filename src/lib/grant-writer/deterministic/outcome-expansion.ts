import type { Page1Input, CanonicalCandidate, CanonicalOutcomeV2 } from './types';
import { OUTCOME_FAMILIES } from './registry';
import { ALIAS_MAPPINGS } from './registry';

const OUTCOME_DISPLAY_NAMES: Record<string, string> = {
  'OF-001': 'Peningkatan Pengetahuan dan Pemahaman Kognitif',
  'OF-002': 'Penguasaan Keahlian Praktis dan Kompetensi Teknis',
  'OF-003': 'Penerapan dan Adopsi Praktik Baru Secara Rutin',
  'OF-004': 'Peningkatan Akses Pasar dan Saluran Distribusi',
  'OF-005': 'Peningkatan Akses Permodalan dan Keuangan',
  'OF-006': 'Peningkatan Kepatuhan Layanan Kesehatan dan Publik',
  'OF-007': 'Perbaikan Status Gizi dan Kesehatan Masyarakat',
  'OF-008': 'Efisiensi Biaya Operasional dan Pengurangan Kerugian',
  'OF-009': 'Peningkatan Pendapatan dan Omzet Usaha',
  'OF-010': 'Keberlanjutan Lingkungan dan Pertanian Organik/Adaptif',
  'OF-013': 'Penguatan Tata Kelola Internal dan Akuntabilitas Keuangan',
  'OF-014': 'Penguatan Tata Kelola Internal dan Akuntabilitas Keuangan',
  'OF-019': 'Peningkatan Akses Pelayanan Publik dan Hak Suara',
  'OF-022': 'Resiliensi dan Adaptasi Iklim Masyarakat',
  'OF-024': 'Kualifikasi dan Sertifikasi Kompetensi Teknisi',
  'OF-025': 'Kemandirian Kader Kesehatan dan Posyandu Siaga'
};

export function getImpactCategory(outcomeFamilyId: string): CanonicalOutcomeV2['impact_category'] {
  const map: Record<string, CanonicalOutcomeV2['impact_category']> = {
    'OF-001': 'education',
    'OF-002': 'education',
    'OF-003': 'economic',
    'OF-004': 'economic',
    'OF-005': 'economic',
    'OF-006': 'health',
    'OF-007': 'health',
    'OF-008': 'economic',
    'OF-009': 'economic',
    'OF-010': 'environment',
    'OF-011': 'environment',
    'OF-012': 'environment',
    'OF-013': 'governance',
    'OF-014': 'governance',
    'OF-015': 'governance',
    'OF-016': 'governance',
    'OF-017': 'governance',
    'OF-018': 'governance',
    'OF-019': 'governance',
    'OF-020': 'governance',
    'OF-021': 'governance',
    'OF-022': 'environment',
    'OF-023': 'economic',
    'OF-024': 'education',
    'OF-025': 'health',
    'OF-026': 'health'
  };
  return map[outcomeFamilyId] || 'economic';
}

/**
 * Outcome Expansion Layer (27.5k Brain Specification)
 * Processes collected candidates, extracts, ranks, deduplicates, and expands top 1–3 outcome nodes.
 */
export function expandOutcomes(
  _input: Page1Input,
  candidates: CanonicalCandidate[]
): {
  outcomes: CanonicalOutcomeV2[];
  guardrailStatus: 'PASS' | 'WARNING' | 'FAIL';
  guardrailMessage: string;
} {
  // 1. Filter outcome candidates
  const outcomeCandidates = candidates.filter(c => c.candidateType === 'outcome');

  // 2. Map and deduplicate by canonical ID
  const mapByCanonicalId = new Map<string, { candidate: CanonicalCandidate; resolvedId: string; score: number }>();

  for (const cand of outcomeCandidates) {
    const rawId = cand.canonicalId;
    const resolvedId = ALIAS_MAPPINGS[rawId] || rawId;

    // Calculate deterministic strength score for ranking
    let predicateBonus = 0;
    for (const span of cand.rawEvidenceSpans) {
      if (
        span.signalType === 'positive_predicate_id' ||
        span.signalType === 'positive_predicate_en' ||
        span.signalType === 'object_of_change_id'
      ) {
        predicateBonus += 5;
      } else if (span.signalType === 'domain_outcome_signal') {
        predicateBonus += 3;
      }
    }

    // Specific domain outcome priority adjustments
    if (resolvedId === 'OF-008' && cand.rawEvidenceSpans.some(s => s.matchedText.includes('pupuk') || s.matchedText.includes('efisiensi'))) {
      predicateBonus += 5;
    }

    const spanCount = cand.rawEvidenceSpans.length;
    const signalCount = cand.matchedSignals.length;
    const score = spanCount * 2 + signalCount + predicateBonus;

    const existing = mapByCanonicalId.get(resolvedId);
    if (!existing || existing.score < score) {
      mapByCanonicalId.set(resolvedId, { candidate: cand, resolvedId, score });
    }
  }

  // 3. Sort candidates deterministically (score descending, then resolvedId ascending)
  const sorted = Array.from(mapByCanonicalId.entries()).sort((a, b) => {
    if (b[1].score !== a[1].score) {
      return b[1].score - a[1].score;
    }
    return a[0].localeCompare(b[0]);
  });

  // 4. Bound to top 1-3 outcomes
  const topOutcomeEntries = sorted.slice(0, 3);

  // Guardrail verification
  let guardrailStatus: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';
  let guardrailMessage = 'Outcome expansion valid (1-3 outcomes).';

  if (topOutcomeEntries.length === 0) {
    guardrailStatus = 'FAIL';
    guardrailMessage = 'REQUIRE_LLM_GROUNDING: 0 keyword candidates matched. Full GPT-5.5 reasoning required.';

    return {
      outcomes: [],
      guardrailStatus,
      guardrailMessage
    };
  } else if (topOutcomeEntries.length === 1) {
    guardrailStatus = 'WARNING';
    guardrailMessage = 'WARNING: Only 1 outcome detected; consider expanding story context.';
  }

  // 5. Expand into CanonicalOutcomeV2 nodes
  const outcomes: CanonicalOutcomeV2[] = topOutcomeEntries.map(([resolvedId, { candidate }], index) => {
    const registryItem = OUTCOME_FAMILIES.find(o => o.outcome_family_id === resolvedId);
    const displayName = OUTCOME_DISPLAY_NAMES[resolvedId] ||
      (registryItem ? registryItem.canonical_name_id.replace(/_/g, ' ') : resolvedId);

    // Extract best evidence phrase for description
    let evidenceText = candidate.rawEvidenceSpans.map(s => s.matchedText.trim()).find(t => t.length > 5);
    if (!evidenceText && registryItem) {
      evidenceText = registryItem.definition;
    }

    return {
      id: `OC-${index + 1}`,
      code: resolvedId,
      outcome_name: displayName,
      description: evidenceText || `Target outcome ${displayName} achieved through project interventions.`,
      impact_category: getImpactCategory(resolvedId),
      indicators: [],
      outputs: []
    };
  });

  return {
    outcomes,
    guardrailStatus,
    guardrailMessage
  };
}
