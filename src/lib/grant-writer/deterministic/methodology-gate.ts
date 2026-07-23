import type { Page1Input, CanonicalCandidate } from './types';
import type { RecommendationResult } from './scoring-types';

/**
 * Operational implementation archetypes that represent active delivery,
 * capability building, or physical intervention rather than pure awareness.
 */
const OPERATIONAL_IMPLEMENTATION_ARCHETYPES = new Set([
  'ARCH-TRAINING-001',
  'ARCH-TOT-002',
  'ARCH-MENTOR-003',
  'ARCH-FACIL-004',
  'ARCH-DIGDEV-007',
  'ARCH-EQUIP-010',
  'ARCH-MARKET-015',
  'ARCH-CAPACITY-018',
  'ARCH-POLICY-019',
  'ARCH-PREPAREDNESS-036'
]);

/**
 * Downstream grounded outcomes (behavior change, economic advancement, adoption,
 * systemic improvements) beyond surface-level awareness (OF-001) or initial skill training (OF-002).
 */
const GROUNDED_DOWNSTREAM_OUTCOMES = new Set([
  'OF-003', 'OF-004', 'OF-005', 'OF-006', 'OF-007', 'OF-008', 'OF-009', 'OF-010',
  'OF-011', 'OF-012', 'OF-013', 'OF-014', 'OF-015', 'OF-016', 'OF-017', 'OF-018',
  'OF-019', 'OF-020', 'OF-021', 'OF-022', 'OF-023', 'OF-024', 'OF-025'
]);

/**
 * Evaluates the Methodology Quality Gate as a post-assignment wrapper.
 *
 * PIPELINE POSITION:
 * Extraction -> Scoring -> Ranking -> Assignment -> METHODOLOGY QUALITY GATE -> Final Assignment Status
 *
 * GUARANTEES:
 * - Does NOT alter scoring math, saturated scores, or penalties.
 * - Does NOT alter sector thresholds or confidence calculations.
 * - Does NOT alter sector ranking order.
 * - ONLY governs whether an already-assigned/ambiguous sector status is sufficiently supported.
 */
export function evaluateMethodologyQualityGate(
  result: RecommendationResult,
  eligibleCandidates: CanonicalCandidate[],
  input: Page1Input
): RecommendationResult {
  // Clone recommendation result to avoid side effects
  const nextResult: RecommendationResult = {
    ...result,
    warnings: [...result.warnings],
    missingInformation: [...result.missingInformation],
    secondarySectors: [...result.secondarySectors],
    primaryInterventions: [...result.primaryInterventions],
    supportingInterventions: [...result.supportingInterventions],
    primarySDGs: [...result.primarySDGs],
    secondarySDGs: [...result.secondarySDGs]
  };

  const outcomeCandidates = eligibleCandidates.filter(c => c.candidateType === 'outcome');
  const hasGroundedDownstreamOutcome = outcomeCandidates.some(c => GROUNDED_DOWNSTREAM_OUTCOMES.has(c.canonicalId));

  const storyText = [
    input.program_story, input.programStory,
    input.background,
    input.proposed_solution, input.proposedSolution,
    input.expected_outcomes, input.expectedOutcomes,
    input.program_title, input.programTitle
  ].filter(Boolean).join(' ').toLowerCase();

  const mqgReasons: string[] = [];

  // -------------------------------------------------------------------------
  // Task 5: MQG-04 Multi-Sector Stuffing Gate
  // -------------------------------------------------------------------------
  const isMultiSectorStuffed =
    nextResult.missingInformation.includes('MISS-019') ||
    nextResult.missingInformation.includes('MISS-020') ||
    nextResult.missingInformation.includes('MISS-021');

  if (isMultiSectorStuffed) {
    if (nextResult.assignmentStatus === 'ASSIGNED' || nextResult.assignmentStatus === 'AMBIGUOUS') {
      nextResult.assignmentStatus = 'INSUFFICIENT_EVIDENCE';
      nextResult.primarySector = null;
      mqgReasons.push('MQG_REJECT_MULTI_SECTOR_STUFFING');
    }
  }

  // -------------------------------------------------------------------------
  // Task 2: MQG-01 Activity-Only Training Gate
  // -------------------------------------------------------------------------
  const hasTrainingArchetype = eligibleCandidates.some(
    c => c.candidateType === 'archetype' && c.canonicalId === 'ARCH-TRAINING-001'
  );

  const hasOtherOperationalArchetype = eligibleCandidates.some(
    c => c.candidateType === 'archetype' && c.canonicalId !== 'ARCH-TRAINING-001' && OPERATIONAL_IMPLEMENTATION_ARCHETYPES.has(c.canonicalId)
  );

  const isActivityOnlyTraining = hasTrainingArchetype && !hasOtherOperationalArchetype && !hasGroundedDownstreamOutcome;

  if (isActivityOnlyTraining) {
    if (nextResult.assignmentStatus === 'ASSIGNED') {
      nextResult.assignmentStatus = 'INSUFFICIENT_EVIDENCE';
      mqgReasons.push('MQG_REJECT_ACTIVITY_ONLY_TRAINING');
    }
  }

  // -------------------------------------------------------------------------
  // Task 3: MQG-02 Awareness-Only Campaign Gate
  // -------------------------------------------------------------------------
  const hasAwarenessArchetype = eligibleCandidates.some(
    c => c.candidateType === 'archetype' && (c.canonicalId === 'ARCH-AWARE-006' || c.canonicalId === 'ARCH-BCC-005')
  );

  const hasOperationalArchetype = eligibleCandidates.some(
    c => c.candidateType === 'archetype' && OPERATIONAL_IMPLEMENTATION_ARCHETYPES.has(c.canonicalId)
  );

  const isAwarenessOnly = hasAwarenessArchetype && !hasOperationalArchetype && !hasGroundedDownstreamOutcome;

  if (isAwarenessOnly) {
    if (nextResult.assignmentStatus === 'ASSIGNED') {
      nextResult.assignmentStatus = 'INSUFFICIENT_EVIDENCE';
      mqgReasons.push('MQG_REJECT_AWARENESS_ONLY');
    }
  }

  // -------------------------------------------------------------------------
  // Task 4: MQG-03 Ungrounded Cash Transfer Gate
  // -------------------------------------------------------------------------
  const hasCashDisbursementArchetype = eligibleCandidates.some(
    c => c.candidateType === 'archetype' && (c.canonicalId === 'ARCH-EQUIP-010' || c.canonicalId === 'ARCH-CAPITAL-012')
  );

  const hasCashNarrative =
    storyText.includes('zakat produktif') ||
    storyText.includes('modal usaha') ||
    storyText.includes('modal tunai') ||
    storyText.includes('pencairan dana') ||
    storyText.includes('bantuan modal');

  const hasMacroImpactClaim =
    /kemiskinan.*(?:tuntas|hilang|bebas|entast|habis)/i.test(storyText) ||
    storyText.includes('mengentaskan kemiskinan') ||
    storyText.includes('bebas kemiskinan') ||
    storyText.includes('poverty eliminated') ||
    storyText.includes('end poverty');

  const isUngroundedCashTransfer =
    (hasCashDisbursementArchetype || hasCashNarrative) &&
    hasMacroImpactClaim &&
    !hasGroundedDownstreamOutcome;

  if (isUngroundedCashTransfer) {
    if (nextResult.assignmentStatus === 'ASSIGNED') {
      nextResult.assignmentStatus = 'INSUFFICIENT_EVIDENCE';
      mqgReasons.push('MQG_REJECT_UNGROUNDED_CASH_TRANSFER');
    }
  }

  // -------------------------------------------------------------------------
  // Task 6: Explainability & Reason Assembly
  // -------------------------------------------------------------------------
  if (mqgReasons.length > 0) {
    const formattedReasons = mqgReasons.join('; ');
    if (nextResult.assignmentReason) {
      nextResult.assignmentReason = `${formattedReasons} (${nextResult.assignmentReason})`;
    } else {
      nextResult.assignmentReason = formattedReasons;
    }
  }

  return nextResult;
}
