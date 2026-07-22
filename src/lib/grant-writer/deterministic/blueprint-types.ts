import type { EvidenceSpan } from './types';

export type BlueprintSection =
  | 'problem'
  | 'impact'
  | 'outcome'
  | 'output'
  | 'activity'
  | 'indicator'
  | 'actor'
  | 'assumption'
  | 'risk'
  | 'partner';

export type BlueprintStatus =
  | 'from_source'
  | 'inferred'
  | 'modified'
  | 'confirmed'
  | 'unresolved'
  | 'user_override_needs_evidence';

export type ResolutionState = 'unresolved' | 'resolved' | 'accepted_unknown';

export interface BlueprintItem {
  id: string; // e.g. "SLOT-PROBLEM-01", "SLOT-IMPACT-01", "SLOT-OUTCOME-01" etc.
  section: BlueprintSection;
  text?: string;
  status: BlueprintStatus;
  approvable: boolean;
  unresolvedReason?: string;
  missingReferences?: string[];
  ambiguityReferences?: string[];
  // UI label metadata is allowed, but it is never canonical blueprint fact text.
  displayLabel?: string;
  explanation?: string;
  evidenceSpans?: EvidenceSpan[];
  provenance?: string[];
}

export interface ProgramBlueprint {
  items: BlueprintItem[];
}

export interface RecommendationItem {
  id: string;
  label?: string;
  level: 'primary' | 'secondary' | 'optional' | 'ambiguous' | 'rejected';
  score?: number;
  confidenceScore?: number;
  confidenceBand?: 'high' | 'medium' | 'low';
  explanation?: string;
  provenance?: string;
  status: 'engine' | 'user_override' | 'user_override_needs_evidence' | 'unresolved';
  evidenceSpans?: EvidenceSpan[];
}

export type SupportState = 'supported' | 'unsupported' | 'unresolved';

export interface SupportDecision {
  state: SupportState;
  reason: string;
  evidenceSpans?: EvidenceSpan[];
  provenance?: string[];
}

export interface IndicatorBindingDecision {
  indicatorId: string;
  requestedLevel?: 'output' | 'outcome' | 'impact' | 'activity';
  bindingState: SupportState;
  reason: string;
  evidenceSpans?: EvidenceSpan[];
  provenance?: string[];
}

export interface CausalSupportSnapshot {
  targetActor: SupportDecision;
  beneficiary: SupportDecision;
  institutionalActor: SupportDecision;
  dutyBearer: SupportDecision;
  objectOfChange: SupportDecision;
  outputSupport: SupportDecision;
  outcomeSupport: SupportDecision;
  impactSupport: SupportDecision;
  indicatorBindings: IndicatorBindingDecision[];
}

export interface AmbiguityResolutionItem {
  id: string;
  field: string;
  candidates: string[];
  requiredForApproval: boolean;
  state: ResolutionState;
  resolvedValue?: string;
}

export interface MissingInformationResolutionItem {
  id: string;
  question: string;
  priority: 'critical' | 'recommended';
  blocking: boolean;
  requiredForApproval: boolean;
  state: ResolutionState;
  resolvedValue?: string;
}

export interface GuardrailWarning {
  id: string;
  code: string;
  severity: 'informational' | 'needs_review' | 'important' | 'blocking';
  message: string;
}

export interface AdapterValidationIssue {
  id: string;
  code: string;
  severity: 'needs_review' | 'blocking';
  message: string;
}

export interface DeterministicPage2Payload {
  transportKind: 'P0_D_DETERMINISTIC_CORE_TRANSPORT';
  page1Input: unknown;
  contractVersion?: string;
  scoringConfigVersion?: string;
  engineVersion?: string;
  registryVersions?: Record<string, string>;
  sourceFixtureId?: string;
  createdAt: string;
  sectors: RecommendationItem[];
  interventions: RecommendationItem[];
  sdgs: RecommendationItem[];
  actorRoles?: RecommendationItem[];
  blueprint: ProgramBlueprint;
  warnings: GuardrailWarning[];
  adapterValidationIssues: AdapterValidationIssue[];
  ambiguities?: AmbiguityResolutionItem[];
  missingInformation?: MissingInformationResolutionItem[];
  causalSupport?: CausalSupportSnapshot;
  confResults?: DeterministicConflictResult[];
  missResults?: DeterministicMissingResult[];
  sdgCoverageStatus?: 'SUPPORTED' | 'UNSUPPORTED' | 'UNRESOLVED';
  rawCanonicalPayload: Readonly<Record<string, unknown>>;
}

export interface DeterministicConflictResult {
  id: string;
  processingType: 'NUMERIC_PENALTY' | 'HARD_GATE' | 'RECLASSIFICATION' | 'USER_REVIEW_ONLY' | 'INFORMATIONAL';
  conditionResult: 'triggered' | 'not_triggered' | 'unresolved';
  precedence: number;
  reviewRequired: boolean;
  provenance: string[];
}

export interface DeterministicMissingResult {
  id: string;
  blocking: boolean;
  requiredForApproval: boolean;
  resolutionState: ResolutionState;
  provenance: string[];
}

export interface AdapterCompatibilityMetadata {
  engineVersion: string;
  registryVersions: Record<string, string>;
  sourceFixtureId: string;
  scenarioPurpose: string;
  contractVersion: string;
}

export interface AdapterCompatibilityFailure {
  success: false;
  issues: AdapterValidationIssue[];
}

export interface ManualDecisionRecord {
  id: string;
  action:
    | 'accept_recommendation'
    | 'reject_recommendation'
    | 'change_recommendation_level'
    | 'select_alternative_candidate'
    | 'add_manual_candidate'
    | 'edit_blueprint_text'
    | 'resolve_ambiguity'
    | 'resolve_missing_information'
    | 'accept_unknown'
    | 'restore_original';
  path: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: string;
  origin: 'engine_result' | 'user_override';
}

export interface ManualReviewState {
  original: DeterministicPage2Payload;
  working: DeterministicPage2Payload;
  decisions: ManualDecisionRecord[];
}

export interface ApprovedSessionSnapshot {
  page1Input: unknown;
  organizationSnapshotReference?: unknown;
  rawCanonicalPayload: Readonly<Record<string, unknown>>;
  normalizedPage2View: DeterministicPage2Payload;
  originalEngineRecommendations: {
    sectors: RecommendationItem[];
    interventions: RecommendationItem[];
    sdgs: RecommendationItem[];
    actorRoles?: RecommendationItem[];
  };
  userDecisions: ManualDecisionRecord[];
  acceptedItems: string[];
  rejectedItems: string[];
  manualBlueprintEdits: Array<{ itemId: string; oldText?: string; newText?: string }>;
  ambiguityResolutions: AmbiguityResolutionItem[];
  missingInformationResolutions: MissingInformationResolutionItem[];
  unresolvedNonBlockingItems: string[];
  evidenceAndProvenance: {
    warnings: GuardrailWarning[];
    adapterValidationIssues: AdapterValidationIssue[];
  };
  contractVersion?: string;
  engineVersion?: string;
  registryVersions?: Record<string, string>;
  scoringConfigVersion?: string;
  approvalTimestamp: string;
  durability: 'session_only_non_durable';
}

export interface ApprovalResult {
  approved: boolean;
  blockers: string[];
  snapshot?: ApprovedSessionSnapshot;
}

