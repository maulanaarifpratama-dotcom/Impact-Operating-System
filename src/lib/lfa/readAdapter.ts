import {
  RawLfaEntry,
  StructuralSkeletonNode,
  ValidatedStructuralSkeletonEvidence,
  CanonicalNodeView,
  AdapterFinding,
  AdapterReviewItem,
  CanonicalLfaView,
  RawEntryDisposition,
  PresentationMode,
  StructuralStatus,
  MeasurementStatus,
  SourceCorrelationStatus,
  AdapterConfidenceTier,
  InterpretedNodeType,
  ClassificationState,
  AdapterEvidenceCode,
  AdapterFindingCode,
  AdapterReviewActionCode,
  CanonicalParentRef,
  MapToCanonicalLfaViewInput
} from './types';
import {
  CanonicalProposalPayloadV2,
  CanonicalOutputV2,
  CanonicalActivityV2,
  IndicatorV2,
  CostDriverV2
} from '../grant-writer/deterministic/types';
import { evaluateLfaQuality } from './qualityEngine';

const UUID_TEXT_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function isCanonicalUuidText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && UUID_TEXT_PATTERN.test(value);
}

function assertValidStructuralSkeletonNode(
  node: StructuralSkeletonNode,
  fieldName: string,
  expectedDeclaredNodeType: StructuralSkeletonNode['declaredNodeType']
): void {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    throw new Error(`${fieldName} must be a non-null object.`);
  }

  if (!isCanonicalUuidText(node.sourceNodeId)) {
    throw new Error(`${fieldName}.sourceNodeId must be a canonical UUID string.`);
  }

  if (node.declaredNodeType !== expectedDeclaredNodeType) {
    throw new Error(`${fieldName}.declaredNodeType must equal ${expectedDeclaredNodeType}.`);
  }

  if (typeof node.sequencePosition !== 'number' || !Number.isFinite(node.sequencePosition) || !Number.isInteger(node.sequencePosition)) {
    throw new Error(`${fieldName}.sequencePosition must be a finite integer number.`);
  }

  if (node.parentSourceNodeId !== null && node.parentSourceNodeId !== undefined && !isCanonicalUuidText(node.parentSourceNodeId)) {
    throw new Error(`${fieldName}.parentSourceNodeId must be a canonical UUID string when present.`);
  }

  if (node.correlatedRawEntryId !== null && node.correlatedRawEntryId !== undefined && !isCanonicalUuidText(node.correlatedRawEntryId)) {
    throw new Error(`${fieldName}.correlatedRawEntryId must be a canonical UUID string when present.`);
  }
}

function assertValidSkeletonEvidence(
  evidence: ValidatedStructuralSkeletonEvidence
): void {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    throw new Error('Skeleton evidence must be a non-null object.');
  }

  if (!isCanonicalUuidText(evidence.documentId)) {
    throw new Error('documentId must be a canonical UUID string.');
  }

  if (typeof evidence.documentVersion !== 'number' && typeof evidence.documentVersion !== 'string' && evidence.documentVersion !== null) {
    throw new Error('documentVersion must be a number, string, or null.');
  }

  if (typeof evidence.documentVersion === 'number' && (!Number.isFinite(evidence.documentVersion))) {
    throw new Error('documentVersion must be finite when provided as a number.');
  }

  if (typeof evidence.isCurrent !== 'boolean') {
    throw new Error('isCurrent must be a boolean.');
  }

  if (evidence.validationStatus !== 'VALIDATED_STRUCTURE') {
    throw new Error(`Invalid validation status: expected VALIDATED_STRUCTURE, got ${evidence.validationStatus}`);
  }

  if (evidence.correlationStatus !== 'AVAILABLE' && evidence.correlationStatus !== 'PARTIAL' && evidence.correlationStatus !== 'UNAVAILABLE') {
    throw new Error('correlationStatus must be AVAILABLE, PARTIAL, or UNAVAILABLE.');
  }

  if (!Array.isArray(evidence.outcomeNodes)) {
    throw new Error('outcomeNodes must be a valid array.');
  }
  if (!Array.isArray(evidence.outputNodes)) {
    throw new Error('outputNodes must be a valid array.');
  }
  if (!Array.isArray(evidence.activityNodes)) {
    throw new Error('activityNodes must be a valid array.');
  }

  if (evidence.goalNode !== null && evidence.goalNode !== undefined) {
    assertValidStructuralSkeletonNode(evidence.goalNode, 'goalNode', 'goal');
  }
  if (evidence.purposeNode !== null && evidence.purposeNode !== undefined) {
    assertValidStructuralSkeletonNode(evidence.purposeNode, 'purposeNode', 'purpose');
  }

  const seenSourceNodeIds = new Set<string>();
  const seenCorrelatedRawEntryIds = new Set<string>();

  const registerNodeIdentity = (node: StructuralSkeletonNode, fieldName: string): void => {
    if (seenSourceNodeIds.has(node.sourceNodeId)) {
      throw new Error(`${fieldName}.sourceNodeId must be unique across skeleton evidence.`);
    }
    seenSourceNodeIds.add(node.sourceNodeId);

    if (node.correlatedRawEntryId !== null && node.correlatedRawEntryId !== undefined) {
      if (seenCorrelatedRawEntryIds.has(node.correlatedRawEntryId)) {
        throw new Error(`${fieldName}.correlatedRawEntryId must be unique across skeleton evidence.`);
      }
      seenCorrelatedRawEntryIds.add(node.correlatedRawEntryId);
    }
  };

  const validateCollection = (
    nodes: readonly StructuralSkeletonNode[],
    collectionName: 'outcomeNodes' | 'outputNodes' | 'activityNodes',
    expectedType: 'outcome' | 'output' | 'activity'
  ): void => {
    nodes.forEach((node, index) => {
      const fieldName = `${collectionName}[${index}]`;
      assertValidStructuralSkeletonNode(node, fieldName, expectedType);
      registerNodeIdentity(node, fieldName);
    });
  };

  validateCollection(evidence.outcomeNodes, 'outcomeNodes', 'outcome');
  validateCollection(evidence.outputNodes, 'outputNodes', 'output');
  validateCollection(evidence.activityNodes, 'activityNodes', 'activity');

  if (evidence.goalNode !== null && evidence.goalNode !== undefined) {
    registerNodeIdentity(evidence.goalNode, 'goalNode');
  }
  if (evidence.purposeNode !== null && evidence.purposeNode !== undefined) {
    registerNodeIdentity(evidence.purposeNode, 'purposeNode');
  }
}

export function mapToCanonicalLfaView(
  input: MapToCanonicalLfaViewInput
): CanonicalLfaView {
  const { rawProject, rawEntries, grantLinkEvidence, skeletonEvidence } = input;

  if (!rawEntries || !Array.isArray(rawEntries)) {
    throw new Error('rawEntries must be a valid array.');
  }

  // 1. Input Structural Validation & Fail-Fast Duplicate ID Check
  const rawIdSet = new Set<string>();
  for (const entry of rawEntries) {
    if (!entry.id) {
      throw new Error('Raw entry is missing a valid id.');
    }
    if (rawIdSet.has(entry.id)) {
      throw new Error(`Duplicate rawEntryId detected in inputs: ${entry.id}`);
    }
    rawIdSet.add(entry.id);
  }

  if (skeletonEvidence) {
    assertValidSkeletonEvidence(skeletonEvidence);
  }

  const allRawEntries = [...rawEntries];

  const findings: AdapterFinding[] = [];
  let hasBlockingIntegrityFinding = false;

  // 2. Helper generator for deterministic finding/review IDs
  const makeFindingId = (code: AdapterFindingCode, rawEntryIds: string[]): string => {
    if (rawEntryIds.length === 0) {
      return `${rawProject.id}:${code}:project`;
    }
    const sorted = [...rawEntryIds].sort();
    return `${rawProject.id}:${code}:${sorted.join(',')}`;
  };

  const addFinding = (
    code: AdapterFindingCode,
    severity: 'WARNING' | 'ERROR' | 'INFO',
    rawEntryIds: string[],
    params?: Record<string, string | number>
  ) => {
    const findingId = makeFindingId(code, rawEntryIds);
    findings.push({
      findingId,
      code,
      severity,
      rawEntryIds,
      params
    });
    if (severity === 'ERROR') {
      hasBlockingIntegrityFinding = true;
    }
  };

  // Rule 1: Empty Project Verification
  if (rawEntries.length === 0) {
    const preliminaryEmptyView: CanonicalLfaView = {
      rawProject,
      allRawEntries,
      goal: null,
      purpose: null,
      outcomes: [],
      outputs: [],
      activities: [],
      unusedOutcomes: [],
      unassignedOutputs: [],
      orphanedActivities: [],
      presentationMode: 'EMPTY',
      structuralStatus: 'EMPTY',
      measurementStatus: 'UNKNOWN',
      findings: [],
      reviewQueue: [],
      dispositionMap: {},
      hasBlockingIntegrityFinding: false
    };

    const emptyQualityAssessment = evaluateLfaQuality(preliminaryEmptyView, rawProject.beneficiary_description);

    const emptyView: CanonicalLfaView = {
      ...preliminaryEmptyView,
      qualityAssessment: emptyQualityAssessment
    };

    Object.freeze(allRawEntries);
    Object.freeze(emptyView.outcomes);
    Object.freeze(emptyView.outputs);
    Object.freeze(emptyView.activities);
    Object.freeze(emptyView.unusedOutcomes);
    Object.freeze(emptyView.unassignedOutputs);
    Object.freeze(emptyView.orphanedActivities);
    Object.freeze(emptyView.findings);
    Object.freeze(emptyView.reviewQueue);
    return Object.freeze(emptyView);
  }

  // Rule 2: Broken Source Link Analysis
  if (rawProject.linked_grant_id && (!grantLinkEvidence || !grantLinkEvidence.resolves)) {
    addFinding('BROKEN_SOURCE_LINK', 'WARNING', []);
  }

  // Build lookup maps
  const entryMap = new Map<string, RawLfaEntry>();
  rawEntries.forEach((e) => entryMap.set(e.id, e));

  // Rule 0: Tenant boundary & self-referencing check
  const validParentMap = new Map<string, string | null>(); // Maps child ID to isolated parent ID (null if invalid)
  const boundaryInvalidEntryIds = new Set<string>(); // H3: Track boundary-invalid rows for quarantine
  
  rawEntries.forEach((entry) => {
    validParentMap.set(entry.id, entry.parent_id || null);

    if (entry.project_id !== rawProject.id) {
      addFinding('CROSS_PROJECT_PARENT', 'ERROR', [entry.id]);
      boundaryInvalidEntryIds.add(entry.id);
      validParentMap.set(entry.id, null);
    }
    if (entry.org_id !== rawProject.org_id) {
      addFinding('CROSS_TENANT_PARENT', 'ERROR', [entry.id]);
      boundaryInvalidEntryIds.add(entry.id);
      validParentMap.set(entry.id, null);
    }
    if (entry.parent_id === entry.id) {
      addFinding('SELF_REFERENCING_PARENT', 'ERROR', [entry.id]);
      validParentMap.set(entry.id, null);
    }
  });

  // Verify missing and wrong-level parents (H3: also check boundary validity)
  rawEntries.forEach((entry) => {
    const parentId = validParentMap.get(entry.id);
    if (parentId) {
      const parent = entryMap.get(parentId);
      // H3: Check if parent is boundary-invalid; if so, treat as MISSING_PARENT
      if (!parent || boundaryInvalidEntryIds.has(parentId)) {
        addFinding('MISSING_PARENT', 'WARNING', [entry.id], { parentId });
        validParentMap.set(entry.id, null);
      } else {
        if (entry.level === 'output') {
          if (parent.level !== 'purpose') {
            addFinding('WRONG_LEVEL_PARENT', 'WARNING', [entry.id], {
              parentLevel: parent.level,
              expectedLevel: 'purpose'
            });
            validParentMap.set(entry.id, null);
          }
        } else if (entry.level === 'activity' && parent.level !== 'output') {
          addFinding('WRONG_LEVEL_PARENT', 'WARNING', [entry.id], {
            parentLevel: parent.level,
            expectedLevel: 'output'
          });
          validParentMap.set(entry.id, null);
        }
      }
    }
  });

  // Pre-Correlation Maps (H3: Filter out boundary-invalid correlations)
  const correlatedNodeByRawId = new Map<string, StructuralSkeletonNode>();
  const correlatedNodeBySourceId = new Map<string, StructuralSkeletonNode>();
  
  if (skeletonEvidence && skeletonEvidence.correlationStatus === 'AVAILABLE') {
    const allSkeletonNodes = [
      skeletonEvidence.goalNode,
      skeletonEvidence.purposeNode,
      ...skeletonEvidence.outcomeNodes,
      ...skeletonEvidence.outputNodes,
      ...skeletonEvidence.activityNodes
    ].filter(Boolean) as StructuralSkeletonNode[];

    allSkeletonNodes.forEach((node) => {
      if (node.sourceNodeId) {
        correlatedNodeBySourceId.set(node.sourceNodeId, node);
      }
      // H3: Only map correlations if the raw entry is boundary-valid
      if (node.correlatedRawEntryId && !boundaryInvalidEntryIds.has(node.correlatedRawEntryId)) {
        correlatedNodeByRawId.set(node.correlatedRawEntryId, node);
      }
    });

    if (skeletonEvidence.isCurrent === false) {
      addFinding('SKELETON_NOT_CURRENT', 'WARNING', []);
    }
  }

  // H3: Create boundary-valid entries view for trusted semantic processing
  const boundaryValidEntries = rawEntries.filter((e) => !boundaryInvalidEntryIds.has(e.id));

  // Rule 3: Goal/Purpose Detection (H3: Use boundary-valid entries only)
  const goalRows = boundaryValidEntries.filter((e) => e.level === 'goal');
  const primaryPurposeRows = boundaryValidEntries.filter((e) => e.level === 'purpose' && (e.sequence === 1 || !e.sequence));

  if (goalRows.length > 1) {
    addFinding('MULTIPLE_GOAL_CANDIDATES', 'WARNING', goalRows.map((g) => g.id));
  }
  if (primaryPurposeRows.length > 1) {
    addFinding('MULTIPLE_PURPOSE_CANDIDATES', 'WARNING', primaryPurposeRows.map((p) => p.id));
  }

  // Build canonical collection lists
  const goalNodes: CanonicalNodeView[] = [];
  const purposeNodes: CanonicalNodeView[] = [];
  const outcomeNodes: CanonicalNodeView[] = [];
  const outputNodes: CanonicalNodeView[] = [];
  const activityNodes: CanonicalNodeView[] = [];
  
  const unusedOutcomes: CanonicalNodeView[] = [];
  const unassignedOutputs: CanonicalNodeView[] = [];
  const orphanedActivities: CanonicalNodeView[] = [];

  const dispositionMap: Record<string, RawEntryDisposition> = {};
  const classificationMap = new Map<string, ClassificationState>();

  // Map each RawEntry to CanonicalNodeView
  rawEntries.forEach((entry) => {
    // H3: Early quarantine check - boundary-invalid rows do not become canonical nodes
    if (boundaryInvalidEntryIds.has(entry.id)) {
      dispositionMap[entry.id] = 'REVIEW_ONLY';
      return; // Skip all further processing for this row
    }

    let interpretedType: InterpretedNodeType = entry.level;
    let classification: ClassificationState = 'CONFIRMED_GOAL';
    let confidence: AdapterConfidenceTier = 'C';
    let source: AdapterEvidenceCode = 'sequence_fallback';
    let precedenceLevel = 5;
    let disposition: RawEntryDisposition = 'CANONICAL_NODE';

    const parentId = validParentMap.get(entry.id) || null;
    const parentNode = parentId ? entryMap.get(parentId) : null;

    let parentRef: CanonicalParentRef | null = null;
    if (parentNode) {
      if (parentNode.level === 'activity') {
        throw new Error('Invalid hierarchy: Activity cannot be a parent.');
      }
      parentRef = {
        viewNodeId: `raw:${parentNode.id}`,
        nodeType: parentNode.level as 'goal' | 'purpose' | 'outcome' | 'output'
      };
    }

    // Check correlation first
    const correlatedNode = correlatedNodeByRawId.get(entry.id);
    const sourceExternalId = correlatedNode?.sourceNodeId;
    const correlationStatus: SourceCorrelationStatus = correlatedNode
      ? 'CONFIRMED_STRUCTURAL'
      : skeletonEvidence
      ? 'UNRESOLVED'
      : 'INFERRED_STRUCTURAL';

    if (correlatedNode) {
      confidence = 'A';
      source = 'skeleton_correlation';
      precedenceLevel = 2;
      
      const declType = correlatedNode.declaredNodeType;
      if (declType === 'goal') {
        interpretedType = 'goal';
        classification = 'CONFIRMED_GOAL';
      } else if (declType === 'purpose') {
        interpretedType = 'purpose';
        classification = 'CONFIRMED_PURPOSE';
      } else if (declType === 'outcome') {
        interpretedType = 'outcome';
        classification = 'CONFIRMED_OUTCOME';
      } else if (declType === 'output') {
        interpretedType = 'output';
        classification = 'CONFIRMED_OUTPUT';
        if (!entry.parent_id) {
          classification = 'LEGACY_UNASSIGNED_OUTPUT';
          disposition = 'UNASSIGNED';
          addFinding('UNASSIGNED_OUTPUT', 'WARNING', [entry.id]);
        } else if (!parentRef) {
          classification = 'INVALID_OUTPUT_PARENT';
          disposition = 'INVALID_PARENT';
        }
      } else if (declType === 'activity') {
        interpretedType = 'activity';
        classification = 'CONFIRMED_ACTIVITY';
        if (!entry.parent_id || !parentRef) {
          classification = 'INVALID_ACTIVITY_PARENT';
          disposition = 'INVALID_PARENT';
        }
      }
    } else {
      // Inferred/Duplicate cases
      if (entry.level === 'goal') {
        interpretedType = 'goal';
        classification = goalRows.length === 1 ? 'INFERRED_GOAL_CANDIDATE' : 'DUPLICATE_GOAL_CANDIDATE';
        confidence = goalRows.length === 1 ? 'B' : 'C';
        source = 'cardinality';
        precedenceLevel = 4;
        if (goalRows.length > 1) {
          disposition = 'DUPLICATE_CANDIDATE';
        }
      } else if (entry.level === 'purpose') {
        if (entry.sequence === 1 || !entry.sequence) {
          interpretedType = 'purpose';
          classification = primaryPurposeRows.length === 1 ? 'INFERRED_PURPOSE_CANDIDATE' : 'DUPLICATE_PURPOSE_CANDIDATE';
          confidence = primaryPurposeRows.length === 1 ? 'B' : 'C';
          source = 'cardinality';
          precedenceLevel = 4;
          if (primaryPurposeRows.length > 1) {
            disposition = 'DUPLICATE_CANDIDATE';
          }
        } else {
          interpretedType = 'outcome';
          // H3: Use boundaryValidEntries for cardinality checks
          const hasChildren = boundaryValidEntries.some((child) => child.level === 'output' && child.parent_id === entry.id);
          if (hasChildren) {
            classification = 'INFERRED_OUTCOME_CANDIDATE';
            confidence = 'B';
            source = 'database_graph';
            precedenceLevel = 3;
          } else {
            classification = 'AMBIGUOUS_RESULT';
            confidence = 'C';
            source = 'sequence_fallback';
            precedenceLevel = 5;
            disposition = 'AMBIGUOUS_PRESERVED';
            addFinding('AMBIGUOUS_ADDITIONAL_PURPOSE', 'WARNING', [entry.id]);
          }
        }
      } else if (entry.level === 'output') {
        interpretedType = 'output';
        classification = 'CONFIRMED_OUTPUT';
        confidence = 'B';
        source = 'database_graph';
        precedenceLevel = 3;

        if (!entry.parent_id) {
          classification = 'LEGACY_UNASSIGNED_OUTPUT';
          disposition = 'UNASSIGNED';
          addFinding('UNASSIGNED_OUTPUT', 'WARNING', [entry.id]);
        } else if (!parentRef) {
          classification = 'INVALID_OUTPUT_PARENT';
          disposition = 'INVALID_PARENT';
        }
      } else if (entry.level === 'activity') {
        interpretedType = 'activity';
        classification = 'CONFIRMED_ACTIVITY';
        confidence = 'B';
        source = 'database_graph';
        precedenceLevel = 3;

        if (!entry.parent_id || !parentRef) {
          classification = 'INVALID_ACTIVITY_PARENT';
          disposition = 'INVALID_PARENT';
        }
      }
    }

    classificationMap.set(entry.id, classification);

    const nodeView: CanonicalNodeView = {
      viewNodeId: `raw:${entry.id}`,
      rawEntryId: entry.id,
      sourceExternalId,
      sourceCorrelationStatus: correlationStatus,
      declaredStorageLevel: entry.level,
      interpretedNodeType: interpretedType,
      classificationState: classification,
      confidenceTier: confidence,
      parentRef,
      rawSequence: entry.sequence || 1,
      statement: entry.description || '',
      legacyIndicatorText: entry.indicator || null,
      legacyMeansOfVerificationText: entry.means_of_verification || null,
      legacyAssumptionText: entry.assumption || null,
      legacyResponsiblePartyText: entry.responsible_party || null,
      timelineStart: entry.timeline_start || null,
      timelineEnd: entry.timeline_end || null,
      evidence: {
        precedenceLevel,
        source
      },
      disposition
    };

    dispositionMap[entry.id] = disposition;

    // Put in collections
    if (disposition === 'UNASSIGNED' || disposition === 'INVALID_PARENT') {
      if (interpretedType === 'output') {
        unassignedOutputs.push(nodeView);
      } else if (interpretedType === 'activity') {
        orphanedActivities.push(nodeView);
      }
    } else {
      if (interpretedType === 'goal') {
        goalNodes.push(nodeView);
      } else if (interpretedType === 'purpose') {
        purposeNodes.push(nodeView);
      } else if (interpretedType === 'outcome') {
        outcomeNodes.push(nodeView);
      } else if (interpretedType === 'output') {
        outputNodes.push(nodeView);
      } else if (interpretedType === 'activity') {
        activityNodes.push(nodeView);
      }
    }
  });

  // Check for unused outcomes declared in the skeleton
  // H3: Only boundary-valid raw entries count as trusted usage evidence
  // H4: A skeleton outcome is USED only when its correlated raw outcome has at least one valid trusted output child
  if (skeletonEvidence && skeletonEvidence.correlationStatus === 'AVAILABLE') {
    skeletonEvidence.outcomeNodes.forEach((skOut) => {
      // H4: Resolve correlated raw outcome ID
      const correlatedRawOutcomeId = skOut.correlatedRawEntryId;

      // H4: Determine whether this skeleton outcome has at least one valid trusted output child
      let isUsed = false;
      if (
        correlatedRawOutcomeId &&
        !boundaryInvalidEntryIds.has(correlatedRawOutcomeId)
      ) {
        // The correlated raw row must exist in raw entries (not dangling)
        const correlatedRawExists = boundaryValidEntries.some((e) => e.id === correlatedRawOutcomeId);
        if (correlatedRawExists) {
          // A valid trusted output child: boundary-valid output whose validParentMap parent is this outcome
          isUsed = boundaryValidEntries.some(
            (e) => e.level === 'output' && validParentMap.get(e.id) === correlatedRawOutcomeId
          );
        }
      }

      if (!isUsed) {
        const findingId = makeFindingId('UNUSED_SKELETON_OUTCOME', [skOut.sourceNodeId]);
        
        // Check if there is an UNUSED_SKELETON_OUTCOME finding already
        const hasFinding = findings.some((f) => f.findingId === findingId);
        if (!hasFinding) {
          findings.push({
            findingId,
            code: 'UNUSED_SKELETON_OUTCOME',
            severity: 'WARNING',
            rawEntryIds: [skOut.sourceNodeId]
          });
        }

        unusedOutcomes.push({
          viewNodeId: `sk:${skOut.sourceNodeId}`,
          rawEntryId: null,
          sourceExternalId: skOut.sourceNodeId,
          sourceCorrelationStatus: 'CONFIRMED_STRUCTURAL',
          declaredStorageLevel: 'purpose',
          interpretedNodeType: 'outcome',
          classificationState: 'UNUSED_SKELETON_OUTCOME',
          confidenceTier: 'A',
          parentRef: null,
          rawSequence: skOut.sequencePosition,
          statement: '(Outcome belum memiliki Output)',
          legacyIndicatorText: null,
          legacyMeansOfVerificationText: null,
          legacyAssumptionText: null,
          legacyResponsiblePartyText: null,
          timelineStart: null,
          timelineEnd: null,
          evidence: {
            precedenceLevel: 2,
            source: 'skeleton_correlation'
          },
          disposition: 'REVIEW_ONLY'
        });
      }
    });
  }

  // Derive PresentationMode
  let presentationMode: PresentationMode = 'COMPACT_CONFIRMED';
  const hasDuplicateGoal = goalRows.length > 1;
  const hasDuplicatePurpose = primaryPurposeRows.length > 1;
  const hasInferredOutcome = outcomeNodes.some(o => o.classificationState === 'INFERRED_OUTCOME_CANDIDATE');
  const hasAmbiguousResult = outcomeNodes.some(o => o.classificationState === 'AMBIGUOUS_RESULT');

  const isExpandedBySkeleton = skeletonEvidence && skeletonEvidence.correlationStatus === 'AVAILABLE' && skeletonEvidence.outcomeNodes.length > 0;
  const isExpanded = isExpandedBySkeleton || outcomeNodes.length > 0;

  if (hasDuplicateGoal || hasDuplicatePurpose || hasBlockingIntegrityFinding || hasInferredOutcome || hasAmbiguousResult) {
    presentationMode = 'AMBIGUOUS';
  } else if (isExpanded) {
    if (unusedOutcomes.length > 0) {
      presentationMode = 'EXPANDED_WITH_UNUSED_OUTCOME';
    } else {
      presentationMode = 'EXPANDED_CONFIRMED';
    }
  } else if (unassignedOutputs.length > 0) {
    presentationMode = 'COMPACT_WITH_UNASSIGNED_OUTPUT';
  } else {
    presentationMode = 'COMPACT_CONFIRMED';
  }

  // Derive StructuralStatus
  let structuralStatus: StructuralStatus = 'COMPLETE';

  const goal = goalNodes[0] || null;
  const purpose = purposeNodes[0] || null;

  if (hasBlockingIntegrityFinding) {
    structuralStatus = 'BLOCKED';
  } else if (presentationMode === 'AMBIGUOUS') {
    structuralStatus = 'AMBIGUOUS';
  } else if (!goal || !purpose || outputNodes.length === 0 || activityNodes.length === 0) {
    structuralStatus = 'INCOMPLETE';
  } else if (unusedOutcomes.length > 0 || unassignedOutputs.length > 0) {
    structuralStatus = 'INCOMPLETE';
  }

  // Derive MeasurementStatus
  let measurementStatus: MeasurementStatus;
  if (structuralStatus !== 'COMPLETE') {
    measurementStatus = 'UNKNOWN';
  } else {
    const results = [goal, purpose, ...outcomeNodes, ...outputNodes].filter(Boolean) as CanonicalNodeView[];
    const hasBlankFields = results.some((r) => !r.legacyIndicatorText?.trim() || !r.legacyMeansOfVerificationText?.trim());
    measurementStatus = hasBlankFields ? 'INCOMPLETE' : 'LEGACY_TEXT_PRESENT';
  }

  // Generate Review Queue
  const isOutcomeScopedPurposeClassification = (classification: ClassificationState): boolean => {
    return (
      classification === 'CONFIRMED_OUTCOME' ||
      classification === 'INFERRED_OUTCOME_CANDIDATE' ||
      classification === 'UNUSED_SKELETON_OUTCOME' ||
      classification === 'AMBIGUOUS_RESULT'
    );
  };

  const deriveScopeTypeForRawEntry = (
    entry: RawLfaEntry,
    classification: ClassificationState
  ): InterpretedNodeType => {
    if (entry.level === 'goal') {
      return 'goal';
    }
    if (entry.level === 'purpose') {
      return isOutcomeScopedPurposeClassification(classification) ? 'outcome' : 'purpose';
    }
    if (entry.level === 'output') {
      return 'output';
    }
    return 'activity';
  };

  const getDeterministicFirstRawEntryId = (rawEntryIds: readonly string[]): string | null => {
    const normalized = rawEntryIds.filter((id) => id.length > 0);
    if (normalized.length === 0) {
      return null;
    }
    return [...normalized].sort()[0];
  };

  const makeReviewItem = (
    finding: AdapterFinding,
    scopeType: InterpretedNodeType,
    scopeId: string,
    classification: ClassificationState,
    recommendedUserAction: AdapterReviewActionCode,
    confidence: 'HIGH' | 'MEDIUM' | 'LOW',
    evidenceTier: AdapterConfidenceTier,
    blockingStatus: boolean
  ): AdapterReviewItem => {
    return {
      findingId: finding.findingId,
      projectId: rawProject.id,
      scopeType,
      scopeId,
      classification,
      confidence,
      evidenceTier,
      evidenceReasons: [`finding:${finding.code}`],
      blockingStatus,
      recommendedUserAction,
      rawEntryIds: finding.rawEntryIds,
      createdAt: rawProject.created_at || ''
    };
  };

  const mapFindingToReviewItem = (finding: AdapterFinding): AdapterReviewItem | null => {
    switch (finding.code) {
      case 'MULTIPLE_GOAL_CANDIDATES': {
        const scopeId = getDeterministicFirstRawEntryId(finding.rawEntryIds);
        if (!scopeId) {
          return null;
        }
        return makeReviewItem(
          finding,
          'goal',
          scopeId,
          'DUPLICATE_GOAL_CANDIDATE',
          'REVIEW_DUPLICATE_GOAL',
          'LOW',
          'C',
          true
        );
      }

      case 'MULTIPLE_PURPOSE_CANDIDATES': {
        const scopeId = getDeterministicFirstRawEntryId(finding.rawEntryIds);
        if (!scopeId) {
          return null;
        }
        return makeReviewItem(
          finding,
          'purpose',
          scopeId,
          'DUPLICATE_PURPOSE_CANDIDATE',
          'REVIEW_DUPLICATE_PURPOSE',
          'LOW',
          'C',
          true
        );
      }

      case 'AMBIGUOUS_ADDITIONAL_PURPOSE': {
        const scopeId = getDeterministicFirstRawEntryId(finding.rawEntryIds);
        if (!scopeId) {
          return null;
        }
        return makeReviewItem(
          finding,
          'outcome',
          scopeId,
          'AMBIGUOUS_RESULT',
          'REVIEW_AMBIGUOUS_RESULT',
          'LOW',
          'C',
          finding.severity === 'ERROR'
        );
      }

      case 'UNASSIGNED_OUTPUT': {
        const scopeId = getDeterministicFirstRawEntryId(finding.rawEntryIds);
        if (!scopeId) {
          return null;
        }
        const classification = classificationMap.get(scopeId) || 'LEGACY_UNASSIGNED_OUTPUT';
        return makeReviewItem(
          finding,
          'output',
          scopeId,
          classification,
          'REVIEW_UNASSIGNED_OUTPUT',
          'LOW',
          'C',
          finding.severity === 'ERROR'
        );
      }

      case 'MISSING_PARENT':
      case 'WRONG_LEVEL_PARENT': {
        const scopeId = getDeterministicFirstRawEntryId(finding.rawEntryIds);
        if (!scopeId) {
          return null;
        }
        const entry = entryMap.get(scopeId);
        const classification = classificationMap.get(scopeId);
        if (!entry || !classification) {
          return null;
        }
        const scopeType = deriveScopeTypeForRawEntry(entry, classification);
        if (scopeType !== 'output' && scopeType !== 'activity') {
          return null;
        }
        return makeReviewItem(
          finding,
          scopeType,
          scopeId,
          classification,
          'REVIEW_INVALID_PARENT',
          'LOW',
          'C',
          finding.severity === 'ERROR'
        );
      }

      case 'SELF_REFERENCING_PARENT': {
        const scopeId = getDeterministicFirstRawEntryId(finding.rawEntryIds);
        if (!scopeId) {
          return null;
        }
        const entry = entryMap.get(scopeId);
        const classification = classificationMap.get(scopeId);
        if (!entry || !classification) {
          return null;
        }
        return makeReviewItem(
          finding,
          deriveScopeTypeForRawEntry(entry, classification),
          scopeId,
          classification,
          'REVIEW_INVALID_PARENT',
          'LOW',
          'C',
          finding.severity === 'ERROR'
        );
      }

      case 'UNUSED_SKELETON_OUTCOME': {
        const scopeId = getDeterministicFirstRawEntryId(finding.rawEntryIds);
        if (!scopeId) {
          return null;
        }
        return makeReviewItem(
          finding,
          'outcome',
          scopeId,
          'UNUSED_SKELETON_OUTCOME',
          'REVIEW_UNUSED_OUTCOME',
          'HIGH',
          'A',
          false
        );
      }

      case 'BROKEN_SOURCE_LINK':
      case 'SKELETON_NOT_CURRENT':
      case 'CROSS_PROJECT_PARENT':
      case 'CROSS_TENANT_PARENT':
        return null;

      default: {
        const exhaustiveCheck: never = finding.code;
        return exhaustiveCheck;
      }
    }
  };

  const reviewQueue: AdapterReviewItem[] = [];
  findings.forEach((finding) => {
    const item = mapFindingToReviewItem(finding);
    if (item) {
      reviewQueue.push(item);
    }
  });

  // 9. Row Accounting Invariant Verification Check
  const dispositionIds = Object.keys(dispositionMap);
  if (dispositionIds.length !== rawEntries.length) {
    throw new Error(`Row accounting mismatch: entries count = ${rawEntries.length}, dispositions count = ${dispositionIds.length}`);
  }
  for (const entry of rawEntries) {
    if (!dispositionMap[entry.id]) {
      throw new Error(`Missing disposition for raw entry ID: ${entry.id}`);
    }
  }

  // 10. Construct View and Apply Explicit Freeze Targets
  const preliminaryView: CanonicalLfaView = {
    rawProject,
    allRawEntries,
    goal,
    purpose,
    outcomes: outcomeNodes,
    outputs: outputNodes,
    activities: activityNodes,
    unusedOutcomes,
    unassignedOutputs,
    orphanedActivities: orphanedActivities,
    presentationMode,
    structuralStatus,
    measurementStatus,
    findings,
    reviewQueue,
    dispositionMap,
    hasBlockingIntegrityFinding
  };

  let qualityAssessment;
  try {
    qualityAssessment = evaluateLfaQuality(preliminaryView, rawProject.beneficiary_description);
  } catch (_e) {
    qualityAssessment = undefined;
  }

  const canonicalView: CanonicalLfaView = {
    ...preliminaryView,
    qualityAssessment
  };


  Object.freeze(allRawEntries);
  Object.freeze(outcomeNodes);
  Object.freeze(outputNodes);
  Object.freeze(activityNodes);
  Object.freeze(unusedOutcomes);
  Object.freeze(unassignedOutputs);
  Object.freeze(orphanedActivities);
  Object.freeze(findings);
  Object.freeze(reviewQueue);

  return Object.freeze(canonicalView);
}

/**
 * Direct flat node extraction helpers for CanonicalProposalPayloadV2
 */
export function extractCanonicalOutputs(proposal: CanonicalProposalPayloadV2): CanonicalOutputV2[] {
  return (proposal.outcomes || []).flatMap((outcome) => outcome.outputs || []);
}

export function extractCanonicalActivities(proposal: CanonicalProposalPayloadV2): CanonicalActivityV2[] {
  return extractCanonicalOutputs(proposal).flatMap((output) => output.activities || []);
}

export function extractCanonicalIndicators(proposal: CanonicalProposalPayloadV2): IndicatorV2[] {
  const outcomeIndicators = (proposal.outcomes || []).flatMap((outcome) => outcome.indicators || []);
  const outputIndicators = extractCanonicalOutputs(proposal).flatMap((output) => output.indicators || []);
  return [...outcomeIndicators, ...outputIndicators];
}

export function extractCanonicalCostDrivers(proposal: CanonicalProposalPayloadV2): CostDriverV2[] {
  return extractCanonicalActivities(proposal).flatMap((activity) => activity.cost_drivers || []);
}

/**
 * Map CanonicalProposalPayloadV2 directly into RawLfaEntry[] for database transport/persistence.
 */
export function mapCanonicalProposalToRawEntries(
  proposal: CanonicalProposalPayloadV2
): RawLfaEntry[] {
  const entries: RawLfaEntry[] = [];
  const projectId = proposal.project_id;
  const orgId = proposal.organization_id;

  // 1. Goal Node
  const goalId = `goal_${projectId}`;
  entries.push({
    id: goalId,
    project_id: projectId,
    org_id: orgId,
    level: 'goal',
    sequence: 1,
    parent_id: null,
    description: proposal.metadata?.title || 'Program Goal',
    indicator: null,
    means_of_verification: null,
    assumption: null,
    responsible_party: null
  });

  // 2. Primary Purpose Node
  const purposeId = `purpose_${projectId}`;
  entries.push({
    id: purposeId,
    project_id: projectId,
    org_id: orgId,
    level: 'purpose',
    sequence: 1,
    parent_id: goalId,
    description: `${proposal.metadata?.title || 'Program Purpose'} (${proposal.metadata?.geography || 'Indonesia'})`,
    indicator: null,
    means_of_verification: null,
    assumption: null,
    responsible_party: null
  });

  // 3. Outcomes (as purpose level entries in raw storage, sequence >= 2)
  (proposal.outcomes || []).forEach((outcome, oIdx) => {
    const indicatorText = (outcome.indicators || [])
      .map((ind) => `${ind.code}: ${ind.indicator_name} (Target: ${ind.target_value} ${ind.unit_of_measure})`)
      .join('; ');
    const movText = (outcome.indicators || [])
      .map((ind) => ind.data_source)
      .filter(Boolean)
      .join('; ');

    entries.push({
      id: outcome.id,
      project_id: projectId,
      org_id: orgId,
      level: 'purpose',
      sequence: oIdx + 2,
      parent_id: purposeId,
      description: `${outcome.code}: ${outcome.outcome_name} - ${outcome.description}`,
      indicator: indicatorText || null,
      means_of_verification: movText || null,
      assumption: null,
      responsible_party: null
    });

    // 4. Outputs
    (outcome.outputs || []).forEach((output, opIdx) => {
      const opIndicatorText = (output.indicators || [])
        .map((ind) => `${ind.code}: ${ind.indicator_name} (Target: ${ind.target_value} ${ind.unit_of_measure})`)
        .join('; ');
      const opMovText = (output.indicators || [])
        .map((ind) => ind.data_source)
        .filter(Boolean)
        .join('; ');

      entries.push({
        id: output.id,
        project_id: projectId,
        org_id: orgId,
        level: 'output',
        sequence: opIdx + 1,
        parent_id: output.parent_outcome_id,
        description: `${output.code}: ${output.output_name} - ${output.description}`,
        indicator: opIndicatorText || null,
        means_of_verification: opMovText || null,
        assumption: null,
        responsible_party: null
      });

      // 5. Activities
      (output.activities || []).forEach((act, actIdx) => {
        const costDriverSummary = (act.cost_drivers || [])
          .map((cd) => `${cd.code}: ${cd.resource_name} (${cd.quantity} ${cd.unit})`)
          .join('; ');

        entries.push({
          id: act.id,
          project_id: projectId,
          org_id: orgId,
          level: 'activity',
          sequence: actIdx + 1,
          parent_id: act.parent_output_id,
          description: `${act.code}: ${act.activity_name} - ${act.description}`,
          indicator: null,
          means_of_verification: null,
          assumption: null,
          responsible_party: costDriverSummary || null
        });
      });
    });
  });

  return entries;
}

/**
 * Cutover Materializer: Directly materializes CanonicalProposalPayloadV2 into CanonicalLfaView.
 * Thin transport layer with zero reasoning, zero inference, and zero synthetic node generation.
 */
export function materializeCanonicalProposalToLfaView(
  proposal: CanonicalProposalPayloadV2
): CanonicalLfaView {
  const rawProject = {
    id: proposal.project_id,
    org_id: proposal.organization_id,
    name: proposal.metadata?.title || 'Program',
    location: proposal.metadata?.geography || '',
    duration_months: proposal.metadata?.duration_months || 12,
    beneficiary_count: proposal.metadata?.beneficiary_count || 0,
    status: 'ACTIVE'
  };

  const rawEntries = mapCanonicalProposalToRawEntries(proposal);

  const goalId = `goal_${proposal.project_id}`;
  const purposeId = `purpose_${proposal.project_id}`;

  const goalNode: CanonicalNodeView = {
    viewNodeId: `raw:${goalId}`,
    rawEntryId: goalId,
    sourceExternalId: goalId,
    sourceCorrelationStatus: 'CONFIRMED_STRUCTURAL',
    declaredStorageLevel: 'goal',
    interpretedNodeType: 'goal',
    classificationState: 'CONFIRMED_GOAL',
    confidenceTier: 'A',
    parentRef: null,
    rawSequence: 1,
    statement: proposal.metadata?.title || 'Program Goal',
    legacyIndicatorText: null,
    legacyMeansOfVerificationText: null,
    legacyAssumptionText: null,
    legacyResponsiblePartyText: null,
    timelineStart: null,
    timelineEnd: null,
    evidence: { precedenceLevel: 1, source: 'persisted_canonical' },
    disposition: 'CANONICAL_NODE'
  };

  const purposeNode: CanonicalNodeView = {
    viewNodeId: `raw:${purposeId}`,
    rawEntryId: purposeId,
    sourceExternalId: purposeId,
    sourceCorrelationStatus: 'CONFIRMED_STRUCTURAL',
    declaredStorageLevel: 'purpose',
    interpretedNodeType: 'purpose',
    classificationState: 'CONFIRMED_PURPOSE',
    confidenceTier: 'A',
    parentRef: { viewNodeId: `raw:${goalId}`, nodeType: 'goal' },
    rawSequence: 1,
    statement: `${proposal.metadata?.title || 'Program Purpose'} (${proposal.metadata?.geography || 'Indonesia'})`,
    legacyIndicatorText: null,
    legacyMeansOfVerificationText: null,
    legacyAssumptionText: null,
    legacyResponsiblePartyText: null,
    timelineStart: null,
    timelineEnd: null,
    evidence: { precedenceLevel: 1, source: 'persisted_canonical' },
    disposition: 'CANONICAL_NODE'
  };

  const outcomeNodes: CanonicalNodeView[] = (proposal.outcomes || []).map((o, idx) => ({
    viewNodeId: `raw:${o.id}`,
    rawEntryId: o.id,
    sourceExternalId: o.id,
    sourceCorrelationStatus: 'CONFIRMED_STRUCTURAL',
    declaredStorageLevel: 'purpose',
    interpretedNodeType: 'outcome',
    classificationState: 'CONFIRMED_OUTCOME',
    confidenceTier: 'A',
    parentRef: { viewNodeId: `raw:${purposeId}`, nodeType: 'purpose' },
    rawSequence: idx + 1,
    statement: `${o.code}: ${o.outcome_name} - ${o.description}`,
    legacyIndicatorText: (o.indicators || []).map((i) => `${i.code}: ${i.indicator_name}`).join('; ') || null,
    legacyMeansOfVerificationText: (o.indicators || []).map((i) => i.data_source).filter(Boolean).join('; ') || null,
    legacyAssumptionText: null,
    legacyResponsiblePartyText: null,
    timelineStart: null,
    timelineEnd: null,
    evidence: { precedenceLevel: 1, source: 'persisted_canonical' },
    disposition: 'CANONICAL_NODE'
  }));

  const allOutputs = extractCanonicalOutputs(proposal);
  const outputNodes: CanonicalNodeView[] = allOutputs.map((op, idx) => ({
    viewNodeId: `raw:${op.id}`,
    rawEntryId: op.id,
    sourceExternalId: op.id,
    sourceCorrelationStatus: 'CONFIRMED_STRUCTURAL',
    declaredStorageLevel: 'output',
    interpretedNodeType: 'output',
    classificationState: 'CONFIRMED_OUTPUT',
    confidenceTier: 'A',
    parentRef: { viewNodeId: `raw:${op.parent_outcome_id}`, nodeType: 'outcome' },
    rawSequence: idx + 1,
    statement: `${op.code}: ${op.output_name} - ${op.description}`,
    legacyIndicatorText: (op.indicators || []).map((i) => `${i.code}: ${i.indicator_name}`).join('; ') || null,
    legacyMeansOfVerificationText: (op.indicators || []).map((i) => i.data_source).filter(Boolean).join('; ') || null,
    legacyAssumptionText: null,
    legacyResponsiblePartyText: null,
    timelineStart: null,
    timelineEnd: null,
    evidence: { precedenceLevel: 1, source: 'persisted_canonical' },
    disposition: 'CANONICAL_NODE'
  }));

  const allActivities = extractCanonicalActivities(proposal);
  const activityNodes: CanonicalNodeView[] = allActivities.map((act, idx) => ({
    viewNodeId: `raw:${act.id}`,
    rawEntryId: act.id,
    sourceExternalId: act.id,
    sourceCorrelationStatus: 'CONFIRMED_STRUCTURAL',
    declaredStorageLevel: 'activity',
    interpretedNodeType: 'activity',
    classificationState: 'CONFIRMED_ACTIVITY',
    confidenceTier: 'A',
    parentRef: { viewNodeId: `raw:${act.parent_output_id}`, nodeType: 'output' },
    rawSequence: idx + 1,
    statement: `${act.code}: ${act.activity_name} - ${act.description}`,
    legacyIndicatorText: null,
    legacyMeansOfVerificationText: null,
    legacyAssumptionText: null,
    legacyResponsiblePartyText: (act.cost_drivers || []).map((cd) => `${cd.code}: ${cd.resource_name}`).join('; ') || null,
    timelineStart: null,
    timelineEnd: null,
    evidence: { precedenceLevel: 1, source: 'persisted_canonical' },
    disposition: 'CANONICAL_NODE'
  }));

  const dispositionMap: Record<string, RawEntryDisposition> = {};
  rawEntries.forEach((e) => {
    dispositionMap[e.id] = 'CANONICAL_NODE';
  });

  const preliminaryView: CanonicalLfaView = {
    rawProject,
    allRawEntries: rawEntries,
    goal: goalNode,
    purpose: purposeNode,
    outcomes: outcomeNodes,
    outputs: outputNodes,
    activities: activityNodes,
    unusedOutcomes: [],
    unassignedOutputs: [],
    orphanedActivities: [],
    presentationMode: 'EXPANDED_CONFIRMED',
    structuralStatus: 'COMPLETE',
    measurementStatus: 'LEGACY_TEXT_PRESENT',
    findings: [],
    reviewQueue: [],
    dispositionMap,
    hasBlockingIntegrityFinding: false
  };

  const qualityAssessment = evaluateLfaQuality(preliminaryView, proposal.metadata?.title || '');

  return {
    ...preliminaryView,
    qualityAssessment
  };
}
