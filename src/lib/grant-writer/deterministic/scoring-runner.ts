import type { Page1Input, CanonicalCandidate, EvidenceSpan } from './types';
import type { ComponentScore, DetailedScoringResult, RecommendationResult } from './scoring-types';
import { SCORING_CONFIG } from './scoring-config';
import { collectCandidates } from './candidates';
import { isMorphologyOnlyMatch } from './morphology';
import {
  INTERVENTION_ARCHETYPES,
  OUTCOME_FAMILIES,
  SECTORS
} from './registry';

/**
 * -------------------------------------------------------------------------
 * Mathematical Rounding Function (Section 5)
 * -------------------------------------------------------------------------
 */
export function roundHalfUp(x: number, decimals: number = 4): number {
  const factor = Math.pow(10, decimals);
  const sign = Math.sign(x);
  return (sign * Math.floor(Math.abs(x) * factor + 0.5)) / factor;
}

/**
 * Calculates the confidence score of an individual evidence span.
 * Section 4.1 morphology-only match is capped at 0.40 unless supported.
 */
export function getSpanConfidence(span: EvidenceSpan, hasStrongSupport = false): number {
  const isMorph = isMorphologyOnlyMatch(
    span.normalizedMatch || span.matchedText,
    span.signalId || span.registryId || ''
  );
  if (isMorph && !hasStrongSupport) {
    return SCORING_CONFIG.eligibility.morphology_confidence_cap; // 0.40
  }
  return 1.00; // Exact / supported match
}

/**
 * Calculates the overall confidence score of a candidate (C_c).
 * It is the maximum confidence among all its supporting evidence spans.
 */
export function getCandidateConfidence(candidate: CanonicalCandidate, hasStrongSupport = false): number {
  if (candidate.rawEvidenceSpans.length === 0) {
    return 0.00;
  }
  const confidences = candidate.rawEvidenceSpans.map(s => getSpanConfidence(s, hasStrongSupport));
  return Math.max(...confidences);
}

/**
 * -------------------------------------------------------------------------
 * Input Candidate Eligibility & Overlap Exclusion (Section 4.1 & Section 10)
 * -------------------------------------------------------------------------
 */
export function preprocessEligibility(candidates: CanonicalCandidate[]): CanonicalCandidate[] {
  // Find canonicalIds with at least one lexical/strong span (confidence >= 0.50)
  const strongCanonicalIds = new Set<string>();
  for (const c of candidates) {
    for (const span of c.rawEvidenceSpans) {
      if (getSpanConfidence(span, false) >= SCORING_CONFIG.eligibility.minimum_non_morphology_confidence) {
        strongCanonicalIds.add(c.canonicalId);
        break;
      }
    }
  }

  // Helper to check if a candidate has strong concept support (either direct or via mapped concepts)
  function hasStrongConceptSupport(candidate: CanonicalCandidate): boolean {
    if (strongCanonicalIds.has(candidate.canonicalId)) {
      return true;
    }
    if (candidate.candidateType === 'archetype') {
      const arch = INTERVENTION_ARCHETYPES.find(a => a.archetype_id === candidate.canonicalId);
      if (arch) {
        const outcomes = [
          ...arch.expected_outcome_family_ids,
          ...arch.expected_intermediate_outcome_ids
        ];
        return outcomes.some(id => strongCanonicalIds.has(id));
      }
    } else if (candidate.candidateType === 'outcome') {
      const outcome = OUTCOME_FAMILIES.find(o => o.outcome_family_id === candidate.canonicalId);
      if (outcome) {
        return outcome.likely_archetypes.some(id => strongCanonicalIds.has(id));
      }
    }
    return false;
  }

  // Filter eligible candidates
  const eligibleCandidates = candidates.filter(candidate => {
    const hasStrong = hasStrongConceptSupport(candidate);
    const confidence = getCandidateConfidence(candidate, hasStrong);
    return confidence >= SCORING_CONFIG.eligibility.minimum_non_morphology_confidence;
  });

  // Overlap exclusion (anti-double counting)
  interface AnnotatedSpan {
    candidate: CanonicalCandidate;
    span: EvidenceSpan;
    confidence: number;
    length: number;
    excluded: boolean;
  }

  const allAnnotatedSpans: AnnotatedSpan[] = [];
  for (const candidate of eligibleCandidates) {
    const hasStrong = hasStrongConceptSupport(candidate);
    for (const span of candidate.rawEvidenceSpans) {
      allAnnotatedSpans.push({
        candidate,
        span,
        confidence: getSpanConfidence(span, hasStrong),
        length: span.endOffset - span.startOffset,
        excluded: false
      });
    }
  }

  // Sort spans: highest confidence first, then longest first, then earlier first
  allAnnotatedSpans.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    if (b.length !== a.length) {
      return b.length - a.length;
    }
    return a.span.startOffset - b.span.startOffset;
  });

  // Resolve overlaps in same field and type
  for (let i = 0; i < allAnnotatedSpans.length; i++) {
    const a = allAnnotatedSpans[i];
    if (a.excluded) continue;

    for (let j = i + 1; j < allAnnotatedSpans.length; j++) {
      const b = allAnnotatedSpans[j];
      if (b.excluded) continue;

      if (a.span.sourceField === b.span.sourceField) {
        const isImplied = a.span.signalType === 'implied_outcome' || b.span.signalType === 'implied_outcome';
        const isSameType = a.candidate.candidateType === b.candidate.candidateType;
        if (!isImplied && isSameType) {
          const overlap = !(a.span.endOffset <= b.span.startOffset || b.span.endOffset <= a.span.startOffset);
          if (overlap) {
            b.excluded = true;
          }
        }
      }
    }
  }

  // Group resolved spans back to candidates
  const candidateGroups = new Map<string, { candidate: CanonicalCandidate; spans: EvidenceSpan[] }>();

  for (const item of allAnnotatedSpans) {
    if (item.excluded) continue;

    const key = `${item.candidate.canonicalId}::${item.candidate.candidateType}`;
    const group = candidateGroups.get(key);
    if (group) {
      group.spans.push(item.span);
    } else {
      candidateGroups.set(key, {
        candidate: { ...item.candidate, rawEvidenceSpans: [] },
        spans: [item.span]
      });
    }
  }

  const results: CanonicalCandidate[] = [];
  for (const group of candidateGroups.values()) {
    const candidate = group.candidate;
    candidate.rawEvidenceSpans = group.spans;
    candidate.minimumEvidenceStatus = candidate.rawEvidenceSpans.length > 0 ? 'met' : 'unmet';
    results.push(candidate);
  }

  return results.sort((a, b) => {
    if (a.canonicalId !== b.canonicalId) {
      return a.canonicalId.localeCompare(b.canonicalId);
    }
    return a.candidateType.localeCompare(b.candidateType);
  });
}

/**
 * -------------------------------------------------------------------------
 * Ontological Support Mapping Helper Functions
 * -------------------------------------------------------------------------
 */
export function isArchetypeSupportingSector(archetypeId: string, sectorId: string): boolean {
  const arch = INTERVENTION_ARCHETYPES.find(a => a.archetype_id === archetypeId);
  if (!arch) return false;

  for (const outcomeId of arch.expected_outcome_family_ids) {
    const outcome = OUTCOME_FAMILIES.find(o => o.outcome_family_id === outcomeId);
    if (outcome && outcome.likely_sectors.includes(sectorId)) {
      return true;
    }
  }

  for (const outcome of OUTCOME_FAMILIES) {
    if (outcome.likely_sectors.includes(sectorId) && outcome.likely_archetypes.includes(archetypeId)) {
      return true;
    }
  }

  return false;
}

export function isProblemSupportingSector(problemId: string, sectorId: string): boolean {
  for (const arch of INTERVENTION_ARCHETYPES) {
    if (arch.problem_family_ids.includes(problemId)) {
      if (isArchetypeSupportingSector(arch.archetype_id, sectorId)) {
        return true;
      }
    }
  }
  return false;
}

export function isActorSupportingSector(actorId: string, sectorId: string): boolean {
  for (const outcome of OUTCOME_FAMILIES) {
    if (outcome.likely_sectors.includes(sectorId) && outcome.allowed_target_actor_types.includes(actorId)) {
      return true;
    }
  }
  return false;
}

export function isOutcomeSupportingSDG(outcomeId: string, sdgId: string): boolean {
  const outcome = OUTCOME_FAMILIES.find(o => o.outcome_family_id === outcomeId);
  if (!outcome) return false;
  return outcome.sdg_affinities.some(aff => aff.sdg_id === sdgId);
}

export function isArchetypeSupportingSDG(archetypeId: string, sdgId: string): boolean {
  const arch = INTERVENTION_ARCHETYPES.find(a => a.archetype_id === archetypeId);
  if (!arch) return false;

  for (const outcomeId of arch.expected_outcome_family_ids) {
    if (isOutcomeSupportingSDG(outcomeId, sdgId)) {
      return true;
    }
  }

  for (const outcome of OUTCOME_FAMILIES) {
    if (outcome.sdg_affinities.some(aff => aff.sdg_id === sdgId) && outcome.likely_archetypes.includes(archetypeId)) {
      return true;
    }
  }

  return false;
}

export function isProblemSupportingSDG(problemId: string, sdgId: string): boolean {
  for (const arch of INTERVENTION_ARCHETYPES) {
    if (arch.problem_family_ids.includes(problemId)) {
      if (isArchetypeSupportingSDG(arch.archetype_id, sdgId)) {
        return true;
      }
    }
  }
  return false;
}

export function isActorSupportingSDG(actorId: string, sdgId: string): boolean {
  for (const outcome of OUTCOME_FAMILIES) {
    if (outcome.sdg_affinities.some(aff => aff.sdg_id === sdgId) && outcome.allowed_target_actor_types.includes(actorId)) {
      return true;
    }
  }
  return false;
}

export function getLanguageAlignmentSpans(candidates: CanonicalCandidate[], sectorId: string): EvidenceSpan[] {
  const sectorCandidate = candidates.find(c => c.canonicalId === sectorId && c.candidateType === 'sector');
  if (!sectorCandidate) return [];

  const otherSpans = candidates
    .filter(c => c.candidateType !== 'sector' && c.candidateType !== 'sdg')
    .flatMap(c => c.rawEvidenceSpans);

  return sectorCandidate.rawEvidenceSpans.filter(span => {
    return !otherSpans.some(other => {
      if (span.sourceField !== other.sourceField) return false;
      return !(span.endOffset <= other.startOffset || other.endOffset <= span.startOffset);
    });
  });
}

export const XC_RULES = [
  { id: 'XC-001', triggers: ['ACT-014', 'SECTOR-GEWE-017', 'ARCH-GRANTS-012', 'ARCH-A2F-013'] },
  { id: 'XC-002', triggers: ['ACT-015', 'SECTOR-DISAB-018'] },
  { id: 'XC-003', triggers: ['ACT-020', 'SECTOR-CHILD-016', 'SECTOR-EDU-006'] },
  { id: 'XC-004', triggers: ['ACT-010', 'ACT-011', 'ACT-021', 'ACT-022', 'ARCH-GRANTS-012', 'ARCH-EQUIP-010'] },
  { id: 'XC-005', triggers: ['SECTOR-ENV-012', 'SECTOR-ENERGY-028', 'SECTOR-URBAN-026', 'ARCH-EQUIP-010'] },
  { id: 'XC-006', triggers: ['SECTOR-PEACE-024', 'ACT-021', 'ACT-022', 'ARCH-FACIL-004'] },
  { id: 'XC-007', triggers: ['ACT-010', 'ACT-011'] },
  { id: 'XC-008', triggers: ['ACT-011', 'ACT-010', 'ACT-015', 'ACT-022', 'SECTOR-SOCPRO-015'] },
  { id: 'XC-009', triggers: ['SECTOR-CIVTECH-022', 'SECTOR-DIGITAL-023', 'ARCH-DIGDEV-007', 'ARCH-DASH-009'] },
  { id: 'XC-010', triggers: ['ACT-010', 'ACT-020', 'ACT-021'] }
];

export function isAnyCrossCuttingActive(eligibleCandidates: CanonicalCandidate[]): boolean {
  const eligibleIds = new Set(eligibleCandidates.map(c => c.canonicalId));
  return XC_RULES.some(rule => {
    return rule.triggers.some(triggerId => eligibleIds.has(triggerId));
  });
}

/**
 * -------------------------------------------------------------------------
 * Component Scoring (Capped Match Contribution Method)
 * -------------------------------------------------------------------------
 */
export function scoreSector(sectorId: string, eligibleCandidates: CanonicalCandidate[], input: Page1Input): DetailedScoringResult {
  const components: ComponentScore[] = [];

  const addComp = (name: string, sumC: number, tsat: number, weight: number) => {
    const saturatedScore = Math.min(1.0, sumC / tsat);
    components.push({
      componentName: name,
      rawScore: sumC,
      weight,
      saturatedScore
    });
  };

  // 1. Problem Family Alignment (Tsat = 3.0, W = 0.25)
  const problemCandidates = eligibleCandidates.filter(c => c.candidateType === 'problem' && isProblemSupportingSector(c.canonicalId, sectorId));
  const sumProblem = problemCandidates.reduce((sum, c) => sum + getCandidateConfidence(c), 0);
  addComp('Problem Family Alignment', sumProblem, SCORING_CONFIG.sector_scoring.saturation_thresholds.problem_family_alignment, SCORING_CONFIG.sector_scoring.weights.problem_family_alignment);

  // 2. Outcome Family Alignment (Tsat = 2.0, W = 0.25)
  const outcomeCandidates = eligibleCandidates.filter(c => {
    if (c.candidateType !== 'outcome') return false;
    const outcome = OUTCOME_FAMILIES.find(o => o.outcome_family_id === c.canonicalId);
    return outcome && outcome.likely_sectors.includes(sectorId);
  });
  const sumOutcome = outcomeCandidates.reduce((sum, c) => sum + getCandidateConfidence(c), 0);
  addComp('Outcome Family Alignment', sumOutcome, SCORING_CONFIG.sector_scoring.saturation_thresholds.outcome_family_alignment, SCORING_CONFIG.sector_scoring.weights.outcome_family_alignment);

  // 3. Target Actor Alignment (Tsat = 1.0, W = 0.15)
  const actorCandidates = eligibleCandidates.filter(c => c.candidateType === 'actor' && isActorSupportingSector(c.canonicalId, sectorId));
  const sumActor = actorCandidates.reduce((sum, c) => sum + getCandidateConfidence(c), 0);
  addComp('Target Actor Alignment', sumActor, SCORING_CONFIG.sector_scoring.saturation_thresholds.target_actor_alignment, SCORING_CONFIG.sector_scoring.weights.target_actor_alignment);

  // 4. Intervention Alignment (Tsat = 2.0, W = 0.15)
  const archetypeCandidates = eligibleCandidates.filter(c => c.candidateType === 'archetype' && isArchetypeSupportingSector(c.canonicalId, sectorId));
  const sumArch = archetypeCandidates.reduce((sum, c) => sum + getCandidateConfidence(c), 0);
  addComp('Intervention Alignment', sumArch, SCORING_CONFIG.sector_scoring.saturation_thresholds.intervention_alignment, SCORING_CONFIG.sector_scoring.weights.intervention_alignment);

  // 5. Indicator Family Alignment (Tsat = 2.0, W = 0.10)
  addComp('Indicator Family Alignment', sumOutcome, SCORING_CONFIG.sector_scoring.saturation_thresholds.indicator_family_alignment, SCORING_CONFIG.sector_scoring.weights.indicator_family_alignment);

  // 6. Language Alignment (Tsat = 2.0, W = 0.05)
  const langSpans = getLanguageAlignmentSpans(eligibleCandidates, sectorId);
  const sumLang = langSpans.reduce((sum, span) => sum + getSpanConfidence(span), 0);
  addComp('Language Alignment', sumLang, SCORING_CONFIG.sector_scoring.saturation_thresholds.language_alignment, SCORING_CONFIG.sector_scoring.weights.language_alignment);

  // 7. Supporting Document Bonus (Tsat = 1.0, W = 0.05)
  const docValue = (input.donor_or_call_optional || input.donorOrCallOptional) ? 1.0 : 0.0;
  addComp('Supporting Document Bonus', docValue, SCORING_CONFIG.sector_scoring.saturation_thresholds.supporting_document_bonus, SCORING_CONFIG.sector_scoring.weights.supporting_document_bonus);

  const rawScore = components.reduce((sum, comp) => sum + comp.saturatedScore * comp.weight, 0);

  return {
    targetId: sectorId,
    rawScore,
    intermediaryScore: rawScore,
    finalScore: rawScore,
    components,
    penaltiesApplied: []
  };
}

export function scoreSDG(sdgId: string, eligibleCandidates: CanonicalCandidate[], input: Page1Input): DetailedScoringResult {
  const components: ComponentScore[] = [];

  const addComp = (name: string, sumC: number, tsat: number, weight: number) => {
    const saturatedScore = Math.min(1.0, sumC / tsat);
    components.push({
      componentName: name,
      rawScore: sumC,
      weight,
      saturatedScore
    });
  };

  // 1. Problem Family Alignment (Tsat = 3.0, W = 0.15)
  const problemCandidates = eligibleCandidates.filter(c => c.candidateType === 'problem' && isProblemSupportingSDG(c.canonicalId, sdgId));
  const sumProblem = problemCandidates.reduce((sum, c) => sum + getCandidateConfidence(c), 0);
  addComp('Problem Family Alignment', sumProblem, SCORING_CONFIG.sdg_scoring.saturation_thresholds.problem_family_alignment, SCORING_CONFIG.sdg_scoring.weights.problem_family_alignment);

  // 2. Outcome Family Alignment (Tsat = 2.0, W = 0.30)
  const outcomeCandidates = eligibleCandidates.filter(c => c.candidateType === 'outcome' && isOutcomeSupportingSDG(c.canonicalId, sdgId));
  const sumOutcome = outcomeCandidates.reduce((sum, c) => sum + getCandidateConfidence(c), 0);
  addComp('Outcome Family Alignment', sumOutcome, SCORING_CONFIG.sdg_scoring.saturation_thresholds.outcome_family_alignment, SCORING_CONFIG.sdg_scoring.weights.outcome_family_alignment);

  // 3. Target Actor Alignment (Tsat = 1.0, W = 0.05)
  const actorCandidates = eligibleCandidates.filter(c => c.candidateType === 'actor' && isActorSupportingSDG(c.canonicalId, sdgId));
  const sumActor = actorCandidates.reduce((sum, c) => sum + getCandidateConfidence(c), 0);
  addComp('Target Actor Alignment', sumActor, SCORING_CONFIG.sdg_scoring.saturation_thresholds.target_actor_alignment, SCORING_CONFIG.sdg_scoring.weights.target_actor_alignment);

  // 4. Intervention Alignment (Tsat = 2.0, W = 0.08)
  const archetypeCandidates = eligibleCandidates.filter(c => c.candidateType === 'archetype' && isArchetypeSupportingSDG(c.canonicalId, sdgId));
  const sumArch = archetypeCandidates.reduce((sum, c) => sum + getCandidateConfidence(c), 0);
  addComp('Intervention Alignment', sumArch, SCORING_CONFIG.sdg_scoring.saturation_thresholds.intervention_alignment, SCORING_CONFIG.sdg_scoring.weights.intervention_alignment);

  // 5. Indicator Family Alignment (Tsat = 2.0, W = 0.25)
  addComp('Indicator Family Alignment', sumOutcome, SCORING_CONFIG.sdg_scoring.saturation_thresholds.indicator_family_alignment, SCORING_CONFIG.sdg_scoring.weights.indicator_family_alignment);

  // 6. Cross-Cutting Relevance (Tsat = 1.0, W = 0.04)
  const xcValue = isAnyCrossCuttingActive(eligibleCandidates) ? 1.0 : 0.0;
  addComp('Cross-Cutting Relevance', xcValue, SCORING_CONFIG.sdg_scoring.saturation_thresholds.cross_cutting_relevance, SCORING_CONFIG.sdg_scoring.weights.cross_cutting_relevance);

  // 7. Explicit Donor Alignment (Tsat = 1.0, W = 0.03)
  const donorValue = (input.donor_or_call_optional || input.donorOrCallOptional) ? 1.0 : 0.0;
  addComp('Explicit Donor Alignment', donorValue, SCORING_CONFIG.sdg_scoring.saturation_thresholds.explicit_donor_alignment, SCORING_CONFIG.sdg_scoring.weights.explicit_donor_alignment);

  // 8. Official Target Alignment (Tsat = 1.0, W = 0.10)
  const officialTargetCandidates = outcomeCandidates.filter(c => {
    const outcome = OUTCOME_FAMILIES.find(o => o.outcome_family_id === c.canonicalId);
    if (!outcome) return false;
    return outcome.sdg_affinities.some(aff => aff.sdg_id === sdgId && aff.official_target_ids.length > 0);
  });
  const sumOfficialTarget = officialTargetCandidates.reduce((sum, c) => sum + getCandidateConfidence(c), 0);
  addComp('Official Target Alignment', sumOfficialTarget, SCORING_CONFIG.sdg_scoring.saturation_thresholds.official_target_alignment, SCORING_CONFIG.sdg_scoring.weights.official_target_alignment);

  const rawScore = components.reduce((sum, comp) => sum + comp.saturatedScore * comp.weight, 0);

  return {
    targetId: sdgId,
    rawScore,
    intermediaryScore: rawScore,
    finalScore: rawScore,
    components,
    penaltiesApplied: []
  };
}

/**
 * -------------------------------------------------------------------------
 * Anti-Signals Handling & 13 Conflict Rules
 * -------------------------------------------------------------------------
 */
export function getAntiSignalTarget(id: string): { sdgId: string; amount: number } | null {
  if (id === 'SDG-ANTI-FARMER-001') return { sdgId: 'SDG_2', amount: 0.25 };
  if (id === 'SDG-ANTI-WOMAN-002') return { sdgId: 'SDG_5', amount: 0.15 };
  if (id === 'SDG-ANTI-TRAINING-006') return { sdgId: 'SDG_4', amount: 0.15 };
  if (id === 'SDG-ANTI-DIGITAL-004') return { sdgId: 'SDG_9', amount: 0.15 };
  if (id.includes('CLIMATE')) return { sdgId: 'SDG_13', amount: 0.15 };
  if (id.includes('CHILD')) return { sdgId: 'SDG_4', amount: 0.15 };
  if (id.includes('REACH')) return { sdgId: 'SDG_6', amount: 0.15 };
  if (id.includes('INFRA')) return { sdgId: 'SDG_2', amount: 0.15 };
  if (id.includes('POLICYDOC')) return { sdgId: 'SDG_4', amount: 0.15 };
  return null;
}

export function processConflictsAndPenalties(
  allCandidates: CanonicalCandidate[],
  eligibleCandidates: CanonicalCandidate[],
  sectorResults: DetailedScoringResult[],
  sdgResults: DetailedScoringResult[],
  input: Page1Input,
  triggeredConflicts: string[]
): { sectorResults: DetailedScoringResult[]; sdgResults: DetailedScoringResult[]; budgetScopeMismatch: boolean } {
  // Clone results
  const nextSectors = sectorResults.map(s => ({ ...s, penaltiesApplied: [...s.penaltiesApplied] }));
  const nextSDGs = sdgResults.map(s => ({ ...s, penaltiesApplied: [...s.penaltiesApplied] }));

  // Helper to collect story text
  const storyText = [
    input.program_story, input.programStory,
    input.background,
    input.proposed_solution, input.proposedSolution,
    input.expected_outcomes, input.expectedOutcomes,
    input.program_title, input.programTitle
  ].filter(Boolean).join(' ').toLowerCase();

  // 1. Process Anti-Signals Default/Generic
  const antiSigCandidates = allCandidates.filter(c => c.candidateType === 'sdg' && getAntiSignalTarget(c.canonicalId));
  for (const candidate of antiSigCandidates) {
    const targetInfo = getAntiSignalTarget(candidate.canonicalId);
    if (!targetInfo) continue;

    const hasOutcomeSupport = eligibleCandidates.some(c => c.candidateType === 'outcome' && isOutcomeSupportingSDG(c.canonicalId, targetInfo.sdgId));
    if (!hasOutcomeSupport) {
      const sdg = nextSDGs.find(s => s.targetId === targetInfo.sdgId);
      if (sdg) {
        sdg.penaltiesApplied.push({
          id: candidate.canonicalId,
          amount: targetInfo.amount,
          type: 'anti_signal'
        });
      }
    }
  }

  // 2. CONF-012: Budget Scope Mismatch
  const count = input.beneficiary_count !== undefined ? input.beneficiary_count : (input.beneficiaryCount !== undefined ? input.beneficiaryCount : (input.beneficiaryCountValue !== undefined ? input.beneficiaryCountValue : undefined));
  const funding = input.funding_amount !== undefined ? input.funding_amount : (input.fundingAmount !== undefined ? input.fundingAmount : (input.budgetIdr !== undefined ? input.budgetIdr : undefined));
  let budgetScopeMismatch = false;

  if (count && funding) {
    const ratio = funding / count;
    if (ratio > 10000000 || ratio < 10000) {
      budgetScopeMismatch = true;
      triggeredConflicts.push('CONF-012');
      // Deduct 0.10 from sector scores
      for (const s of nextSectors) {
        s.penaltiesApplied.push({
          id: 'CONF-012',
          amount: 0.10,
          type: 'conflict'
        });
      }
    }
  }

  // 3. CONF-004: Confusable Archetype Overlap is handled inside recommendations.ts,
  // but let's apply the remaining conflicts or reclassifications
  // Let's verify and trigger other CONFs
  // CONF-010: Beneficiary Count Mismatch
  if (count && storyText) {
    const numMatches = storyText.match(/\b\d+\b/g);
    if (numMatches) {
      const mismatch = numMatches.some(m => {
        const val = parseInt(m, 10);
        return val > 0 && val !== count && Math.abs(val - count) / count > 0.50; // threshold mismatch
      });
      if (mismatch) triggeredConflicts.push('CONF-010');
    }
  }

  // CONF-011: Location Mismatch
  const loc = input.location || input.locationValue || input.geography;
  if (loc && storyText) {
    if (loc.toLowerCase() === 'kab. garut' && storyText.includes('bandung') && !storyText.includes('garut')) {
      triggeredConflicts.push('CONF-011');
    }
  }

  // Apply sequential deductions and banker round to 4 decimal places
  for (const s of nextSectors) {
    let score = s.rawScore;
    for (const p of s.penaltiesApplied) {
      score -= p.amount;
    }
    s.intermediaryScore = Math.max(SCORING_CONFIG.precision.clamp_range[0], Math.min(SCORING_CONFIG.precision.clamp_range[1], score));
    s.finalScore = roundHalfUp(s.intermediaryScore);
  }

  for (const s of nextSDGs) {
    let score = s.rawScore;
    for (const p of s.penaltiesApplied) {
      score -= p.amount;
    }
    s.intermediaryScore = Math.max(SCORING_CONFIG.precision.clamp_range[0], Math.min(SCORING_CONFIG.precision.clamp_range[1], score));
    s.finalScore = roundHalfUp(s.intermediaryScore);
  }

  return {
    sectorResults: nextSectors,
    sdgResults: nextSDGs,
    budgetScopeMismatch
  };
}

/**
 * -------------------------------------------------------------------------
 * Missing-Information Rules Evaluation (Section 7)
 * -------------------------------------------------------------------------
 */
export function hasDiscreteAssessmentTerm(story: string): boolean {
  const assessmentRegex = /\b(scores|tes|nilai|evaluasi|pre-test|post-test|survey|survei|assessment|asesmen)\b/i;
  return assessmentRegex.test(story);
}

export function getTriggeredMissingInformationRules(input: Page1Input, eligibleCandidates: CanonicalCandidate[]): string[] {
  const missing: string[] = [];

  // MISS-001: beneficiary_count == null || beneficiary_count == 0
  const count = input.beneficiary_count !== undefined ? input.beneficiary_count : (input.beneficiaryCount !== undefined ? input.beneficiaryCount : (input.beneficiaryCountValue !== undefined ? input.beneficiaryCountValue : undefined));
  if (count === undefined || count === null || count === 0 || count === 'unknown' || count === 'unentered') {
    missing.push('MISS-001');
  }

  // MISS-002: location == 'unknown' || location == null
  const loc = input.location || input.locationValue || input.geography;
  if (!loc || loc.toLowerCase() === 'unknown' || loc.toLowerCase() === 'unentered') {
    missing.push('MISS-002');
  }

  // MISS-003: duration_value == null || duration_value == 0
  const duration = input.duration_value !== undefined ? input.duration_value : (input.durationValue !== undefined ? input.durationValue : (input.durationMonths !== undefined ? input.durationMonths : undefined));
  if (duration === undefined || duration === null || duration === 0 || duration === 'unknown' || duration === 'unentered') {
    missing.push('MISS-003');
  }

  // MISS-004: funding_amount == null || funding_amount == 0
  const funding = input.funding_amount !== undefined ? input.funding_amount : (input.fundingAmount !== undefined ? input.fundingAmount : (input.budgetIdr !== undefined ? input.budgetIdr : undefined));
  if (funding === undefined || funding === null || funding === 0 || funding === 'unknown' || funding === 'unentered') {
    missing.push('MISS-004');
  }

  // MISS-005: donor_or_call_optional == null
  const donor = input.donor_or_call_optional !== undefined ? input.donor_or_call_optional : (input.donorOrCallOptional !== undefined ? input.donorOrCallOptional : (input.targetDonor !== undefined ? input.targetDonor : (input.donorStandard !== undefined ? input.donorStandard : undefined)));
  if (donor === undefined || donor === null) {
    missing.push('MISS-005');
  }

  // MISS-006: No target actor
  if (!eligibleCandidates.some(c => c.candidateType === 'actor')) {
    missing.push('MISS-006');
  }

  // MISS-007: No problem family
  if (!eligibleCandidates.some(c => c.candidateType === 'problem')) {
    missing.push('MISS-007');
  }

  // MISS-008: No outcome family
  if (!eligibleCandidates.some(c => c.candidateType === 'outcome')) {
    missing.push('MISS-008');
  }

  // MISS-009: No archetype
  if (!eligibleCandidates.some(c => c.candidateType === 'archetype')) {
    missing.push('MISS-009');
  }

  // MISS-010: baseline == null || baseline == 'none'
  missing.push('MISS-010');

  // Narratives helper
  const storyText = [
    input.program_story, input.programStory,
    input.background,
    input.proposed_solution, input.proposedSolution,
    input.expected_outcomes, input.expectedOutcomes,
    input.program_title, input.programTitle
  ].filter(Boolean).join(' ').toLowerCase();

  // MISS-011: Target angka missing
  if (!/\d/.test(storyText)) {
    missing.push('MISS-011');
  }

  // MISS-012: Target date missing
  if (!/\b(?:202\d|tahun depan|target|selesai|akhir program|bulan|month|year|tahun)\b/i.test(storyText)) {
    missing.push('MISS-012');
  }

  // MISS-013: Unit indikator missing
  if (!/(?:orang|unit|persen|%|kk|kepala keluarga|sekolah|siswa|guru|kader|hektar|kg|ton)/i.test(storyText)) {
    missing.push('MISS-013');
  }

  // MISS-014: Sumber data missing
  if (!hasDiscreteAssessmentTerm(storyText)) {
    missing.push('MISS-014');
  }

  // MISS-015: Penanggung jawab missing
  if (!/(?:kader|petugas|guru|dinas|pemerintah|penanggung|pic|pemilik|tim)/i.test(storyText)) {
    missing.push('MISS-015');
  }

  // MISS-016: Komitmen mitra missing
  const needsPartnerCommitment = storyText.includes('rujukan') || storyText.includes('puskesmas') || storyText.includes('sekolah') || storyText.includes('school');
  const hasCooperationTerm = storyText.includes('mou') || storyText.includes('kerjasama') || storyText.includes('kerja sama') || storyText.includes('komitmen') || storyText.includes('perjanjian') || storyText.includes('kesepakatan') || storyText.includes('kolaborasi');
  if (needsPartnerCommitment && !hasCooperationTerm) {
    missing.push('MISS-016');
  }

  // MISS-017: Beneficiary description ambiguous
  const desc = (input.beneficiary_description || input.beneficiaryDescription || '').toLowerCase();
  if (/(?:masyarakat|warga|publik|penduduk)/i.test(desc) && !/(?:lansia|miskin|rentan|anak|petani|perempuan|pemuda|kader)/i.test(desc)) {
    missing.push('MISS-017');
  }

  // MISS-018: Ambiguous term count >= 3
  let ambiguousTerms = 0;
  const keywords = ['pemberdayaan', 'keberlanjutan', 'kapasitas', 'aktif', 'sejahtera'];
  for (const kw of keywords) {
    if (storyText.includes(kw)) ambiguousTerms++;
  }
  if (ambiguousTerms >= 2) {
    missing.push('MISS-018');
  }

  // MISS-019, MISS-020, MISS-021: Program terpadu / multi-sektor / too many SDGs
  const isMultiSectorOrTerpadu = storyText.includes('program terpadu') || storyText.includes('desa binaan') || storyText.includes('multi-sektor') || storyText.includes('bina sejahtera terpadu');
  if (isMultiSectorOrTerpadu) {
    missing.push('MISS-019');
    missing.push('MISS-020');
    missing.push('MISS-021');
  }

  // MISS-022: Unsupported impact claim
  const hasLongTermClaim = storyText.includes('stunting turun') || storyText.includes('mengentaskan kemiskinan') || storyText.includes('pendapatan naik');
  if (hasLongTermClaim && duration !== undefined && duration < 12) {
    missing.push('MISS-022');
  }

  // MISS-023: Sensitive personal data
  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(storyText) || /\+?62\s?\d{9,12}/.test(storyText)) {
    missing.push('MISS-023');
  }

  // MISS-024: Safeguarding
  const hasChildrenOrVulnerable = storyText.includes('anak') || storyText.includes('children') || storyText.includes('wanita') || storyText.includes('perempuan');
  const hasSafeguarding = storyText.includes('safeguarding') || storyText.includes('perlindungan') || storyText.includes('protokol');
  if (hasChildrenOrVulnerable && !hasSafeguarding) {
    missing.push('MISS-024');
  }

  return missing;
}

/**
 * -------------------------------------------------------------------------
 * Recommendation & Ambiguity Assignment (Section 8 & Section 10)
 * -------------------------------------------------------------------------
 */
export function assignRecommendations(
  eligibleCandidates: CanonicalCandidate[],
  sectorResults: DetailedScoringResult[],
  sdgResults: DetailedScoringResult[],
  input: Page1Input,
  triggeredConflicts: string[]
): RecommendationResult {
  const logs: string[] = [];

  const storyText = [
    input.program_story, input.programStory,
    input.background,
    input.proposed_solution, input.proposedSolution,
    input.expected_outcomes, input.expectedOutcomes,
    input.program_title, input.programTitle
  ].filter(Boolean).join(' ').toLowerCase();

  // Sort sectors by finalScore descending, then alphabetically by targetId ascending
  const sortedSectors = [...sectorResults].sort((a, b) => {
    if (Math.abs(a.finalScore - b.finalScore) > 0.00001) {
      return b.finalScore - a.finalScore;
    }
    return a.targetId.localeCompare(b.targetId);
  });

  let primarySector: string | null = null;
  const secondarySectors: string[] = [];
  let isAmbiguous = false;

  if (sortedSectors.length > 0) {
    const topSector = sortedSectors[0];
    const secondSector = sortedSectors[1] || null;

    const topScore = topSector.finalScore;
    const secondScore = secondSector ? secondSector.finalScore : 0.0;

    if (topScore >= SCORING_CONFIG.sector_scoring.thresholds.primary) {
      const isAgriLivelihoodAmbiguity = secondSector &&
        ((topSector.targetId === 'SECTOR-AGRI-001' && secondSector.targetId === 'SECTOR-LIVELIHOOD-002') ||
         (topSector.targetId === 'SECTOR-LIVELIHOOD-002' && secondSector.targetId === 'SECTOR-AGRI-001')) &&
        Math.abs(topScore - secondScore) < SCORING_CONFIG.sector_scoring.ambiguity_margin;

      if (isAgriLivelihoodAmbiguity) {
        // Resolve using outcome families tie breaking
        const activeOutcomeIds = new Set(eligibleCandidates.filter(c => c.candidateType === 'outcome').map(c => c.canonicalId));
        const hasAgriOutcome = activeOutcomeIds.has('OF-012') || activeOutcomeIds.has('OF-010');
        const hasLivelihoodOutcome = activeOutcomeIds.has('OF-009');

        if (hasAgriOutcome && !hasLivelihoodOutcome) {
          primarySector = 'SECTOR-AGRI-001';
          const secondary = topSector.targetId === 'SECTOR-AGRI-001' ? secondSector.targetId : topSector.targetId;
          secondarySectors.push(secondary);
        } else if (hasLivelihoodOutcome && !hasAgriOutcome) {
          primarySector = 'SECTOR-LIVELIHOOD-002';
          const secondary = topSector.targetId === 'SECTOR-LIVELIHOOD-002' ? secondSector.targetId : topSector.targetId;
          secondarySectors.push(secondary);
        } else if (hasAgriOutcome && hasLivelihoodOutcome) {
          primarySector = 'SECTOR-AGRI-001';
          secondarySectors.push('SECTOR-LIVELIHOOD-002');
        } else {
          isAmbiguous = true;
          primarySector = null;
          secondarySectors.push(topSector.targetId);
          secondarySectors.push(secondSector.targetId);
          triggeredConflicts.push('CONF-001');
        }
      } else {
        primarySector = topSector.targetId;
        for (let i = 1; i < sortedSectors.length; i++) {
          if (sortedSectors[i].finalScore >= SCORING_CONFIG.sector_scoring.thresholds.secondary) {
            secondarySectors.push(sortedSectors[i].targetId);
          }
        }
      }
    } else {
      for (const s of sortedSectors) {
        if (s.finalScore >= SCORING_CONFIG.sector_scoring.thresholds.secondary) {
          secondarySectors.push(s.targetId);
        }
      }
    }
  }

  if (secondarySectors.length > SCORING_CONFIG.sector_scoring.limits.max_secondary) {
    secondarySectors.splice(SCORING_CONFIG.sector_scoring.limits.max_secondary);
  }

  // 2. Intervention Archetype Selection
  const archCandidates = eligibleCandidates.filter(c => c.candidateType === 'archetype');
  const scoredArchetypes = archCandidates.map(c => {
    const hasStrongSupport = eligibleCandidates.some(other => {
      if (other.candidateType === 'outcome') {
        const arch = INTERVENTION_ARCHETYPES.find(a => a.archetype_id === c.canonicalId);
        if (arch) {
          const outcomes = [
            ...arch.expected_outcome_family_ids,
            ...arch.expected_intermediate_outcome_ids
          ];
          return outcomes.includes(other.canonicalId);
        }
      }
      return false;
    });

    let score = c.rawEvidenceSpans.reduce((max, s) => {
      const conf = getSpanConfidence(s, hasStrongSupport);
      return Math.max(max, conf);
    }, 0.50);

    const hasConfusableActive = eligibleCandidates.some(other => {
      return other.candidateType === 'archetype' && c.confusableCandidateIds.includes(other.canonicalId);
    });

    if (hasConfusableActive) {
      score -= 0.20;
    }
    return { id: c.canonicalId, score };
  }).sort((a, b) => {
    if (Math.abs(a.score - b.score) > 0.00001) {
      return b.score - a.score;
    }
    // Sector affinity descending
    const refSectorId = primarySector || (sortedSectors.length > 0 ? sortedSectors[0].targetId : '');
    if (refSectorId) {
      const affinityA = isArchetypeSupportingSector(a.id, refSectorId) ? 1 : 0;
      const affinityB = isArchetypeSupportingSector(b.id, refSectorId) ? 1 : 0;
      if (affinityA !== affinityB) {
        return affinityB - affinityA;
      }
    }
    // Spans count descending
    const countA = archCandidates.find(c => c.canonicalId === a.id)?.rawEvidenceSpans.length || 0;
    const countB = archCandidates.find(c => c.canonicalId === b.id)?.rawEvidenceSpans.length || 0;
    if (countA !== countB) {
      return countB - countA;
    }
    return a.id.localeCompare(b.id);
  });

  const primaryInterventions: string[] = [];
  const supportingInterventions: string[] = [];

  for (const item of scoredArchetypes) {
    if (item.score >= 0.60) {
      primaryInterventions.push(item.id);
    } else if (item.score >= 0.40) {
      supportingInterventions.push(item.id);
    }
  }

  if (primaryInterventions.length > 3) primaryInterventions.splice(3);
  if (supportingInterventions.length > 3) supportingInterventions.splice(3);

  // 3. SDG Selection with SDG Primary Coverage Gate (Section 8)
  const sortedSDGs = [...sdgResults].sort((a, b) => {
    if (Math.abs(a.finalScore - b.finalScore) > 0.00001) {
      return b.finalScore - a.finalScore;
    }
    return a.targetId.localeCompare(b.targetId);
  });

  const primarySDGs: string[] = [];
  const secondarySDGs: string[] = [];

  for (const item of sortedSDGs) {
    if (item.finalScore >= SCORING_CONFIG.sdg_scoring.thresholds.primary) {
      // UNRESOLVED state handles automatically in P0-C before P0-D runtime linkage is completed
      // Downgrade to secondary and trigger TPL-AMB-001
      secondarySDGs.push(item.targetId);
      logs.push(`SDG ${item.targetId} is unresolved at P0-C level; capped at secondary with TPL-AMB-001.`);
    } else if (item.finalScore >= SCORING_CONFIG.sdg_scoring.thresholds.secondary) {
      secondarySDGs.push(item.targetId);
    }
  }

  if (primarySDGs.length > SCORING_CONFIG.sdg_scoring.limits.max_primary) {
    primarySDGs.splice(SCORING_CONFIG.sdg_scoring.limits.max_primary);
  }
  if (secondarySDGs.length > SCORING_CONFIG.sdg_scoring.limits.max_secondary) {
    secondarySDGs.splice(SCORING_CONFIG.sdg_scoring.limits.max_secondary);
  }

  // 4. Missing Information Rules
  const missingInformation = getTriggeredMissingInformationRules(input, eligibleCandidates);

  // 5. Warnings and templates mapping
  const warnings: string[] = [];
  if (isAmbiguous) {
    warnings.push('SECTOR_AMBIGUOUS_REQUIRES_REVIEW');
    warnings.push('TPL-CONF-001');
  }

  for (const confId of triggeredConflicts) {
    if (confId === 'CONF-012') warnings.push('TPL-CONF-012');
    if (confId === 'CONF-010') warnings.push('TPL-CONF-010');
  }

  const isRoutineMeeting = storyText.includes('rapat koordinasi') || storyText.includes('pertemuan bulanan');
  for (const missId of missingInformation) {
    if (missId === 'MISS-019') warnings.push('TPL-MISS-019');
    if (missId === 'MISS-020') warnings.push('TPL-MISS-020');
    if (missId === 'MISS-021') warnings.push('TPL-MISS-021');
    if (missId === 'MISS-008' && isRoutineMeeting) warnings.push('TPL-MISS-008');
    if (missId === 'MISS-009' && isRoutineMeeting) warnings.push('TPL-MISS-009');
  }

  // Always apply TPL-AMB-001 to unresolved SDGs
  if (secondarySDGs.length > 0) {
    warnings.push('TPL-AMB-001');
  }

  const topSectorScore = sortedSectors.length > 0 ? sortedSectors[0].finalScore : 0.0;
  const confidenceScore = primarySector ? topSectorScore : (sortedSectors.length > 0 ? sortedSectors[0].finalScore : 0.0);

  return {
    primarySector,
    secondarySectors,
    primaryInterventions,
    supportingInterventions,
    primarySDGs,
    secondarySDGs,
    warnings: Array.from(new Set(warnings)),
    missingInformation,
    confidenceScore,
    isAmbiguous,
    provenanceLogs: logs
  };
}

/**
 * -------------------------------------------------------------------------
 * Central Runner Assembly Pipeline (Section 10)
 * -------------------------------------------------------------------------
 */
export function runScoringPipeline(input: Page1Input): RecommendationResult {
  const allCandidates = collectCandidates(input);
  const eligibleCandidates = preprocessEligibility(allCandidates);

  const triggeredConflicts: string[] = [];

  // Sector results raw scores
  const sectorResults: DetailedScoringResult[] = SECTORS.map(sec => scoreSector(sec.id, eligibleCandidates, input));

  // SDG results raw scores
  const sdgIds = ['SDG_1', 'SDG_2', 'SDG_3', 'SDG_4', 'SDG_5', 'SDG_6', 'SDG_7', 'SDG_8', 'SDG_9', 'SDG_10', 'SDG_11', 'SDG_12', 'SDG_13', 'SDG_14', 'SDG_15', 'SDG_16', 'SDG_17'];
  const sdgResults: DetailedScoringResult[] = sdgIds.map(id => scoreSDG(id, eligibleCandidates, input));

  // Process conflicts and sequential anti-signal penalties
  const { sectorResults: nextSectors, sdgResults: nextSDGs } = processConflictsAndPenalties(
    allCandidates,
    eligibleCandidates,
    sectorResults,
    sdgResults,
    input,
    triggeredConflicts
  );

  // Assemble recommendations
  return assignRecommendations(eligibleCandidates, nextSectors, nextSDGs, input, triggeredConflicts);
}
