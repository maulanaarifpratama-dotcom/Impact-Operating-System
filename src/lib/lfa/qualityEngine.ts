import {
  CanonicalLfaView,
  QualityDimensionResult,
  LfaQualityAssessment,
  QualityReadinessTier,
  AdapterFindingCode
} from './types';

/**
 * Deterministic LFA Quality Engine (RC-8C)
 * Advisory evaluation of LFA program design quality across 5 orthogonal vectors:
 * - DIM-CAUSAL: Causal Logic & Structural Integrity
 * - DIM-OUTCOME: Outcome Semantic Quality
 * - DIM-ACTOR: Actor & Governance Clarity
 * - DIM-MEAL: MEAL & Measurement Readiness
 * - DIM-SUSTAIN: Sustainability & Institutional Grounding
 *
 * This evaluation is strictly non-blocking and advisory.
 */

export function evaluateCausalLogic(view: CanonicalLfaView): QualityDimensionResult {
  const activeMissingRules: string[] = [];
  const activeFindingCodes: AdapterFindingCode[] = [];
  const repairActionPrompts: string[] = [];

  const hasGoal = view.goal !== null || view.purpose !== null;
  const allOutcomeNodes =
    view.outcomes.length > 0
      ? view.outcomes
      : view.purpose
      ? [view.purpose]
      : [];
  const hasOutcomes = allOutcomeNodes.length > 0;
  const hasOutputs = view.outputs.length > 0;
  const hasActivities = view.activities.length > 0;
  const unassignedOutputsCount = view.unassignedOutputs.length;
  const orphanedActivitiesCount = view.orphanedActivities.length;
  const unusedOutcomesCount = view.unusedOutcomes.length;

  if (!hasGoal) {
    repairActionPrompts.push('Tentukan Tujuan Utama (Goal) atau Tujuan Program (Purpose) yang jelas.');
  }

  if (!hasOutcomes) {
    activeMissingRules.push('MISS-008');
    repairActionPrompts.push('Rumuskan hasil perubahan konkret (Outcome) yang ingin dicapai.');
  }

  if (unassignedOutputsCount > 0) {
    activeFindingCodes.push('UNASSIGNED_OUTPUT');
    repairActionPrompts.push('Hubungkan output yang belum terasosiasi ke outcome terkait.');
  }

  if (orphanedActivitiesCount > 0) {
    activeFindingCodes.push('MISSING_PARENT');
    repairActionPrompts.push('Hubungkan aktivitas yang menggantung ke output terkait.');
  }

  if (unusedOutcomesCount > 0) {
    activeFindingCodes.push('UNUSED_SKELETON_OUTCOME');
    repairActionPrompts.push('Pastikan outcome memiliki aktivitas pendukung yang memadai.');
  }

  let status: QualityDimensionResult['status'];
  let scoreConfidence: number;

  if (!hasGoal || !hasOutcomes || orphanedActivitiesCount > 0) {
    status = 'INCOMPLETE';
    scoreConfidence = 0.40;
  } else if (unassignedOutputsCount > 0 || unusedOutcomesCount > 0 || !hasOutputs || !hasActivities) {
    status = 'PARTIAL';
    scoreConfidence = 0.75;
  } else {
    status = 'COMPLETE';
    scoreConfidence = 0.95;
  }

  return {
    status,
    scoreConfidence,
    activeMissingRules,
    activeFindingCodes,
    repairActionPrompts
  };
}

export function evaluateOutcomeQuality(
  view: CanonicalLfaView,
  page1Story?: string | null
): QualityDimensionResult {
  const activeMissingRules: string[] = [];
  const activeFindingCodes: AdapterFindingCode[] = [];
  const repairActionPrompts: string[] = [];

  const allOutcomeNodes =
    view.outcomes.length > 0
      ? view.outcomes
      : view.purpose
      ? [view.purpose]
      : [];
  const storyText = (page1Story || view.rawProject.name || '').toLowerCase();

  const outcomeVerbs = ['meningkat', 'peningkatan', 'adopsi', 'penerapan', 'penurunan', 'increase', 'improve', 'adopt', 'growth', 'kredibilitas', 'kemandirian', 'resiliensi', 'bebas', 'dampak', 'kinerja'];
  const activityVerbs = ['melatih', 'mengadakan', 'membagikan', 'menyalurkan', 'membangun', 'train', 'conduct', 'distribute'];

  let hasTrueOutcome = false;
  let hasActivityMasquerading = false;

  for (const outcome of allOutcomeNodes) {
    const text = (outcome.statement || '').toLowerCase();
    const matchesOutcomeVerb = outcomeVerbs.some((v) => text.includes(v));
    const matchesActivityVerb = activityVerbs.some((v) => text.includes(v));

    if (matchesOutcomeVerb) {
      hasTrueOutcome = true;
    }
    if (matchesActivityVerb && !matchesOutcomeVerb) {
      hasActivityMasquerading = true;
    }
  }

  if (!hasTrueOutcome && storyText.length > 0) {
    if (outcomeVerbs.some((v) => storyText.includes(v))) {
      hasTrueOutcome = true;
    }
  }

  if (allOutcomeNodes.length === 0) {
    activeMissingRules.push('MISS-008');
    repairActionPrompts.push('Formulasikan setidaknya satu Outcome yang menggambarkan perubahan perilaku atau kondisi.');
  }

  if (hasActivityMasquerading) {
    repairActionPrompts.push('Fokuskan pernyataan Outcome pada perubahan hasil (state change), bukan sekadar kegiatan (activity).');
  }

  let status: QualityDimensionResult['status'];
  let scoreConfidence: number;

  if (allOutcomeNodes.length === 0) {
    status = 'INCOMPLETE';
    scoreConfidence = 0.30;
  } else if (!hasTrueOutcome || hasActivityMasquerading) {
    status = 'PARTIAL';
    scoreConfidence = 0.65;
  } else {
    status = 'COMPLETE';
    scoreConfidence = 0.90;
  }

  return {
    status,
    scoreConfidence,
    activeMissingRules,
    activeFindingCodes,
    repairActionPrompts
  };
}

export function evaluateActorClarity(
  view: CanonicalLfaView,
  page1Story?: string | null
): QualityDimensionResult {
  const activeMissingRules: string[] = [];
  const activeFindingCodes: AdapterFindingCode[] = [];
  const repairActionPrompts: string[] = [];

  const beneficiaryDesc = view.rawProject.beneficiary_description;
  const beneficiaryCount = view.rawProject.beneficiary_count;
  const storyText = (page1Story || beneficiaryDesc || '').toLowerCase();

  const hasBeneficiaryInfo =
    (typeof beneficiaryDesc === 'string' && beneficiaryDesc.trim().length > 0) ||
    (typeof beneficiaryCount === 'number' && beneficiaryCount > 0);

  const targetActorKeywords = ['guru', 'kader', 'petani', 'staf', 'pengurus', 'petugas', 'opd', 'pelaku usaha', 'wusan', 'teacher', 'farmer', 'staff', 'nelayan', 'pemuda', 'ibu', 'balita', 'perempuan', 'warga', 'kk', 'siswa'];
  const hasTargetActorInStory = targetActorKeywords.some((k) => storyText.includes(k));

  if (!hasBeneficiaryInfo) {
    activeMissingRules.push('MISS-001');
    repairActionPrompts.push('Sediakan deskripsi dan estimasi jumlah penerima manfaat langsung.');
  }

  if (!hasTargetActorInStory) {
    activeMissingRules.push('MISS-006');
    repairActionPrompts.push('Klarifikasi aktor sasaran (target actor) yang diharapkan mengubah praktiknya.');
  }

  let status: QualityDimensionResult['status'];
  let scoreConfidence: number;

  if (!hasBeneficiaryInfo && !hasTargetActorInStory) {
    status = 'INCOMPLETE';
    scoreConfidence = 0.40;
  } else if (!hasBeneficiaryInfo || !hasTargetActorInStory) {
    status = 'PARTIAL';
    scoreConfidence = 0.70;
  } else {
    status = 'COMPLETE';
    scoreConfidence = 0.95;
  }

  return {
    status,
    scoreConfidence,
    activeMissingRules,
    activeFindingCodes,
    repairActionPrompts
  };
}

export function evaluateMealReadiness(
  view: CanonicalLfaView,
  page1Story?: string | null
): QualityDimensionResult {
  const activeMissingRules: string[] = [];
  const activeFindingCodes: AdapterFindingCode[] = [];
  const repairActionPrompts: string[] = [];

  const storyText = (page1Story || view.rawProject.beneficiary_description || '').toLowerCase();

  const hasBaselineInStory = /\b(baseline|kondisi awal|data awal|angka awal|sebelumnya)\b/i.test(storyText);
  if (!hasBaselineInStory) {
    activeMissingRules.push('MISS-010');
    repairActionPrompts.push('Sediakan data kondisi awal (baseline) untuk mengukur perubahan.');
  }

  const hasTargetMetric = /\b(target|menjadi|naik|sebesar|hanya|persen|%|\d+ orang|\d+ desa|\d+ sekolah|\d+ hektar|\d+ kwh|\d+ dataset|\d+ ibu|\d+ balita|\d+ pemuda|\d+ umkm)\b/i.test(storyText);
  if (!hasTargetMetric) {
    activeMissingRules.push('MISS-011');
    repairActionPrompts.push('Tentukan target angka perubahan yang spesifik.');
  }

  const hasUnit = /%|\b(persen|orang|jiwa|petani|kelompok|desa|sekolah|lembaga|unit|ton|hektar|usd|idr|kwh|dataset|balita|pemuda|umkm|kk)\b/i.test(storyText);
  if (!hasUnit) {
    activeMissingRules.push('MISS-013');
    repairActionPrompts.push('Pilih satuan ukuran indikator (misal: %, orang, desa).');
  }

  const allNodes = [...view.outcomes, ...(view.purpose ? [view.purpose] : []), ...view.outputs, ...view.activities];
  const hasMoV =
    allNodes.some((o) => typeof o.legacyMeansOfVerificationText === 'string' && o.legacyMeansOfVerificationText.trim().length > 0) ||
    /\b(verifikasi|audit|survei|sertifikat|dokumen|pencatatan|aplikasi|laporan|log|tes|edra|egra|kms|petaan|kaji)\b/i.test(storyText);

  if (!hasMoV) {
    activeMissingRules.push('MISS-014');
    repairActionPrompts.push('Tentukan metode dan sumber verifikasi data (Means of Verification).');
  }

  let status: QualityDimensionResult['status'];
  let scoreConfidence: number;

  if (!hasTargetMetric && !hasMoV && !hasBaselineInStory) {
    status = 'INCOMPLETE';
    scoreConfidence = 0.30;
  } else if (!hasBaselineInStory || !hasMoV || !hasUnit) {
    status = 'PARTIAL';
    scoreConfidence = 0.70;
  } else {
    status = 'COMPLETE';
    scoreConfidence = 0.90;
  }

  return {
    status,
    scoreConfidence,
    activeMissingRules,
    activeFindingCodes,
    repairActionPrompts
  };
}

export function evaluateSustainability(
  view: CanonicalLfaView,
  page1Story?: string | null
): QualityDimensionResult {
  const activeMissingRules: string[] = [];
  const activeFindingCodes: AdapterFindingCode[] = [];
  const repairActionPrompts: string[] = [];

  const storyText = (page1Story || view.rawProject.beneficiary_description || '').toLowerCase();

  const institutionalKeywords = ['puskesmas', 'dinas', 'kelurahan', 'pemerintah', 'pemda', 'opd', 'sekolah', 'koperasi', 'kap', 'bmkg', 'tokopedia', 'eksportir', 'wusan', 'kkg', 'bpbd', 'bumdes', 'pln', 'dlh', 'industri', 'bank', 'posyandu'];
  const hasInstitutionalPartner = institutionalKeywords.some((k) => storyText.includes(k));

  const agreementKeywords = ['sop', 'pks', 'mou', 'kesepakatan', 'verifikasi', 'integrasi', 'kontrak', 'deklarasi', 'mitra'];
  const hasAgreement = agreementKeywords.some((k) => storyText.includes(k));

  if (hasInstitutionalPartner && !hasAgreement) {
    activeMissingRules.push('MISS-016');
    repairActionPrompts.push('Konfirmasi kesepakatan atau komitmen tertulis (SOP/MoU/PKS) dari mitra setempat.');
  }

  if (!hasInstitutionalPartner) {
    repairActionPrompts.push('Jelaskan rencana keberlanjutan dan pelibatan institusi lokal pasca program.');
  }

  let status: QualityDimensionResult['status'];
  let scoreConfidence: number;

  if (!hasInstitutionalPartner && !hasAgreement) {
    status = 'INCOMPLETE';
    scoreConfidence = 0.40;
  } else if (!hasAgreement) {
    status = 'PARTIAL';
    scoreConfidence = 0.70;
  } else {
    status = 'COMPLETE';
    scoreConfidence = 0.90;
  }

  return {
    status,
    scoreConfidence,
    activeMissingRules,
    activeFindingCodes,
    repairActionPrompts
  };
}

export function evaluateLfaQuality(
  view: CanonicalLfaView,
  page1Story?: string | null
): LfaQualityAssessment {
  const causalLogic = evaluateCausalLogic(view);
  const outcomeQuality = evaluateOutcomeQuality(view, page1Story);
  const actorClarity = evaluateActorClarity(view, page1Story);
  const mealReadiness = evaluateMealReadiness(view, page1Story);
  const sustainability = evaluateSustainability(view, page1Story);

  const vectors = {
    causalLogic,
    outcomeQuality,
    actorClarity,
    mealReadiness,
    sustainability
  };

  const coreVectors = [causalLogic, outcomeQuality, actorClarity];
  const allVectors = [causalLogic, outcomeQuality, actorClarity, mealReadiness, sustainability];

  const hasCoreIncomplete = coreVectors.some((v) => v.status === 'INCOMPLETE');
  const incompleteCount = allVectors.filter((v) => v.status === 'INCOMPLETE').length;
  const partialCount = allVectors.filter((v) => v.status === 'PARTIAL').length;

  let readinessTier: QualityReadinessTier;

  if (hasCoreIncomplete) {
    readinessTier = 'TIER_3_NEEDS_REPAIR';
  } else if (incompleteCount === 0 && partialCount <= 1) {
    readinessTier = 'TIER_1_PRODUCTION_READY';
  } else {
    readinessTier = 'TIER_2_BLUEPRINT_VIABLE';
  }

  const blockingIssueCount = incompleteCount;

  let recommendedNextStep: string;
  if (readinessTier === 'TIER_1_PRODUCTION_READY') {
    recommendedNextStep = 'Desain program telah memenuhi standar kualitas LFA. Siap untuk generasi proposal final.';
  } else if (readinessTier === 'TIER_2_BLUEPRINT_VIABLE') {
    recommendedNextStep = 'Desain program layak untuk draf blueprint. Sediakan data baseline atau konfirmasi MoV untuk mencapai Tier 1.';
  } else {
    recommendedNextStep = 'Desain program membutuhkan perbaikan pada logika kausal, outcome, atau aktor sasaran sebelum dapat mencapai blueprint penuh.';
  }

  return {
    readinessTier,
    vectors,
    blockingIssueCount,
    recommendedNextStep
  };
}
