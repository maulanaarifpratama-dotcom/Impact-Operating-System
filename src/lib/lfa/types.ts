export interface RawLfaProject {
  readonly id: string;
  readonly org_id: string;
  readonly name: string;
  readonly sector?: string | null;
  readonly location?: string | null;
  readonly duration_months?: number | null;
  readonly start_date?: string | null;
  readonly beneficiary_count?: number | null;
  readonly beneficiary_description?: string | null;
  readonly status?: string | null;
  readonly linked_grant_id?: string | null;
  readonly created_at?: string | null;
  readonly updated_at?: string | null;
}

export interface RawLfaEntry {
  readonly id: string;
  readonly project_id: string;
  readonly org_id: string;
  readonly level: 'goal' | 'purpose' | 'output' | 'activity';
  readonly sequence?: number | null;
  readonly parent_id?: string | null;
  readonly description?: string | null;
  readonly indicator?: string | null;
  readonly means_of_verification?: string | null;
  readonly assumption?: string | null;
  readonly responsible_party?: string | null;
  readonly timeline_start?: number | null;
  readonly timeline_end?: number | null;
  readonly ai_suggestion?: string | null;
  readonly created_at?: string | null;
  readonly updated_at?: string | null;
}

export interface GrantLinkEvidence {
  readonly resolves: boolean;
  readonly grantProjectId?: string;
  readonly documentId?: string;
}

export interface StructuralSkeletonNode {
  readonly sourceNodeId: string;
  readonly declaredNodeType: 'goal' | 'purpose' | 'outcome' | 'output' | 'activity';
  readonly sequencePosition: number;
  readonly parentSourceNodeId?: string | null;
  readonly correlatedRawEntryId?: string | null;
}

export interface ValidatedStructuralSkeletonEvidence {
  readonly documentId: string;
  readonly documentVersion: number | string | null;
  readonly isCurrent: boolean;
  readonly validationStatus: 'VALIDATED_STRUCTURE';
  readonly goalNode: StructuralSkeletonNode | null;
  readonly purposeNode: StructuralSkeletonNode | null;
  readonly outcomeNodes: readonly StructuralSkeletonNode[];
  readonly outputNodes: readonly StructuralSkeletonNode[];
  readonly activityNodes: readonly StructuralSkeletonNode[];
  readonly correlationStatus: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
}

export type RawEntryDisposition =
  | 'CANONICAL_NODE'
  | 'UNASSIGNED'
  | 'DUPLICATE_CANDIDATE'
  | 'INVALID_PARENT'
  | 'AMBIGUOUS_PRESERVED'
  | 'REVIEW_ONLY';

export type PresentationMode =
  | 'COMPACT_CONFIRMED'
  | 'COMPACT_WITH_UNASSIGNED_OUTPUT'
  | 'EXPANDED_CONFIRMED'
  | 'EXPANDED_WITH_UNUSED_OUTCOME'
  | 'AMBIGUOUS'
  | 'EMPTY';

export type StructuralStatus =
  | 'EMPTY'
  | 'INCOMPLETE'
  | 'COMPLETE'
  | 'AMBIGUOUS'
  | 'BLOCKED';

export type MeasurementStatus =
  | 'UNKNOWN'
  | 'INCOMPLETE'
  | 'LEGACY_TEXT_PRESENT';

export type SourceCorrelationStatus = 
  | 'CONFIRMED_STRUCTURAL' 
  | 'INFERRED_STRUCTURAL' 
  | 'UNRESOLVED';

export type AdapterConfidenceTier = 'A' | 'B' | 'C';

export type InterpretedNodeType = 'goal' | 'purpose' | 'outcome' | 'output' | 'activity';

export type ClassificationState =
  | 'CONFIRMED_GOAL'
  | 'INFERRED_GOAL_CANDIDATE'
  | 'DUPLICATE_GOAL_CANDIDATE'
  | 'CONFIRMED_PURPOSE'
  | 'INFERRED_PURPOSE_CANDIDATE'
  | 'DUPLICATE_PURPOSE_CANDIDATE'
  | 'CONFIRMED_OUTCOME'
  | 'INFERRED_OUTCOME_CANDIDATE'
  | 'UNUSED_SKELETON_OUTCOME'
  | 'AMBIGUOUS_RESULT'
  | 'CONFIRMED_OUTPUT'
  | 'LEGACY_UNASSIGNED_OUTPUT'
  | 'INVALID_OUTPUT_PARENT'
  | 'CONFIRMED_ACTIVITY'
  | 'INVALID_ACTIVITY_PARENT';

export type AdapterEvidenceCode =
  | 'persisted_canonical'
  | 'skeleton_correlation'
  | 'database_graph'
  | 'cardinality'
  | 'sequence_fallback';

export type AdapterFindingCode =
  | 'BROKEN_SOURCE_LINK'
  | 'MULTIPLE_GOAL_CANDIDATES'
  | 'MULTIPLE_PURPOSE_CANDIDATES'
  | 'AMBIGUOUS_ADDITIONAL_PURPOSE'
  | 'UNASSIGNED_OUTPUT'
  | 'MISSING_PARENT'
  | 'WRONG_LEVEL_PARENT'
  | 'CROSS_PROJECT_PARENT'
  | 'CROSS_TENANT_PARENT'
  | 'SKELETON_NOT_CURRENT'
  | 'SKELETON_COUNT_MISMATCH'
  | 'SOURCE_CORRELATION_UNRESOLVED'
  | 'UNUSED_SKELETON_OUTCOME'
  | 'SELF_REFERENCING_PARENT';

export type AdapterReviewActionCode =
  | 'REVIEW_BROKEN_SOURCE_LINK'
  | 'REVIEW_DUPLICATE_GOAL'
  | 'REVIEW_DUPLICATE_PURPOSE'
  | 'REVIEW_AMBIGUOUS_RESULT'
  | 'REVIEW_UNASSIGNED_OUTPUT'
  | 'REVIEW_INVALID_PARENT'
  | 'REVIEW_UNUSED_OUTCOME';

export interface CanonicalParentRef {
  readonly viewNodeId: string;
  readonly nodeType: 'goal' | 'purpose' | 'outcome' | 'output';
}

export interface AdapterEvidence {
  readonly precedenceLevel: number;
  readonly source: AdapterEvidenceCode;
}

export interface CanonicalNodeView {
  readonly viewNodeId: string; // deterministically formatted raw:<rawEntryId>
  readonly rawEntryId: string;
  readonly sourceExternalId?: string;
  readonly sourceCorrelationStatus: SourceCorrelationStatus;
  readonly declaredStorageLevel: 'goal' | 'purpose' | 'output' | 'activity';
  readonly interpretedNodeType: InterpretedNodeType;
  readonly classificationState: ClassificationState;
  readonly confidenceTier: AdapterConfidenceTier;
  readonly parentRef: CanonicalParentRef | null;
  readonly rawSequence: number;
  readonly statement: string;
  readonly legacyIndicatorText: string | null;
  readonly legacyMeansOfVerificationText: string | null;
  readonly legacyAssumptionText: string | null;
  readonly legacyResponsiblePartyText: string | null;
  readonly timelineStart: number | null;
  readonly timelineEnd: number | null;
  readonly evidence: AdapterEvidence;
  readonly disposition: RawEntryDisposition;
}

export interface AdapterFinding {
  readonly findingId: string; // deterministic format: <projectId>:<findingCode>:<sortedRawEntryIds>
  readonly code: AdapterFindingCode;
  readonly severity: 'WARNING' | 'ERROR' | 'INFO';
  readonly rawEntryIds: readonly string[];
  readonly params?: Record<string, string | number>;
}

export interface AdapterReviewItem {
  readonly findingId: string;
  readonly projectId: string;
  readonly scopeType: InterpretedNodeType;
  readonly scopeId: string;
  readonly classification: ClassificationState;
  readonly confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  readonly evidenceTier: AdapterConfidenceTier;
  readonly evidenceReasons: readonly string[];
  readonly blockingStatus: boolean;
  readonly recommendedUserAction: AdapterReviewActionCode;
  readonly rawEntryIds: readonly string[];
  readonly createdAt: string;
}

export interface CanonicalLfaView {
  readonly rawProject: RawLfaProject;
  readonly allRawEntries: readonly RawLfaEntry[];
  readonly goal: CanonicalNodeView | null;
  readonly purpose: CanonicalNodeView | null;
  readonly outcomes: readonly CanonicalNodeView[];
  readonly outputs: readonly CanonicalNodeView[];
  readonly activities: readonly CanonicalNodeView[];
  readonly unusedOutcomes: readonly CanonicalNodeView[];
  readonly unassignedOutputs: readonly CanonicalNodeView[];
  readonly orphanedActivities: readonly CanonicalNodeView[];
  readonly presentationMode: PresentationMode;
  readonly structuralStatus: StructuralStatus;
  readonly measurementStatus: MeasurementStatus;
  readonly findings: readonly AdapterFinding[];
  readonly reviewQueue: readonly AdapterReviewItem[];
  readonly dispositionMap: Record<string, RawEntryDisposition>;
  readonly hasBlockingIntegrityFinding: boolean;
}

export interface MapToCanonicalLfaViewInput {
  readonly rawProject: RawLfaProject;
  readonly rawEntries: readonly RawLfaEntry[];
  readonly grantLinkEvidence?: GrantLinkEvidence | null;
  readonly skeletonEvidence?: ValidatedStructuralSkeletonEvidence | null;
}
