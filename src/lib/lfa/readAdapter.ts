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

export function assertValidSkeletonEvidence(
  evidence: ValidatedStructuralSkeletonEvidence
): void {
  if (!evidence) {
    throw new Error('Skeleton evidence is required when checking skeleton validity.');
  }
  if (!evidence.documentId) {
    throw new Error('documentId is missing in skeleton evidence.');
  }
  if (evidence.validationStatus !== 'VALIDATED_STRUCTURE') {
    throw new Error(`Invalid validation status: expected VALIDATED_STRUCTURE, got ${evidence.validationStatus}`);
  }
  if (!evidence.outcomeNodes || !Array.isArray(evidence.outcomeNodes)) {
    throw new Error('outcomeNodes must be a valid array.');
  }
  if (!evidence.outputNodes || !Array.isArray(evidence.outputNodes)) {
    throw new Error('outputNodes must be a valid array.');
  }
  if (!evidence.activityNodes || !Array.isArray(evidence.activityNodes)) {
    throw new Error('activityNodes must be a valid array.');
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
    const emptyView: CanonicalLfaView = {
      rawProject,
      allRawEntries: rawEntries,
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

    Object.freeze(emptyView.allRawEntries);
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

  // Skeleton validation check if present
  if (skeletonEvidence) {
    assertValidSkeletonEvidence(skeletonEvidence);
  }

  // Build lookup maps
  const entryMap = new Map<string, RawLfaEntry>();
  rawEntries.forEach((e) => entryMap.set(e.id, e));

  // Rule 0: Tenant boundary & self-referencing check
  const validParentMap = new Map<string, string | null>(); // Maps child ID to isolated parent ID (null if invalid)
  
  rawEntries.forEach((entry) => {
    validParentMap.set(entry.id, entry.parent_id || null);

    if (entry.project_id !== rawProject.id) {
      addFinding('CROSS_PROJECT_PARENT', 'ERROR', [entry.id]);
      validParentMap.set(entry.id, null);
    }
    if (entry.org_id !== rawProject.org_id) {
      addFinding('CROSS_TENANT_PARENT', 'ERROR', [entry.id]);
      validParentMap.set(entry.id, null);
    }
    if (entry.parent_id === entry.id) {
      addFinding('SELF_REFERENCING_PARENT', 'ERROR', [entry.id]);
      validParentMap.set(entry.id, null);
    }
  });

  // Verify missing and wrong-level parents
  rawEntries.forEach((entry) => {
    const parentId = validParentMap.get(entry.id);
    if (parentId) {
      const parent = entryMap.get(parentId);
      if (!parent) {
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

  // Pre-Correlation Maps
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
      if (node.correlatedRawEntryId) {
        correlatedNodeByRawId.set(node.correlatedRawEntryId, node);
      }
    });

    if (skeletonEvidence.isCurrent === false) {
      addFinding('SKELETON_NOT_CURRENT', 'WARNING', []);
    }
  }

  // Rule 3: Goal/Purpose Detection
  const goalRows = rawEntries.filter((e) => e.level === 'goal');
  const primaryPurposeRows = rawEntries.filter((e) => e.level === 'purpose' && (e.sequence === 1 || !e.sequence));

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
          const hasChildren = rawEntries.some((child) => child.level === 'output' && child.parent_id === entry.id);
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
  if (skeletonEvidence && skeletonEvidence.correlationStatus === 'AVAILABLE') {
    skeletonEvidence.outcomeNodes.forEach((skOut) => {
      const isUsed = rawEntries.some((e) => {
        const correlated = correlatedNodeByRawId.get(e.id);
        return correlated && correlated.sourceNodeId === skOut.sourceNodeId;
      });

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
          rawEntryId: '',
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
  let measurementStatus: MeasurementStatus = 'LEGACY_TEXT_PRESENT';
  if (structuralStatus === 'AMBIGUOUS' || structuralStatus === 'BLOCKED') {
    measurementStatus = 'UNKNOWN';
  } else {
    // Check if any results have blank indicators/MoVs
    const results = [goal, purpose, ...outcomeNodes, ...outputNodes].filter(Boolean) as CanonicalNodeView[];
    const hasBlankFields = results.some((r) => !r.legacyIndicatorText?.trim() || !r.legacyMeansOfVerificationText?.trim());
    if (hasBlankFields) {
      measurementStatus = 'INCOMPLETE';
    }
  }

  // Generate Review Queue
  const reviewQueue: AdapterReviewItem[] = [];
  findings.forEach((finding) => {
    let actionCode: AdapterReviewActionCode = 'REVIEW_UNASSIGNED_OUTPUT';
    let scopeType: InterpretedNodeType = 'output';
    let scopeId = '';

    if (finding.code === 'MULTIPLE_GOAL_CANDIDATES') {
      actionCode = 'REVIEW_DUPLICATE_GOAL';
      scopeType = 'goal';
    } else if (finding.code === 'MULTIPLE_PURPOSE_CANDIDATES') {
      actionCode = 'REVIEW_DUPLICATE_PURPOSE';
      scopeType = 'purpose';
    } else if (finding.code === 'AMBIGUOUS_ADDITIONAL_PURPOSE') {
      actionCode = 'REVIEW_AMBIGUOUS_RESULT';
      scopeType = 'outcome';
      scopeId = finding.rawEntryIds[0] || '';
    } else if (finding.code === 'UNUSED_SKELETON_OUTCOME') {
      actionCode = 'REVIEW_UNUSED_OUTCOME';
      scopeType = 'outcome';
      scopeId = finding.rawEntryIds[0] || '';
    } else if (
      finding.code === 'WRONG_LEVEL_PARENT' ||
      finding.code === 'MISSING_PARENT' ||
      finding.code === 'CROSS_PROJECT_PARENT' ||
      finding.code === 'CROSS_TENANT_PARENT' ||
      finding.code === 'SELF_REFERENCING_PARENT'
    ) {
      actionCode = 'REVIEW_INVALID_PARENT';
      scopeId = finding.rawEntryIds[0] || '';
    } else if (finding.code === 'BROKEN_SOURCE_LINK') {
      actionCode = 'REVIEW_BROKEN_SOURCE_LINK';
      scopeType = 'purpose';
    }

    const classification = scopeId
      ? (classificationMap.get(scopeId) || 'CONFIRMED_OUTPUT')
      : 'CONFIRMED_PURPOSE';

    reviewQueue.push({
      findingId: finding.findingId,
      projectId: rawProject.id,
      scopeType,
      scopeId,
      classification,
      confidence: 'LOW',
      evidenceTier: 'C',
      evidenceReasons: finding.rawEntryIds,
      blockingStatus: finding.severity === 'ERROR',
      recommendedUserAction: actionCode,
      rawEntryIds: finding.rawEntryIds,
      createdAt: rawProject.created_at || ''
    });
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
  const canonicalView: CanonicalLfaView = {
    rawProject,
    allRawEntries: rawEntries,
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

  Object.freeze(rawEntries);
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
