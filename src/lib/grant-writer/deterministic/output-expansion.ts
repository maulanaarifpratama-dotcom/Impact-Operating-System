import type {
  Page1Input,
  CanonicalCandidate,
  CanonicalOutcomeV2,
  CanonicalOutputV2
} from './types';
import { OUTPUT_FAMILIES, ALIAS_MAPPINGS } from './registry';

const OUTPUT_DISPLAY_NAMES: Record<string, string> = {
  'OPF-001': 'Pelatihan dan Sesi Pembelajaran Terselenggara',
  'OPF-002': 'Peserta Menyelesaikan Pelatihan dan Mentoring',
  'OPF-003': 'Dokumen Spesifikasi dan Desain Sistem Terbuat',
  'OPF-004': 'Portal dan Aplikasi Digital Berhasil Dikembangkan',
  'OPF-005': 'Pengujian Sistem dan UAT Selesai Ditandatangani',
  'OPF-006': 'Sistem Aplikasi Berhasil Beroperasi Secara Online',
  'OPF-007': 'Database dan Terintegrasinya Basis Data Terbentuk',
  'OPF-008': 'Laporan Validasi dan Audit Kualitas Data Terbit',
  'OPF-009': 'Naskah Draf SOP Operasional Selesai Disusun',
  'OPF-010': 'SOP Operasional dan Respons Resmi Disetujui',
  'OPF-011': 'Fasilitas dan Bangunan Fisik Selesai Dibangun',
  'OPF-012': 'Fasilitas dan Faskes Selesai Direnovasi',
  'OPF-014': 'Paket Bantuan, Alat, dan Sarana Terdistribusi',
  'OPF-015': 'Posyandu Siaga dan Loket Pelayanan Terbentuk',
  'OPF-016': 'Dokumen Laporan Hasil Kajian dan Riset Selesai',
  'OPF-017': 'Policy Brief dan Rekomendasi Kebijakan Diserahkan',
  'OPF-018': 'Draf Peraturan dan Naskah Akademik Terbuat',
  'OPF-019': 'Kebijakan dan Peraturan Resmi Disahkan',
  'OPF-020': 'Peluncuran Resmi Portal dan Platform Publik',
  'OPF-021': 'Jejaring Forum dan Kemitraan Terbentuk',
  'OPF-022': 'Dana Hibah dan Bantuan Modal Tersalurkan',
  'OPF-023': 'Kemitraan Pasar dan MoU Offtaker Terjalin',
  'OPF-024': 'Modul Kurikulum dan Materi Ajar Selesai Disusun',
  'OPF-025': 'Produk Pengetahuan dan Jurnal Publikasi Terbit',
  'OPF-026': 'SOP dan Skema Mekanisme Rujukan Terbentuk'
};

/**
 * Which kind of thing an output family delivers.
 *
 * This map used to speak a private vocabulary — 'training', 'system',
 * 'document', 'infrastructure', 'goods' — while everything that reads
 * deliverable_type tests the declared one: 'training_completed',
 * 'digital_system', 'sop_document', 'tangible_good', 'service'. Only 'service'
 * appeared in both, so `del === 'digital_system'` in indicator-scaffolding and
 * `deliverable === 'digital_system'` in activity-decomposition were false for
 * every output this function ever produced.
 *
 * Those branches survived on their `|| output.code === 'OPF-020'` fallbacks,
 * which name a handful of codes each. Everything else — OPF-003 through
 * OPF-007, OPF-008, OPF-016 through OPF-019, OPF-012, OPF-021 through
 * OPF-025 — fell through to the generic "Service / Market" indicators and the
 * default activity template, regardless of what it actually delivered. A
 * digital platform got the same indicators as a market linkage.
 *
 * 'infrastructure' and 'goods' both fold into 'tangible_good'; the contract has
 * no separate member for built facilities.
 */
export function getDeliverableType(outputFamilyId: string): CanonicalOutputV2['deliverable_type'] {
  const map: Record<string, CanonicalOutputV2['deliverable_type']> = {
    'OPF-001': 'training_completed',
    'OPF-002': 'training_completed',
    'OPF-003': 'digital_system',
    'OPF-004': 'digital_system',
    'OPF-005': 'digital_system',
    'OPF-006': 'digital_system',
    'OPF-007': 'digital_system',
    'OPF-008': 'sop_document',
    'OPF-009': 'sop_document',
    'OPF-010': 'sop_document',
    'OPF-011': 'tangible_good',
    'OPF-012': 'tangible_good',
    'OPF-014': 'tangible_good',
    'OPF-015': 'tangible_good',
    'OPF-016': 'sop_document',
    'OPF-017': 'sop_document',
    'OPF-018': 'sop_document',
    'OPF-019': 'sop_document',
    'OPF-020': 'digital_system',
    'OPF-021': 'service',
    'OPF-022': 'tangible_good',
    'OPF-023': 'service',
    'OPF-024': 'sop_document',
    'OPF-025': 'sop_document',
    'OPF-026': 'sop_document'
  };
  return map[outputFamilyId] || 'service';
}

/**
 * Maps Output Families to likely Parent Outcome Families.
 */
const OUTPUT_TO_OUTCOME_AFFINITY: Record<string, string[]> = {
  'OPF-001': ['OF-001', 'OF-002', 'OF-003', 'OF-006', 'OF-014', 'OF-022', 'OF-025'],
  'OPF-002': ['OF-002', 'OF-003', 'OF-009', 'OF-014', 'OF-025'],
  'OPF-003': ['OF-004', 'OF-019'],
  'OPF-004': ['OF-004', 'OF-019'],
  'OPF-005': ['OF-004', 'OF-019'],
  'OPF-006': ['OF-004', 'OF-019'],
  'OPF-007': ['OF-014', 'OF-019'],
  'OPF-008': ['OF-014', 'OF-019'],
  'OPF-009': ['OF-014', 'OF-019'],
  'OPF-010': ['OF-014', 'OF-019'],
  'OPF-011': ['OF-005', 'OF-006', 'OF-010', 'OF-022'],
  'OPF-012': ['OF-005', 'OF-006'],
  'OPF-014': ['OF-003', 'OF-004', 'OF-008', 'OF-010', 'OF-011', 'OF-022', 'OF-025'],
  'OPF-015': ['OF-006', 'OF-025'],
  'OPF-016': ['OF-014', 'OF-019'],
  'OPF-017': ['OF-014', 'OF-019'],
  'OPF-018': ['OF-014', 'OF-019'],
  'OPF-019': ['OF-014', 'OF-019'],
  'OPF-020': ['OF-004', 'OF-019'],
  'OPF-021': ['OF-014', 'OF-025'],
  'OPF-022': ['OF-009'],
  'OPF-023': ['OF-004', 'OF-008', 'OF-009', 'OF-010'],
  'OPF-024': ['OF-001', 'OF-002'],
  'OPF-025': ['OF-001', 'OF-014'],
  'OPF-026': ['OF-006', 'OF-019', 'OF-025']
};

/**
 * Output Expansion Layer (27.5k Brain Specification)
 * Processes collected candidates, associates output nodes to parent outcome nodes,
 * enforces parent linkage (`parent_outcome_id`), bounds each outcome to 2–3 outputs,
 * and generates `CanonicalOutputV2[]`.
 */
export function expandOutputs(
  input: Page1Input,
  outcomes: CanonicalOutcomeV2[],
  candidates: CanonicalCandidate[]
): {
  outputs: CanonicalOutputV2[];
  guardrailStatus: 'PASS' | 'WARNING' | 'FAIL';
  guardrailMessage: string;
} {
  if (!outcomes || outcomes.length === 0) {
    return {
      outputs: [],
      guardrailStatus: 'FAIL',
      guardrailMessage: 'FAIL: Cannot expand outputs without parent outcomes.'
    };
  }

  // 1. Collect direct output candidates and archetypes
  const directOutputs = candidates.filter(c => c.candidateType === 'output');
  const archetypeCandidates = candidates.filter(c => c.candidateType === 'archetype');

  // Candidate pool with scores
  const outputPool = new Map<string, { candidateId: string; score: number; evidence: string }>();

  // Helper to add to pool
  function addToPool(rawOpfId: string, score: number, evidenceText: string) {
    const resolvedId = ALIAS_MAPPINGS[rawOpfId] || rawOpfId;
    if (resolvedId === 'OPF-013') return; // Skip deprecated alias

    const existing = outputPool.get(resolvedId);
    if (!existing || existing.score < score) {
      outputPool.set(resolvedId, { candidateId: resolvedId, score, evidence: evidenceText });
    }
  }

  // Populate from direct output candidates
  for (const cand of directOutputs) {
    const spanCount = cand.rawEvidenceSpans.length;
    const signalCount = cand.matchedSignals.length;
    const bestEvidence = cand.rawEvidenceSpans.map(s => s.matchedText.trim()).find(t => t.length > 3) || '';
    addToPool(cand.canonicalId, spanCount * 2 + signalCount + 5, bestEvidence);
  }

  // Derive output candidates from intervention archetypes if present
  for (const arch of archetypeCandidates) {
    const archId = arch.canonicalId;
    if (archId.includes('TRAINING') || archId.includes('CAPACITY')) {
      addToPool('OPF-001', 8, 'Pelatihan dan peningkatan kapasitas');
      addToPool('OPF-002', 7, 'Pendampingan dan sertifikasi peserta');
    }
    if (archId.includes('DIGDEV') || archId.includes('CIVTECH')) {
      addToPool('OPF-004', 8, 'Pengembangan platform dan sistem digital');
      addToPool('OPF-020', 8, 'Peluncuran sistem dan portal digital');
    }
    if (archId.includes('ADVOCACY') || archId.includes('GOVERNANCE')) {
      addToPool('OPF-010', 7, 'Penyusunan dan pengesahan SOP operasional');
    }
  }

  // Also scan story text directly for key output deliverables
  const storyText = (
    (input.program_story || input.programStory || '') + ' ' +
    (input.proposed_solution || input.proposedSolution || '') + ' ' +
    (input.expected_outcomes || input.expectedOutcomes || '') + ' ' +
    (input.budget_breakdown || input.budgetBreakdown || '')
  ).toLowerCase();

  if (storyText.includes('demplot') || storyText.includes('pembuatan demplot')) {
    addToPool('OPF-011', 10, 'pembuatan demplot pertanian');
  }
  if (storyText.includes('jamban') || storyText.includes('toilet') || storyText.includes('membangun sanitasi') || storyText.includes('pembangunan fasilitas') || storyText.includes('pembangunan sarana') || storyText.includes('pemicuan stbm')) {
    addToPool('OPF-011', 10, 'pembangunan fasilitas sanitasi dan sarana air bersih');
  }
  if (storyText.includes('bibit') || storyText.includes('benih') || storyText.includes('pupuk') || storyText.includes('tensimeter') || storyText.includes('sabun') || storyText.includes('alat') || storyText.includes('mesin') || storyText.includes('tangki air') || storyText.includes('varietas padi')) {
    addToPool('OPF-014', 10, 'penyerahan dan distribusi bantuan sarana/alat/paket/benih');
  }
  if (storyText.includes('temu bisnis') || storyText.includes('offtaker') || storyText.includes('off-taker') || storyText.includes('pembeli') || storyText.includes('akses pasar')) {
    addToPool('OPF-023', 10, 'fasilitasi temu bisnis dan pasar offtaker');
  }
  if (storyText.includes('sp4n') || storyText.includes('portal pengaduan') || storyText.includes('lapor') || storyText.includes('aplikasi')) {
    addToPool('OPF-020', 10, 'peluncuran dan operasionalisasi platform/portal digital');
  }
  if (storyText.includes('rujukan') || storyText.includes('sistem rujukan') || storyText.includes('tindaklanjuti dalam waktu 3 hari') || storyText.includes('pengaduan warga selesai')) {
    addToPool('OPF-026', 10, 'mekanisme dan skema alur rujukan terintegrasi');
  }
  if (storyText.includes('sop') || storyText.includes('tata kelola') || storyText.includes('peraturan')) {
    addToPool('OPF-010', 9, 'pengesahan dan penerapan SOP operasional');
  }
  if (storyText.includes('forum') || storyText.includes('jejaring') || storyText.includes('komunitas')) {
    addToPool('OPF-021', 9, 'pembentukan forum dan jejaring kemitraan');
  }
  if (storyText.includes('hibah') || storyText.includes('modal') || storyText.includes('bantuan modal')) {
    addToPool('OPF-022', 9, 'penyaluran hibah modal usaha');
  }
  if (storyText.includes('pendampingan') || storyText.includes('pekka') || storyText.includes('sekolah lapang')) {
    addToPool('OPF-002', 9, 'pendampingan dan pengawalan peserta');
  }

  // 2. Associate outputs to parent outcomes
  const outputsByOutcome = new Map<string, CanonicalOutputV2[]>();
  for (const outcome of outcomes) {
    outputsByOutcome.set(outcome.id, []);
  }

  const assignedOutputCodes = new Set<string>();

  // Map each output from pool to the most appropriate outcome
  const poolEntries = Array.from(outputPool.entries()).sort((a, b) => b[1].score - a[1].score);

  for (const [opfId, { score, evidence }] of poolEntries) {
    // Find best parent outcome
    const affinities = OUTPUT_TO_OUTCOME_AFFINITY[opfId] || [];
    let bestOutcome = outcomes.find(o => affinities.includes(o.code));

    // Fallback: match by impact category
    if (!bestOutcome) {
      bestOutcome = outcomes.find(o => {
        const cat = o.impact_category;
        if (cat === 'education' && (opfId === 'OPF-001' || opfId === 'OPF-002' || opfId === 'OPF-024')) return true;
        if (cat === 'economic' && (opfId === 'OPF-001' || opfId === 'OPF-002' || opfId === 'OPF-014' || opfId === 'OPF-023')) return true;
        if (cat === 'governance' && (opfId === 'OPF-010' || opfId === 'OPF-017' || opfId === 'OPF-020' || opfId === 'OPF-026')) return true;
        if (cat === 'health' && (opfId === 'OPF-001' || opfId === 'OPF-002' || opfId === 'OPF-014' || opfId === 'OPF-015')) return true;
        if (cat === 'environment' && (opfId === 'OPF-001' || opfId === 'OPF-011' || opfId === 'OPF-014')) return true;
        return false;
      });
    }

    // Default fallback: primary outcome
    if (!bestOutcome) {
      bestOutcome = outcomes[0];
    }

    const currentList = outputsByOutcome.get(bestOutcome.id)!;
    if (currentList.length < 3 && !assignedOutputCodes.has(`${bestOutcome.id}::${opfId}`)) {
      assignedOutputCodes.add(`${bestOutcome.id}::${opfId}`);

      const registryItem = OUTPUT_FAMILIES.find(f => f.output_family_id === opfId);
      const name = OUTPUT_DISPLAY_NAMES[opfId] || (registryItem ? registryItem.canonical_name.replace(/_/g, ' ') : opfId);
      const descText = evidence || (registryItem ? registryItem.expected_verification : `Output deliverable for ${name}`);

      currentList.push({
        id: `OP-placeholder`, // assigned in final pass
        parent_outcome_id: bestOutcome.id,
        code: opfId,
        output_name: name,
        description: descText,
        deliverable_type: getDeliverableType(opfId),
        indicators: [],
        activities: []
      });
    }
  }

  // 3. Ensure every outcome has 2–3 outputs (fill fallback outputs if fewer than 2)
  const defaultFallbacksForOutcome: Record<string, string[]> = {
    'OF-001': ['OPF-001', 'OPF-002', 'OPF-024'],
    'OF-002': ['OPF-001', 'OPF-002', 'OPF-024'],
    'OF-003': ['OPF-001', 'OPF-002', 'OPF-014'],
    'OF-004': ['OPF-002', 'OPF-020', 'OPF-023'],
    'OF-006': ['OPF-001', 'OPF-002', 'OPF-014'],
    'OF-008': ['OPF-001', 'OPF-014', 'OPF-023'],
    'OF-009': ['OPF-001', 'OPF-002', 'OPF-022'],
    'OF-010': ['OPF-001', 'OPF-011', 'OPF-014'],
    'OF-013': ['OPF-001', 'OPF-002', 'OPF-010'],
    'OF-014': ['OPF-001', 'OPF-002', 'OPF-010'],
    'OF-019': ['OPF-010', 'OPF-020', 'OPF-026'],
    'OF-022': ['OPF-001', 'OPF-002', 'OPF-014'],
    'OF-025': ['OPF-001', 'OPF-002', 'OPF-014']
  };

  for (const outcome of outcomes) {
    const list = outputsByOutcome.get(outcome.id)!;
    if (list.length < 2) {
      const fallbacks = defaultFallbacksForOutcome[outcome.code] || ['OPF-001', 'OPF-002', 'OPF-014'];
      for (const fallbackOpf of fallbacks) {
        if (list.length >= 2) break;
        if (!list.some(o => o.code === fallbackOpf)) {
          const registryItem = OUTPUT_FAMILIES.find(f => f.output_family_id === fallbackOpf);
          const name = OUTPUT_DISPLAY_NAMES[fallbackOpf] || fallbackOpf;

          list.push({
            id: `OP-placeholder`,
            parent_outcome_id: outcome.id,
            code: fallbackOpf,
            output_name: name,
            description: registryItem?.expected_verification || `Standard deliverable for ${name}`,
            deliverable_type: getDeliverableType(fallbackOpf),
            indicators: [],
            activities: []
          });
        }
      }
    }
  }

  // 4. Flatten and assign sequential IDs (OP-1, OP-2, ...)
  const allOutputs: CanonicalOutputV2[] = [];
  let globalOutputIndex = 1;

  for (const outcome of outcomes) {
    const list = outputsByOutcome.get(outcome.id) || [];
    for (const item of list) {
      item.id = `OP-${globalOutputIndex++}`;
      allOutputs.push(item);
    }
  }

  // 5. Audit Guardrails and Quality
  let guardrailStatus: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';
  let guardrailMessage = 'Output expansion valid (2-3 outputs per outcome).';

  // Check orphan outputs
  const hasOrphan = allOutputs.some(op => !op.parent_outcome_id || !outcomes.some(oc => oc.id === op.parent_outcome_id));
  if (hasOrphan) {
    guardrailStatus = 'FAIL';
    guardrailMessage = 'FAIL: Orphan output detected without valid parent outcome ID.';
  }

  // Check output count per outcome
  for (const outcome of outcomes) {
    const count = allOutputs.filter(op => op.parent_outcome_id === outcome.id).length;
    if (count === 0) {
      guardrailStatus = 'FAIL';
      guardrailMessage = `FAIL: Outcome ${outcome.id} has 0 outputs.`;
      break;
    } else if (count === 1) {
      if (guardrailStatus !== 'FAIL') {
        guardrailStatus = 'WARNING';
        guardrailMessage = `WARNING: Outcome ${outcome.id} has only 1 output.`;
      }
    }
  }

  return {
    outputs: allOutputs,
    guardrailStatus,
    guardrailMessage
  };
}
