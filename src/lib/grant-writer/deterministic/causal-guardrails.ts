import type { CanonicalCandidate, EvidenceSpan } from './types';
import type {
  BlueprintItem,
  CausalSupportSnapshot,
  GuardrailWarning,
  IndicatorBindingDecision,
  SupportDecision,
  SupportState
} from './blueprint-types';

export interface IndicatorBindingInput {
  indicatorId: string;
  requestedLevel?: 'output' | 'outcome' | 'impact' | 'activity';
  explicitlySupported?: boolean;
  evidenceSpans?: EvidenceSpan[];
  provenance?: string[];
}

export interface CausalDerivationOptions {
  indicatorBindings?: IndicatorBindingInput[];
}

const ACTIVITY_PREFIX = 'ARCH-';
const OUTPUT_PREFIX = 'OPF-';

const BENEFICIARY_FIELDS = new Set(['beneficiary_description', 'beneficiaryDescription']);
const TARGET_ACTOR_FIELDS = new Set(['program_story', 'programStory', 'partners_and_actors', 'partnersAndActors']);

function buildSupportDecision(
  state: SupportState,
  reason: string,
  evidenceSpans?: EvidenceSpan[],
  provenance?: string[]
): SupportDecision {
  return {
    state,
    reason,
    evidenceSpans,
    provenance
  };
}

function uniqueSpans(spans: EvidenceSpan[]): EvidenceSpan[] {
  const key = (s: EvidenceSpan) => `${s.sourceField}:${s.startOffset}:${s.endOffset}:${s.matchedText}`;
  const seen = new Set<string>();
  const out: EvidenceSpan[] = [];
  for (const span of spans) {
    const k = key(span);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(span);
    }
  }
  return out;
}

export function validateCausalOrdering(items: BlueprintItem[]): string[] {
  const issues: string[] = [];

  for (const item of items) {
    const text = item.text ?? '';
    if (item.section === 'outcome' && text.includes(ACTIVITY_PREFIX)) {
      issues.push(`Outcome "${item.id}" contains activity canonical ID and must stay unresolved.`);
    }
    if (item.section === 'impact' && text.includes(OUTPUT_PREFIX)) {
      issues.push(`Impact "${item.id}" contains output canonical ID and must stay unresolved.`);
    }
    if (item.section === 'outcome' && text.includes(OUTPUT_PREFIX)) {
      issues.push(`Outcome "${item.id}" contains output canonical ID and requires review.`);
    }
  }

  return issues;
}

export function deriveCausalSupportSnapshot(
  eligibleCandidates: CanonicalCandidate[],
  options?: CausalDerivationOptions
): CausalSupportSnapshot {
  const actorCandidates = eligibleCandidates.filter(c => c.candidateType === 'actor');
  const actorSpans = uniqueSpans(actorCandidates.flatMap(c => c.rawEvidenceSpans));

  const beneficiarySpans = actorSpans.filter(s => BENEFICIARY_FIELDS.has(s.sourceField));
  const targetActorSpans = actorSpans.filter(s => TARGET_ACTOR_FIELDS.has(s.sourceField));

  const outcomeSpans = uniqueSpans(
    eligibleCandidates
      .filter(c => c.candidateType === 'outcome')
      .flatMap(c => c.rawEvidenceSpans)
  );

  const outputSpans = uniqueSpans(
    eligibleCandidates
      .filter(c => c.candidateType === 'output')
      .flatMap(c => c.rawEvidenceSpans)
  );

  const impactCandidates = eligibleCandidates.filter(c => c.canonicalId.startsWith('IMP-') || c.canonicalId.startsWith('IMPACT-'));
  const impactSpans = uniqueSpans(impactCandidates.flatMap(c => c.rawEvidenceSpans));

  const targetActor = targetActorSpans.length > 0
    ? buildSupportDecision('supported', 'Actor evidence found in target-actor context fields.', targetActorSpans, ['candidate_evidence'])
    : beneficiarySpans.length > 0
      ? buildSupportDecision('unresolved', 'Only beneficiary-context actor evidence is present; target actor cannot be auto-inferred.', beneficiarySpans, ['candidate_evidence'])
      : buildSupportDecision('unresolved', 'No actor-role metadata/evidence found for target actor.', undefined, ['metadata_unavailable']);

  const beneficiary = beneficiarySpans.length > 0
    ? buildSupportDecision('supported', 'Beneficiary evidence is present.', beneficiarySpans, ['candidate_evidence'])
    : buildSupportDecision('unresolved', 'No beneficiary metadata/evidence found.', undefined, ['metadata_unavailable']);

  // P0-D does not receive canonical duty-bearer/institutional-role metadata from P0-C.
  const institutionalActor = buildSupportDecision('unresolved', 'Institutional actor role metadata is unavailable in current P0-D input contract.', undefined, ['metadata_unavailable']);
  const dutyBearer = buildSupportDecision('unresolved', 'Duty bearer role metadata is unavailable in current P0-D input contract.', undefined, ['metadata_unavailable']);

  const objectOfChange = outcomeSpans.some(s => s.matchedText.trim().split(/\s+/).length >= 2)
    ? buildSupportDecision('supported', 'Outcome evidence contains object-of-change phrase.', outcomeSpans, ['candidate_evidence'])
    : outcomeSpans.length > 0
      ? buildSupportDecision('unresolved', 'Outcome evidence exists but object-of-change support is incomplete.', outcomeSpans, ['candidate_evidence'])
      : buildSupportDecision('unresolved', 'No outcome evidence for object-of-change support.', undefined, ['metadata_unavailable']);

  const outputSupport = outputSpans.length > 0
    ? buildSupportDecision('supported', 'Output evidence is available.', outputSpans, ['candidate_evidence'])
    : buildSupportDecision('unresolved', 'Output metadata/evidence unavailable.', undefined, ['metadata_unavailable']);

  const outcomeSupport = outcomeSpans.length > 0
    ? buildSupportDecision('supported', 'Outcome evidence is available.', outcomeSpans, ['candidate_evidence'])
    : buildSupportDecision('unresolved', 'Outcome metadata/evidence unavailable.', undefined, ['metadata_unavailable']);

  const impactSupport = impactSpans.length > 0
    ? buildSupportDecision('supported', 'Impact/long-term condition evidence is available.', impactSpans, ['candidate_evidence'])
    : buildSupportDecision('unresolved', 'Impact/long-term condition metadata/evidence unavailable.', undefined, ['metadata_unavailable']);

  const indicatorBindings: IndicatorBindingDecision[] = (options?.indicatorBindings ?? []).map(binding => {
    if (!binding.requestedLevel) {
      return {
        indicatorId: binding.indicatorId,
        bindingState: 'unresolved',
        reason: 'Indicator result-level binding metadata is missing.',
        evidenceSpans: binding.evidenceSpans,
        provenance: binding.provenance ?? ['metadata_unavailable']
      };
    }

    if (binding.requestedLevel === 'activity' || binding.requestedLevel === 'impact') {
      if (binding.explicitlySupported) {
        return {
          indicatorId: binding.indicatorId,
          requestedLevel: binding.requestedLevel,
          bindingState: 'supported',
          reason: 'Explicit canonical support provided for non-default indicator level binding.',
          evidenceSpans: binding.evidenceSpans,
          provenance: binding.provenance ?? ['explicit_canonical_support']
        };
      }
      return {
        indicatorId: binding.indicatorId,
        requestedLevel: binding.requestedLevel,
        bindingState: 'unsupported',
        reason: 'Indicator cannot bind to activity/impact without explicit canonical support.',
        evidenceSpans: binding.evidenceSpans,
        provenance: binding.provenance ?? ['rule_guardrail']
      };
    }

    if (binding.requestedLevel === 'output') {
      return {
        indicatorId: binding.indicatorId,
        requestedLevel: binding.requestedLevel,
        bindingState: outputSupport.state === 'supported' ? 'supported' : 'unresolved',
        reason: outputSupport.state === 'supported'
          ? 'Indicator-to-output binding supported by output evidence.'
          : 'Output evidence is unavailable; indicator binding unresolved.',
        evidenceSpans: binding.evidenceSpans,
        provenance: binding.provenance ?? outputSupport.provenance
      };
    }

    return {
      indicatorId: binding.indicatorId,
      requestedLevel: binding.requestedLevel,
      bindingState: outcomeSupport.state === 'supported' ? 'supported' : 'unresolved',
      reason: outcomeSupport.state === 'supported'
        ? 'Indicator-to-outcome binding supported by outcome evidence.'
        : 'Outcome evidence is unavailable; indicator binding unresolved.',
      evidenceSpans: binding.evidenceSpans,
      provenance: binding.provenance ?? outcomeSupport.provenance
    };
  });

  return {
    targetActor,
    beneficiary,
    institutionalActor,
    dutyBearer,
    objectOfChange,
    outputSupport,
    outcomeSupport,
    impactSupport,
    indicatorBindings
  };
}

export function evaluateCausalGuardrails(
  eligibleCandidates: CanonicalCandidate[],
  supportSnapshot?: CausalSupportSnapshot
): GuardrailWarning[] {
  const support = supportSnapshot ?? deriveCausalSupportSnapshot(eligibleCandidates);
  const warnings: GuardrailWarning[] = [];

  const hasActivity = eligibleCandidates.some(c => c.candidateType === 'archetype');
  const hasOutput = eligibleCandidates.some(c => c.candidateType === 'output');
  const hasOutcome = eligibleCandidates.some(c => c.candidateType === 'outcome');

  if (hasActivity && !hasOutcome) {
    warnings.push({
      id: 'WARN-CAUSAL-ACTIVITY-OUTCOME',
      code: 'WARN-CAUSAL-ACTIVITY-OUTCOME',
      severity: 'needs_review',
      message: 'Activity evidence exists without supported outcome evidence. Outcome remains unresolved.'
    });
  }

  if (hasOutput && !hasOutcome) {
    warnings.push({
      id: 'WARN-CAUSAL-OUTPUT-OUTCOME',
      code: 'WARN-CAUSAL-OUTPUT-OUTCOME',
      severity: 'needs_review',
      message: 'Output evidence exists without supported outcome evidence. Causal bridge is unresolved.'
    });
  }

  if (hasOutcome && (support.targetActor.state !== 'supported' || support.objectOfChange.state !== 'supported')) {
    warnings.push({
      id: 'WARN-OUTCOME-INCOMPLETE',
      code: 'WARN-OUTCOME-INCOMPLETE',
      severity: 'blocking',
      message: 'Outcome requires supported target actor and object of change metadata.'
    });
  }

  if (support.beneficiary.state === 'supported' && support.targetActor.state !== 'supported') {
    warnings.push({
      id: 'WARN-BENEFICIARY-NOT-TARGET',
      code: 'WARN-BENEFICIARY-NOT-TARGET',
      severity: 'needs_review',
      message: 'Beneficiary cannot be auto-promoted to target actor without canonical support.'
    });
  }

  if (support.institutionalActor.state === 'supported' && support.dutyBearer.state !== 'supported') {
    warnings.push({
      id: 'WARN-INSTITUTION-NOT-DUTY-BEARER',
      code: 'WARN-INSTITUTION-NOT-DUTY-BEARER',
      severity: 'needs_review',
      message: 'Institutional actor cannot be auto-promoted to duty bearer without canonical support.'
    });
  }

  if (support.impactSupport.state !== 'supported') {
    warnings.push({
      id: 'WARN-IMPACT-UNRESOLVED',
      code: 'WARN-IMPACT-UNRESOLVED',
      severity: 'needs_review',
      message: 'Impact remains unresolved because supported long-term-condition evidence is unavailable.'
    });
  }

  for (const indicator of support.indicatorBindings) {
    if (indicator.bindingState !== 'supported') {
      warnings.push({
        id: `WARN-INDICATOR-${indicator.indicatorId}`,
        code: 'WARN-INDICATOR-BINDING-UNRESOLVED',
        severity: indicator.bindingState === 'unsupported' ? 'important' : 'needs_review',
        message: indicator.reason
      });
    }
  }

  return warnings;
}

export function checkCausalLeap(
  eligibleCandidates: CanonicalCandidate[],
  warnings: GuardrailWarning[],
  options?: CausalDerivationOptions
): CausalSupportSnapshot {
  const support = deriveCausalSupportSnapshot(eligibleCandidates, options);
  warnings.push(...evaluateCausalGuardrails(eligibleCandidates, support));
  return support;
}
