import type { Page1Input, CanonicalCandidate } from './types';
import type {
  AdapterCompatibilityFailure,
  AdapterCompatibilityMetadata,
  ApprovalResult,
  DeterministicPage2Payload,
  DeterministicConflictResult,
  DeterministicMissingResult,
  GuardrailWarning,
  ManualReviewState,
  RecommendationItem,
  ApprovedSessionSnapshot,
  BlueprintItem
} from './blueprint-types';
import { runScoringPipeline } from './scoring-runner';
import { SCORING_CONFIG } from './scoring-config';
import { collectCandidates } from './candidates';
import { assembleBlueprint } from './blueprint-assembler';
import type { IndicatorBindingInput } from './causal-guardrails';
import { checkCausalLeap } from './causal-guardrails';
import { SECTORS, ACTORS } from './registry';
import type {
  AdapterValidationIssue as ProvisionalAdapterValidationIssue,
  ActorRoleRecommendation,
  MappingRecommendation,
  MissingInformationItem,
  ProvisionalDomainResponse,
  SDGRecommendation,
  AmbiguityItem
} from '../provisionalAdapter';

export interface CreatePage2PayloadOptions {
  now?: string;
  mode?: 'production' | 'fixture';
  sourceFixtureId?: string;
  engineVersion?: string;
  registryVersions?: Record<string, string>;
  contractVersion?: string;
  structuredConflicts?: DeterministicConflictResult[];
  indicatorBindings?: IndicatorBindingInput[];
  sdgCoverageStatus?: 'SUPPORTED' | 'UNSUPPORTED' | 'UNRESOLVED';
}

export interface AdapterCompatibilitySuccess {
  success: true;
  response: ProvisionalDomainResponse;
}

export type AdapterCompatibilityResult = AdapterCompatibilitySuccess | AdapterCompatibilityFailure;

export interface ConvertToAdapterOptions {
  metadata: AdapterCompatibilityMetadata;
  ambiguityDescriptions?: Record<string, string>;
  missingResolutionMap?: Record<string, MissingInformationItem['resolutionState']>;
}

function confidenceBand(score: number | undefined): 'high' | 'medium' | 'low' {
  const safe = score ?? 0;
  if (safe >= 0.8) return 'high';
  if (safe >= 0.5) return 'medium';
  return 'low';
}

function candidateEvidence(candidates: CanonicalCandidate[], id: string): ReturnType<typeof Array.prototype.slice> {
  return candidates.filter(c => c.canonicalId === id).flatMap(c => c.rawEvidenceSpans);
}

function toRecommendation(
  id: string,
  label: string | undefined,
  level: RecommendationItem['level'],
  score: number | undefined,
  candidates: CanonicalCandidate[]
): RecommendationItem {
  const evidenceSpans = candidateEvidence(candidates, id);
  return {
    id,
    label,
    level,
    score,
    confidenceScore: score,
    confidenceBand: confidenceBand(score),
    explanation: `deterministic:${id}`,
    provenance: 'deterministic_engine',
    status: evidenceSpans.length > 0 ? 'engine' : 'unresolved',
    evidenceSpans: evidenceSpans.length > 0 ? evidenceSpans : undefined
  };
}

function inferBlockingFromMissCode(code: string): boolean {
  return code.includes('MISS-001') || code.includes('MISS-002') || code.includes('MISS-003') || code.includes('MISS-004');
}

export function createPage2Payload(
  input: Page1Input,
  options?: CreatePage2PayloadOptions
): DeterministicPage2Payload {
  const now = options?.now ?? new Date().toISOString();

  const scoringResult = runScoringPipeline(input);
  const allCandidates = collectCandidates(input);
  const blueprint = assembleBlueprint(input, allCandidates);

  const warnings: GuardrailWarning[] = scoringResult.warnings.map((w, index) => ({
    id: `WARN-${index + 1}`,
    code: w,
    severity: inferBlockingFromMissCode(w) ? 'blocking' : 'important',
    message: `Deterministic warning: ${w}`
  }));
  const causalSupport = checkCausalLeap(allCandidates, warnings, {
    indicatorBindings: options?.indicatorBindings
  });

  const sectors: RecommendationItem[] = SECTORS.map(s => {
    const isPrimary = scoringResult.primarySector === s.id;
    const isSecondary = scoringResult.secondarySectors.includes(s.id);
    const level: RecommendationItem['level'] = isPrimary ? 'primary' : isSecondary ? 'secondary' : 'rejected';
    return toRecommendation(s.id, s.label ?? s.name, level, scoringResult.confidenceScore, allCandidates);
  });

  const interventionIds = new Set<string>([...scoringResult.primaryInterventions, ...scoringResult.supportingInterventions]);
  const interventions = Array.from(interventionIds).map(id =>
    toRecommendation(
      id,
      undefined,
      scoringResult.primaryInterventions.includes(id) ? 'primary' : 'secondary',
      scoringResult.confidenceScore,
      allCandidates
    )
  );

  const sdgIds = Array.from({ length: 17 }).map((_, i) => `SDG_${i + 1}`);
  const sdgs = sdgIds.map(id => {
    const level: RecommendationItem['level'] = scoringResult.primarySDGs.includes(id)
      ? 'primary'
      : scoringResult.secondarySDGs.includes(id)
        ? 'secondary'
        : 'rejected';
    return toRecommendation(id, id, level, scoringResult.confidenceScore, allCandidates);
  });

  const actorRoles = ACTORS.map(actor => {
    const level: RecommendationItem['level'] = allCandidates.some(c => c.canonicalId === actor.id && c.candidateType === 'actor')
      ? 'secondary'
      : 'rejected';
    return toRecommendation(actor.id, actor.name, level, scoringResult.confidenceScore, allCandidates);
  });

  const ambiguities = [] as DeterministicPage2Payload['ambiguities'];
  if (scoringResult.isAmbiguous) {
    ambiguities?.push({
      id: 'AMB-001',
      field: 'sector_primary',
      candidates: scoringResult.secondarySectors,
      requiredForApproval: true,
      state: 'unresolved'
    });
  }

  const missingInformation = scoringResult.missingInformation.map(m => {
    const blocking = inferBlockingFromMissCode(m);
    return {
      id: m,
      question: m,
      priority: blocking ? 'critical' : 'recommended',
      blocking,
      requiredForApproval: blocking,
      state: 'unresolved' as const
    };
  });

  const adapterValidationIssues = [] as DeterministicPage2Payload['adapterValidationIssues'];
  if (!options?.engineVersion) {
    adapterValidationIssues.push({
      id: 'VAL-ENGINE-VERSION-MISSING',
      code: 'VAL-ENGINE-VERSION-MISSING',
      severity: 'needs_review',
      message: 'Engine version is absent. Metadata is not fabricated; provide explicit runtime version when available.'
    });
  }

  if (!options?.structuredConflicts) {
    adapterValidationIssues.push({
      id: 'VAL-CONF-STRUCTURED-UNAVAILABLE',
      code: 'VAL-CONF-STRUCTURED-UNAVAILABLE',
      severity: 'needs_review',
      message: 'Structured conflict handoff is unavailable from current P0-C output. No conflict IDs were reconstructed from warning strings.'
    });
  }

  if (!options?.sdgCoverageStatus) {
    adapterValidationIssues.push({
      id: 'VAL-SDG-COVERAGE-UNAVAILABLE',
      code: 'VAL-SDG-COVERAGE-UNAVAILABLE',
      severity: 'needs_review',
      message: 'Structured SDG coverage status was not supplied and remains unresolved.'
    });
  }

  const missResults: DeterministicMissingResult[] = scoringResult.missingInformation.map(id => ({
    id,
    blocking: inferBlockingFromMissCode(id),
    requiredForApproval: inferBlockingFromMissCode(id),
    resolutionState: 'unresolved',
    provenance: ['scoring_runner_missing_information']
  }));

  const payload: DeterministicPage2Payload = {
    transportKind: 'P0_D_DETERMINISTIC_CORE_TRANSPORT',
    page1Input: input,
    contractVersion: options?.contractVersion ?? SCORING_CONFIG.contract_version,
    scoringConfigVersion: SCORING_CONFIG.heuristic_config_version,
    engineVersion: options?.engineVersion,
    registryVersions: options?.registryVersions,
    createdAt: now,
    sectors,
    interventions,
    sdgs,
    actorRoles: actorRoles.length > 0 ? actorRoles : undefined,
    warnings,
    blueprint,
    adapterValidationIssues,
    ambiguities: ambiguities && ambiguities.length > 0 ? ambiguities : undefined,
    missingInformation: missingInformation.length > 0 ? missingInformation : undefined,
    causalSupport,
    confResults: options?.structuredConflicts ? structuredClone(options.structuredConflicts) : undefined,
    missResults,
    sdgCoverageStatus: options?.sdgCoverageStatus ?? 'UNRESOLVED',
    rawCanonicalPayload: {
      primarySector: scoringResult.primarySector,
      secondarySectors: scoringResult.secondarySectors,
      primaryInterventions: scoringResult.primaryInterventions,
      supportingInterventions: scoringResult.supportingInterventions,
      primarySDGs: scoringResult.primarySDGs,
      secondarySDGs: scoringResult.secondarySDGs,
      confidenceScore: scoringResult.confidenceScore,
      isAmbiguous: scoringResult.isAmbiguous,
      provenanceLogs: scoringResult.provenanceLogs
    }
  };

  if (options?.mode === 'fixture' && options.sourceFixtureId) {
    payload.sourceFixtureId = options.sourceFixtureId;
  }

  return payload;
}

function toAdapterConfidence(item: RecommendationItem): 'high' | 'medium' | 'low' {
  if (item.confidenceBand) {
    return item.confidenceBand;
  }
  return confidenceBand(item.confidenceScore);
}

function toAdapterEvidence(spans?: CanonicalCandidate['rawEvidenceSpans']) {
  if (!spans || spans.length === 0) {
    return undefined;
  }
  return {
    sourceField: spans[0].sourceField,
    text: spans[0].matchedText,
    startOffset: spans[0].startOffset,
    endOffset: spans[0].endOffset
  };
}

function toAdapterEvidenceSpans(spans?: CanonicalCandidate['rawEvidenceSpans']) {
  return spans?.map(span => ({
    sourceField: span.sourceField,
    text: span.matchedText,
    startOffset: span.startOffset,
    endOffset: span.endOffset
  }));
}

export function convertToProvisionalDomainResponse(
  payload: DeterministicPage2Payload,
  options: ConvertToAdapterOptions
): AdapterCompatibilityResult {
  const issues: AdapterCompatibilityFailure['issues'] = [];
  const metadata = options.metadata;

  const adapterIssueCodeSet = new Set<ProvisionalAdapterValidationIssue['code']>([
    'VAL-CONFIDENCE',
    'VAL-EVIDENCE-OFFSETS',
    'VAL-ACTOR-ROLE'
  ]);

  if (!metadata.engineVersion.trim()) {
    issues.push({
      id: 'VAL-ADAPTER-META-ENGINE',
      code: 'VAL-ADAPTER-META-ENGINE',
      severity: 'blocking',
      message: 'Adapter compatibility conversion requires explicit engineVersion.'
    });
  }

  if (!metadata.sourceFixtureId.trim()) {
    issues.push({
      id: 'VAL-ADAPTER-META-FIXTURE',
      code: 'VAL-ADAPTER-META-FIXTURE',
      severity: 'blocking',
      message: 'Adapter compatibility conversion requires explicit sourceFixtureId.'
    });
  }

  if (!metadata.scenarioPurpose.trim()) {
    issues.push({
      id: 'VAL-ADAPTER-META-SCENARIO',
      code: 'VAL-ADAPTER-META-SCENARIO',
      severity: 'blocking',
      message: 'Adapter compatibility conversion requires explicit scenarioPurpose.'
    });
  }

  if (Object.keys(metadata.registryVersions).length === 0) {
    issues.push({
      id: 'VAL-ADAPTER-META-REGISTRY',
      code: 'VAL-ADAPTER-META-REGISTRY',
      severity: 'blocking',
      message: 'Adapter compatibility conversion requires explicit registryVersions.'
    });
  }

  if (issues.length > 0) {
    return { success: false, issues };
  }

  const sectors: MappingRecommendation[] = payload.sectors.map(item => {
    if (!item.label) {
      issues.push({
        id: `VAL-ADAPTER-SECTOR-LABEL-${item.id}`,
        code: 'VAL-ADAPTER-SECTOR-LABEL',
        severity: 'blocking',
        message: `Missing sector label for adapter conversion: ${item.id}`
      });
    }
    return {
      id: item.id,
      label: item.label ?? '',
      level: item.level,
      confidence: toAdapterConfidence(item),
      confidenceScore: item.confidenceScore,
      explanation: item.explanation ?? '',
      evidence: toAdapterEvidence(item.evidenceSpans),
      evidenceSpans: toAdapterEvidenceSpans(item.evidenceSpans)
    };
  });

  const interventions: MappingRecommendation[] = payload.interventions.map(item => ({
    id: item.id,
    label: item.label ?? item.id,
    level: item.level,
    confidence: toAdapterConfidence(item),
    confidenceScore: item.confidenceScore,
    explanation: item.explanation ?? '',
    evidence: toAdapterEvidence(item.evidenceSpans),
    evidenceSpans: toAdapterEvidenceSpans(item.evidenceSpans)
  }));

  const sdgs: SDGRecommendation[] = payload.sdgs.map(item => {
    const parsed = Number(item.id.replace('SDG_', ''));
    if (!Number.isFinite(parsed)) {
      issues.push({
        id: `VAL-ADAPTER-SDG-ID-${item.id}`,
        code: 'VAL-ADAPTER-SDG-ID',
        severity: 'blocking',
        message: `Unable to map SDG id to numeric form: ${item.id}`
      });
    }
    return {
      num: parsed,
      label: item.label ?? item.id,
      level: item.level,
      confidence: toAdapterConfidence(item),
      confidenceScore: item.confidenceScore,
      explanation: item.explanation ?? '',
      evidence: toAdapterEvidence(item.evidenceSpans),
      evidenceSpans: toAdapterEvidenceSpans(item.evidenceSpans)
    };
  });

  const actorRoles: ActorRoleRecommendation[] = (payload.actorRoles ?? []).map(item => ({
    id: item.id,
    actorName: item.label ?? item.id,
    level: item.level,
    confidence: toAdapterConfidence(item),
    confidenceScore: item.confidenceScore,
    explanation: item.explanation ?? '',
    evidence: toAdapterEvidence(item.evidenceSpans),
    evidenceSpans: toAdapterEvidenceSpans(item.evidenceSpans)
  }));

  const ambiguities: AmbiguityItem[] = (payload.ambiguities ?? []).map(item => {
    const description = options.ambiguityDescriptions?.[item.id];
    if (!description) {
      issues.push({
        id: `VAL-ADAPTER-AMB-DESC-${item.id}`,
        code: 'VAL-ADAPTER-AMB-DESC',
        severity: 'blocking',
        message: `Missing ambiguity description mapping for adapter conversion: ${item.id}`
      });
    }
    return {
      id: item.id,
      field: item.field,
      description: description ?? '',
      candidates: item.candidates,
      resolvedValue: item.resolvedValue,
      requiredForApproval: item.requiredForApproval
    };
  });

  const missingInformation: MissingInformationItem[] = (payload.missingInformation ?? []).map(item => {
    const mappedState = options.missingResolutionMap?.[item.id] ?? (item.state === 'unresolved' ? 'unresolved' : undefined);
    if (!mappedState) {
      issues.push({
        id: `VAL-ADAPTER-MISS-STATE-${item.id}`,
        code: 'VAL-ADAPTER-MISS-STATE',
        severity: 'blocking',
        message: `Missing explicit missing-information resolution mapping for adapter conversion: ${item.id}`
      });
    }
    return {
      id: item.id,
      question: item.question,
      priority: item.priority,
      resolvedValue: item.resolvedValue,
      resolutionState: mappedState ?? 'unresolved',
      blocking: item.blocking,
      requiredForApproval: item.requiredForApproval
    };
  });

  if (issues.length > 0) {
    return { success: false, issues };
  }

  const incompatibleAdapterIssues = payload.adapterValidationIssues.filter(
    issue => !adapterIssueCodeSet.has(issue.code as ProvisionalAdapterValidationIssue['code'])
  );
  if (incompatibleAdapterIssues.length > 0) {
    return {
      success: false,
      issues: [
        {
          id: 'VAL-ADAPTER-ISSUE-CODE-INCOMPATIBLE',
          code: 'VAL-ADAPTER-ISSUE-CODE-INCOMPATIBLE',
          severity: 'blocking',
          message: 'Core payload contains adapterValidationIssue codes outside ProvisionalDomainResponse contract.'
        }
      ]
    };
  }

  const incompatibleBlueprintItems = payload.blueprint.items.filter(
    item => typeof item.text !== 'string' || item.status === 'unresolved' || item.status === 'user_override_needs_evidence'
  );
  if (incompatibleBlueprintItems.length > 0) {
    return {
      success: false,
      issues: [
        {
          id: 'VAL-ADAPTER-BLUEPRINT-INCOMPATIBLE',
          code: 'VAL-ADAPTER-BLUEPRINT-INCOMPATIBLE',
          severity: 'blocking',
          message: 'Adapter conversion cannot safely represent unresolved or textless blueprint items without semantic loss.'
        }
      ]
    };
  }

  const response: ProvisionalDomainResponse = {
    adapterValidationIssues: payload.adapterValidationIssues.length > 0
      ? (payload.adapterValidationIssues as ProvisionalAdapterValidationIssue[])
      : undefined,
    contractVersion: metadata.contractVersion,
    contractStatus: 'provisional_against_v1_2',
    engineVersion: metadata.engineVersion,
    registryVersions: metadata.registryVersions,
    sourceFixtureId: metadata.sourceFixtureId,
    createdAt: payload.createdAt,
    scenarioPurpose: metadata.scenarioPurpose,
    sectors,
    interventions,
    sdgs,
    actorRoles,
    ambiguities,
    missingInformation,
    warnings: payload.warnings,
    blueprint: {
      items: payload.blueprint.items.map(item => ({
          id: item.id,
          section: item.section,
          text: item.text as string,
          status: item.status as 'from_source' | 'inferred' | 'modified' | 'confirmed',
          explanation: item.explanation,
          evidenceSpans: toAdapterEvidenceSpans(item.evidenceSpans)
        }))
    },
    rawCanonicalPayload: payload.rawCanonicalPayload
  };

  return {
    success: true,
    response
  };
}

export function createManualReviewState(payload: DeterministicPage2Payload): ManualReviewState {
  return {
    original: structuredClone(payload),
    working: structuredClone(payload),
    decisions: []
  };
}

function recordDecision(state: ManualReviewState, entry: ManualReviewState['decisions'][number]): ManualReviewState {
  return {
    original: state.original,
    working: state.working,
    decisions: [...state.decisions, entry]
  };
}

function updateCollection(
  state: ManualReviewState,
  collection: 'sectors' | 'interventions' | 'sdgs' | 'actorRoles',
  id: string,
  updater: (item: RecommendationItem) => RecommendationItem,
  action: ManualReviewState['decisions'][number]['action'],
  timestamp: string
): ManualReviewState {
  const clone = structuredClone(state.working);
  const list = clone[collection];
  if (!list) return state;
  const idx = list.findIndex(item => item.id === id);
  if (idx < 0) return state;

  const oldValue = list[idx];
  const newValue = updater(oldValue);
  list[idx] = newValue;

  return recordDecision(
    {
      original: state.original,
      working: clone,
      decisions: state.decisions
    },
    {
      id: `${action}-${id}-${timestamp}`,
      action,
      path: `${collection}.${id}`,
      oldValue,
      newValue,
      timestamp,
      origin: 'user_override'
    }
  );
}

export function acceptRecommendation(
  state: ManualReviewState,
  collection: 'sectors' | 'interventions' | 'sdgs' | 'actorRoles',
  id: string,
  timestamp: string
): ManualReviewState {
  return updateCollection(state, collection, id, item => ({ ...item, level: 'primary', status: 'user_override' }), 'accept_recommendation', timestamp);
}

export function rejectRecommendation(
  state: ManualReviewState,
  collection: 'sectors' | 'interventions' | 'sdgs' | 'actorRoles',
  id: string,
  timestamp: string
): ManualReviewState {
  return updateCollection(state, collection, id, item => ({ ...item, level: 'rejected', status: 'user_override' }), 'reject_recommendation', timestamp);
}

export function changeRecommendationLevel(
  state: ManualReviewState,
  collection: 'sectors' | 'interventions' | 'sdgs' | 'actorRoles',
  id: string,
  level: RecommendationItem['level'],
  timestamp: string
): ManualReviewState {
  return updateCollection(state, collection, id, item => ({ ...item, level, status: 'user_override' }), 'change_recommendation_level', timestamp);
}

export function selectAlternativeCanonicalCandidate(
  state: ManualReviewState,
  collection: 'sectors' | 'interventions' | 'sdgs' | 'actorRoles',
  currentId: string,
  alternativeId: string,
  timestamp: string
): ManualReviewState {
  return updateCollection(
    state,
    collection,
    currentId,
    item => ({ ...item, id: alternativeId, status: 'user_override' }),
    'select_alternative_candidate',
    timestamp
  );
}

export function addManualCandidate(
  state: ManualReviewState,
  collection: 'sectors' | 'interventions' | 'sdgs' | 'actorRoles',
  candidate: RecommendationItem,
  timestamp: string
): ManualReviewState {
  const clone = structuredClone(state.working);
  const list = clone[collection] ?? [];
  const normalized: RecommendationItem = {
    ...candidate,
    status: candidate.evidenceSpans && candidate.evidenceSpans.length > 0 ? 'user_override' : 'user_override_needs_evidence'
  };
  (clone[collection] as RecommendationItem[] | undefined) = [...list, normalized];
  return recordDecision(
    {
      original: state.original,
      working: clone,
      decisions: state.decisions
    },
    {
      id: `add_manual_candidate-${candidate.id}-${timestamp}`,
      action: 'add_manual_candidate',
      path: `${collection}.${candidate.id}`,
      oldValue: undefined,
      newValue: normalized,
      timestamp,
      origin: 'user_override'
    }
  );
}

export function editBlueprintText(
  state: ManualReviewState,
  itemId: string,
  text: string,
  timestamp: string
): ManualReviewState {
  const clone = structuredClone(state.working);
  const idx = clone.blueprint.items.findIndex(i => i.id === itemId);
  if (idx < 0) return state;
  const oldValue = clone.blueprint.items[idx];
  const newValue: BlueprintItem = { ...oldValue, text, status: 'modified' };
  clone.blueprint.items[idx] = newValue;

  return recordDecision(
    {
      original: state.original,
      working: clone,
      decisions: state.decisions
    },
    {
      id: `edit_blueprint_text-${itemId}-${timestamp}`,
      action: 'edit_blueprint_text',
      path: `blueprint.${itemId}`,
      oldValue,
      newValue,
      timestamp,
      origin: 'user_override'
    }
  );
}

export function resolveAmbiguity(
  state: ManualReviewState,
  ambiguityId: string,
  resolvedValue: string,
  timestamp: string
): ManualReviewState {
  const clone = structuredClone(state.working);
  const list = clone.ambiguities;
  if (!list) return state;
  const idx = list.findIndex(item => item.id === ambiguityId);
  if (idx < 0) return state;
  const oldValue = list[idx];
  const newValue = { ...oldValue, resolvedValue, state: 'resolved' as const };
  list[idx] = newValue;

  return recordDecision(
    {
      original: state.original,
      working: clone,
      decisions: state.decisions
    },
    {
      id: `resolve_ambiguity-${ambiguityId}-${timestamp}`,
      action: 'resolve_ambiguity',
      path: `ambiguities.${ambiguityId}`,
      oldValue,
      newValue,
      timestamp,
      origin: 'user_override'
    }
  );
}

export function resolveMissingInformation(
  state: ManualReviewState,
  missingId: string,
  resolvedValue: string,
  timestamp: string
): ManualReviewState {
  const clone = structuredClone(state.working);
  const list = clone.missingInformation;
  if (!list) return state;
  const idx = list.findIndex(item => item.id === missingId);
  if (idx < 0) return state;
  const oldValue = list[idx];
  const newValue = { ...oldValue, resolvedValue, state: 'resolved' as const };
  list[idx] = newValue;

  return recordDecision(
    {
      original: state.original,
      working: clone,
      decisions: state.decisions
    },
    {
      id: `resolve_missing_information-${missingId}-${timestamp}`,
      action: 'resolve_missing_information',
      path: `missingInformation.${missingId}`,
      oldValue,
      newValue,
      timestamp,
      origin: 'user_override'
    }
  );
}

export function acceptUnknown(
  state: ManualReviewState,
  type: 'ambiguity' | 'missing',
  id: string,
  timestamp: string,
  allowUnknown: boolean
): ManualReviewState {
  if (!allowUnknown) {
    return state;
  }

  if (type === 'ambiguity') {
    return resolveAmbiguity(state, id, 'UNKNOWN_ACCEPTED', timestamp);
  }

  const clone = structuredClone(state.working);
  const list = clone.missingInformation;
  if (!list) return state;
  const idx = list.findIndex(item => item.id === id);
  if (idx < 0) return state;
  const oldValue = list[idx];
  const newValue = { ...oldValue, state: 'accepted_unknown' as const, resolvedValue: 'UNKNOWN_ACCEPTED' };
  list[idx] = newValue;

  return recordDecision(
    {
      original: state.original,
      working: clone,
      decisions: state.decisions
    },
    {
      id: `accept_unknown-${id}-${timestamp}`,
      action: 'accept_unknown',
      path: `missingInformation.${id}`,
      oldValue,
      newValue,
      timestamp,
      origin: 'user_override'
    }
  );
}

export function restoreOriginalItem(
  state: ManualReviewState,
  type: 'recommendation' | 'blueprint',
  key: { collection?: 'sectors' | 'interventions' | 'sdgs' | 'actorRoles'; id: string },
  timestamp: string
): ManualReviewState {
  const clone = structuredClone(state.working);

  if (type === 'recommendation') {
    const collection = key.collection;
    if (!collection) return state;
    const originalList = state.original[collection];
    const workingList = clone[collection];
    if (!originalList || !workingList) return state;
    const originalItem = originalList.find(item => item.id === key.id);
    const idx = workingList.findIndex(item => item.id === key.id);
    if (!originalItem || idx < 0) return state;
    const oldValue = workingList[idx];
    workingList[idx] = structuredClone(originalItem);
    return recordDecision(
      {
        original: state.original,
        working: clone,
        decisions: state.decisions
      },
      {
        id: `restore_original-${key.id}-${timestamp}`,
        action: 'restore_original',
        path: `${collection}.${key.id}`,
        oldValue,
        newValue: workingList[idx],
        timestamp,
        origin: 'user_override'
      }
    );
  }

  const originalBlueprintItem = state.original.blueprint.items.find(item => item.id === key.id);
  const idx = clone.blueprint.items.findIndex(item => item.id === key.id);
  if (!originalBlueprintItem || idx < 0) return state;
  const oldValue = clone.blueprint.items[idx];
  clone.blueprint.items[idx] = structuredClone(originalBlueprintItem);

  return recordDecision(
    {
      original: state.original,
      working: clone,
      decisions: state.decisions
    },
    {
      id: `restore_original-${key.id}-${timestamp}`,
      action: 'restore_original',
      path: `blueprint.${key.id}`,
      oldValue,
      newValue: clone.blueprint.items[idx],
      timestamp,
      origin: 'user_override'
    }
  );
}

export function buildApprovedSessionSnapshot(
  state: ManualReviewState,
  approvalTimestamp: string,
  organizationSnapshotReference?: unknown
): ApprovalResult {
  const blockingMissing = (state.working.missingInformation ?? []).filter(item => item.requiredForApproval && item.state === 'unresolved');
  const blockingAmbiguity = (state.working.ambiguities ?? []).filter(item => item.requiredForApproval && item.state === 'unresolved');
  const unresolvedBlockingSlots = state.working.blueprint.items.filter(item => !item.approvable && item.status === 'unresolved');

  const blockers = [
    ...blockingMissing.map(item => item.id),
    ...blockingAmbiguity.map(item => item.id),
    ...unresolvedBlockingSlots.map(item => item.id)
  ];

  if (blockers.length > 0) {
    return {
      approved: false,
      blockers
    };
  }

  const acceptedItems = [
    ...state.working.sectors.filter(i => i.level !== 'rejected').map(i => i.id),
    ...state.working.interventions.filter(i => i.level !== 'rejected').map(i => i.id),
    ...state.working.sdgs.filter(i => i.level !== 'rejected').map(i => i.id),
    ...(state.working.actorRoles ?? []).filter(i => i.level !== 'rejected').map(i => i.id)
  ];

  const rejectedItems = [
    ...state.working.sectors.filter(i => i.level === 'rejected').map(i => i.id),
    ...state.working.interventions.filter(i => i.level === 'rejected').map(i => i.id),
    ...state.working.sdgs.filter(i => i.level === 'rejected').map(i => i.id),
    ...(state.working.actorRoles ?? []).filter(i => i.level === 'rejected').map(i => i.id)
  ];

  const snapshot: ApprovedSessionSnapshot = {
    page1Input: state.working.page1Input,
    organizationSnapshotReference,
    rawCanonicalPayload: state.working.rawCanonicalPayload,
    normalizedPage2View: structuredClone(state.working),
    originalEngineRecommendations: {
      sectors: structuredClone(state.original.sectors),
      interventions: structuredClone(state.original.interventions),
      sdgs: structuredClone(state.original.sdgs),
      actorRoles: state.original.actorRoles ? structuredClone(state.original.actorRoles) : undefined
    },
    userDecisions: structuredClone(state.decisions),
    acceptedItems,
    rejectedItems,
    manualBlueprintEdits: state.decisions
      .filter(d => d.action === 'edit_blueprint_text')
      .map(d => ({
        itemId: d.path.replace('blueprint.', ''),
        oldText: typeof (d.oldValue as BlueprintItem | undefined)?.text === 'string' ? (d.oldValue as BlueprintItem).text : undefined,
        newText: typeof (d.newValue as BlueprintItem | undefined)?.text === 'string' ? (d.newValue as BlueprintItem).text : undefined
      })),
    ambiguityResolutions: structuredClone(state.working.ambiguities ?? []),
    missingInformationResolutions: structuredClone(state.working.missingInformation ?? []),
    unresolvedNonBlockingItems: [
      ...(state.working.missingInformation ?? [])
        .filter(item => !item.requiredForApproval && item.state === 'unresolved')
        .map(item => item.id),
      ...(state.working.ambiguities ?? [])
        .filter(item => !item.requiredForApproval && item.state === 'unresolved')
        .map(item => item.id),
      ...state.working.blueprint.items
        .filter(item => item.status === 'unresolved' && item.approvable)
        .map(item => item.id)
    ],
    evidenceAndProvenance: {
      warnings: structuredClone(state.working.warnings),
      adapterValidationIssues: structuredClone(state.working.adapterValidationIssues)
    },
    contractVersion: state.working.contractVersion,
    engineVersion: state.working.engineVersion,
    registryVersions: state.working.registryVersions,
    scoringConfigVersion: state.working.scoringConfigVersion,
    approvalTimestamp,
    durability: 'session_only_non_durable'
  };

  return {
    approved: true,
    blockers: [],
    snapshot
  };
}
