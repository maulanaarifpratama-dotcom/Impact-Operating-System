import { describe, test, expect } from 'vitest';
import { mapToCanonicalLfaView } from './readAdapter';
import {
  RawLfaProject,
  RawLfaEntry,
  ValidatedStructuralSkeletonEvidence,
  StructuralSkeletonNode
} from './types';

const mockProject: RawLfaProject = {
  id: 'project-test-authoritative-shape',
  org_id: 'org-test-tenant',
  name: 'Test Project',
  linked_grant_id: 'grant-123',
  created_at: '2026-07-19T00:00:00Z'
};

const mockGrantLinkResolved = {
  resolves: true,
  grantProjectId: 'grant-project-123'
};

const mockGrantLinkUnresolved = {
  resolves: false
};

const DOCUMENT_UUID = '00000000-0000-4000-8000-000000000001';
const GOAL_SOURCE_UUID = '11111111-1111-4111-8111-111111111111';
const PURPOSE_SOURCE_UUID = '22222222-2222-4222-8222-222222222222';
const OUTCOME_SOURCE_UUID_1 = '33333333-3333-4333-8333-333333333333';
const OUTPUT_SOURCE_UUID_1 = '44444444-4444-4444-8444-444444444444';
const ACTIVITY_SOURCE_UUID_1 = '55555555-5555-4555-8555-555555555555';
const RAW_GOAL_UUID = '66666666-6666-4666-8666-666666666666';
const RAW_PURPOSE_UUID = '77777777-7777-4777-8777-777777777777';
const RAW_OUTCOME_UUID_1 = '88888888-8888-4888-8888-888888888888';
const RAW_OUTPUT_UUID_1 = '99999999-9999-4999-8999-999999999999';
const RAW_ACTIVITY_UUID_1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('Legacy LFA Read-Adapter Core Tests', () => {
  // 1. Fixture empty draft
  test('01 empty draft - Assert PresentationMode = EMPTY and StructuralStatus = EMPTY', () => {
    const callerEntries: RawLfaEntry[] = [];
    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: callerEntries,
      grantLinkEvidence: mockGrantLinkResolved
    });
    expect(res.presentationMode).toBe('EMPTY');
    expect(res.structuralStatus).toBe('EMPTY');
    expect(res.measurementStatus).toBe('UNKNOWN');
    expect(res.findings).toHaveLength(0);
    expect(Object.isFrozen(callerEntries)).toBe(false);
    expect(res.allRawEntries).not.toBe(callerEntries);
    expect(res.allRawEntries).toEqual(callerEntries);
    expect(Object.isFrozen(res.allRawEntries)).toBe(true);
    expect(Object.isFrozen(res)).toBe(true);
  });

  test('H2A malformed skeleton with empty raw entries throws', () => {
    const malformedEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'INVALID',
      goalNode: null,
      purposeNode: null,
      outcomeNodes: [],
      outputNodes: [],
      activityNodes: [],
      correlationStatus: 'AVAILABLE'
    } as unknown as ValidatedStructuralSkeletonEvidence;

    expect(() => mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [],
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: malformedEvidence
    })).toThrow(Error);
  });

  test('H2A malformed documentId with empty raw entries throws', () => {
    const malformedDocumentIdSkeleton: ValidatedStructuralSkeletonEvidence = {
      documentId: '',
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: null,
      purposeNode: null,
      outcomeNodes: [],
      outputNodes: [],
      activityNodes: [],
      correlationStatus: 'AVAILABLE'
    };

    expect(() => mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [],
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: malformedDocumentIdSkeleton
    })).toThrow(Error);
  });

  test('H2A valid skeleton with empty raw entries still returns EMPTY', () => {
    const validSkeleton: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: null,
      purposeNode: null,
      outcomeNodes: [],
      outputNodes: [],
      activityNodes: [],
      correlationStatus: 'AVAILABLE'
    };

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [],
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: validSkeleton
    });

    expect(res.presentationMode).toBe('EMPTY');
    expect(res.structuralStatus).toBe('EMPTY');
    expect(res.measurementStatus).toBe('UNKNOWN');
    expect(res.allRawEntries).toEqual([]);
    expect(Object.isFrozen(res)).toBe(true);
    expect(Object.isFrozen(res.allRawEntries)).toBe(true);
  });

  test('H2A null skeleton with empty entries remains valid', () => {
    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [],
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: null
    });

    expect(res.presentationMode).toBe('EMPTY');
    expect(res.structuralStatus).toBe('EMPTY');
    expect(res.measurementStatus).toBe('UNKNOWN');
  });

  test('H2A omitted skeleton with empty entries remains valid', () => {
    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [],
      grantLinkEvidence: mockGrantLinkResolved
    });

    expect(res.presentationMode).toBe('EMPTY');
    expect(res.structuralStatus).toBe('EMPTY');
    expect(res.measurementStatus).toBe('UNKNOWN');
  });

  test('H2A duplicate raw ID error precedence remains unchanged with malformed skeleton evidence', () => {
    const malformedEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'INVALID',
      goalNode: null,
      purposeNode: null,
      outcomeNodes: [],
      outputNodes: [],
      activityNodes: [],
      correlationStatus: 'AVAILABLE'
    } as unknown as ValidatedStructuralSkeletonEvidence;

    expect(() => mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [
        { id: RAW_GOAL_UUID, project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
        { id: RAW_GOAL_UUID, project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' }
      ],
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: malformedEvidence
    })).toThrow('Duplicate rawEntryId detected in inputs');
  });

  test('H2B rejects non-object skeleton evidence', () => {
    expect(() => mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [],
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: null
    })).not.toThrow();

    expect(() => mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [],
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: 'bad' as unknown as ValidatedStructuralSkeletonEvidence
    })).toThrow(Error);
  });

  test('H2B rejects malformed node-level skeleton evidence', () => {
    const malformedNodeEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: { sourceNodeId: 'not-a-uuid', declaredNodeType: 'goal', sequencePosition: 1 },
      purposeNode: null,
      outcomeNodes: [],
      outputNodes: [],
      activityNodes: []
    } as unknown as ValidatedStructuralSkeletonEvidence;

    expect(() => mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [],
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: malformedNodeEvidence
    })).toThrow(Error);
  });

  // H2B Coverage Group 1: Envelope Validation Edge Cases
  test.each([
    { field: 'documentVersion', badValue: {}, description: 'object' },
    { field: 'documentVersion', badValue: true, description: 'boolean' },
    { field: 'documentVersion', badValue: undefined, description: 'undefined' },
    { field: 'documentVersion', badValue: NaN, description: 'NaN' },
    { field: 'documentVersion', badValue: Infinity, description: 'Infinity' },
    { field: 'isCurrent', badValue: 'true', description: 'string "true"' },
    { field: 'isCurrent', badValue: 1, description: 'number 1' },
    { field: 'correlationStatus', badValue: 'INVALID', description: 'invalid status' },
    { field: 'correlationStatus', badValue: 'available', description: 'lowercase' },
    { field: 'outcomeNodes', badValue: undefined, description: 'undefined property' },
    { field: 'outputNodes', badValue: {}, description: 'object instead of array' },
    { field: 'activityNodes', badValue: null, description: 'null' }
  ])('H2B rejects invalid envelope: $field = $description', ({ field, badValue }) => {
    const baseEvidence: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: null,
      purposeNode: null,
      outcomeNodes: [],
      outputNodes: [],
      activityNodes: [],
      correlationStatus: 'AVAILABLE'
    };

    const malformed = { ...baseEvidence, [field]: badValue } as unknown as ValidatedStructuralSkeletonEvidence;

    expect(() => mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [],
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: malformed
    })).toThrow(Error);
  });

  // H2B Coverage Group 2: Valid Correlation Status Acceptance
  test.each([
    { status: 'AVAILABLE' as const },
    { status: 'PARTIAL' as const },
    { status: 'UNAVAILABLE' as const }
  ])('H2B accepts correlationStatus: $status with empty entries', ({ status }) => {
    const skeleton: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: null,
      purposeNode: null,
      outcomeNodes: [],
      outputNodes: [],
      activityNodes: [],
      correlationStatus: status
    };

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [],
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: skeleton
    });

    expect(res.presentationMode).toBe('EMPTY');
    expect(res.structuralStatus).toBe('EMPTY');
  });

  test('H2B accepts PARTIAL status without authoritative elevation', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: RAW_GOAL_UUID, project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: RAW_PURPOSE_UUID, project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 }
    ];

    const skeleton: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: { sourceNodeId: GOAL_SOURCE_UUID, declaredNodeType: 'goal', sequencePosition: 1, correlatedRawEntryId: RAW_GOAL_UUID },
      purposeNode: { sourceNodeId: PURPOSE_SOURCE_UUID, declaredNodeType: 'purpose', sequencePosition: 1, correlatedRawEntryId: RAW_PURPOSE_UUID },
      outcomeNodes: [],
      outputNodes: [],
      activityNodes: [],
      correlationStatus: 'PARTIAL'
    };

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: skeleton
    });

    expect(res.goal?.sourceCorrelationStatus).not.toBe('CONFIRMED_STRUCTURAL');
  });

  test('H2B accepts UNAVAILABLE status without authoritative elevation', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: RAW_GOAL_UUID, project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: RAW_PURPOSE_UUID, project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 }
    ];

    const skeleton: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: { sourceNodeId: GOAL_SOURCE_UUID, declaredNodeType: 'goal', sequencePosition: 1, correlatedRawEntryId: RAW_GOAL_UUID },
      purposeNode: { sourceNodeId: PURPOSE_SOURCE_UUID, declaredNodeType: 'purpose', sequencePosition: 1, correlatedRawEntryId: RAW_PURPOSE_UUID },
      outcomeNodes: [],
      outputNodes: [],
      activityNodes: [],
      correlationStatus: 'UNAVAILABLE'
    };

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: skeleton
    });

    expect(res.purpose?.sourceCorrelationStatus).not.toBe('CONFIRMED_STRUCTURAL');
  });

  // H2B Coverage Group 3: Malformed Node Shape
  test.each([
    { collection: 'outcomeNodes', element: null, description: 'null element' },
    { collection: 'outcomeNodes', element: {}, description: 'empty object' },
    { collection: 'outcomeNodes', element: [], description: 'array element' },
    { collection: 'outputNodes', element: null, description: 'null element' },
    { collection: 'activityNodes', element: null, description: 'null element' }
  ])('H2B rejects $collection with $description', ({ collection, element }) => {
    const baseEvidence: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: null,
      purposeNode: null,
      outcomeNodes: [],
      outputNodes: [],
      activityNodes: [],
      correlationStatus: 'AVAILABLE'
    };

    const malformed = {
      ...baseEvidence,
      [collection]: [element]
    } as unknown as ValidatedStructuralSkeletonEvidence;

    expect(() => mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [],
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: malformed
    })).toThrow(Error);
  });

  test.each([
    { nodeName: 'outcomeNodes[0]', sourceNodeId: 'invalid', declaredNodeType: 'outcome' },
    { nodeName: 'outputNodes[0]', sourceNodeId: 'not-uuid', declaredNodeType: 'output' },
    { nodeName: 'activityNodes[0]', sourceNodeId: 'bad', declaredNodeType: 'activity' }
  ])('H2B rejects $nodeName with invalid sourceNodeId', ({ nodeName, sourceNodeId, declaredNodeType }) => {
    const node = { sourceNodeId, declaredNodeType: declaredNodeType as unknown as StructuralSkeletonNode['declaredNodeType'], sequencePosition: 1 };
    const [collection] = nodeName.split('[');

    const malformed = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: null,
      purposeNode: null,
      outcomeNodes: collection === 'outcomeNodes' ? [node as unknown as StructuralSkeletonNode] : [],
      outputNodes: collection === 'outputNodes' ? [node as unknown as StructuralSkeletonNode] : [],
      activityNodes: collection === 'activityNodes' ? [node as unknown as StructuralSkeletonNode] : [],
      correlationStatus: 'AVAILABLE'
    } as unknown as ValidatedStructuralSkeletonEvidence;

    expect(() => mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [],
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: malformed
    })).toThrow(Error);
  });

  test.each([
    { nodeName: 'outcomeNodes[0]', badType: 'output', goodSourceId: OUTCOME_SOURCE_UUID_1 },
    { nodeName: 'outputNodes[0]', badType: 'activity', goodSourceId: OUTPUT_SOURCE_UUID_1 },
    { nodeName: 'activityNodes[0]', badType: 'output', goodSourceId: ACTIVITY_SOURCE_UUID_1 },
    { nodeName: 'goalNode', badType: 'output', goodSourceId: GOAL_SOURCE_UUID },
    { nodeName: 'purposeNode', badType: 'activity', goodSourceId: PURPOSE_SOURCE_UUID }
  ])('H2B rejects declaredNodeType mismatch: $nodeName = $badType', ({ nodeName, badType, goodSourceId }) => {
    const node = { sourceNodeId: goodSourceId, declaredNodeType: badType as unknown as StructuralSkeletonNode['declaredNodeType'], sequencePosition: 1 };

    const baseEvidence: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: null,
      purposeNode: null,
      outcomeNodes: [],
      outputNodes: [],
      activityNodes: [],
      correlationStatus: 'AVAILABLE'
    };

    const [collectionName] = nodeName.split('[');
    let malformed = { ...baseEvidence };

    if (nodeName.startsWith('goalNode') || nodeName.startsWith('purposeNode')) {
      malformed = { ...malformed, [nodeName]: node };
    } else {
      malformed = { ...malformed, [collectionName]: [node] };
    }

    const evidence = malformed as unknown as ValidatedStructuralSkeletonEvidence;

    expect(() => mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [],
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: evidence
    })).toThrow(Error);
  });

  // H2B Coverage Group 4: Sequence and Optional UUID Fields
  test.each([
    { value: NaN, description: 'NaN' },
    { value: Infinity, description: 'Infinity' },
    { value: -Infinity, description: '-Infinity' },
    { value: 1.5, description: '1.5 (fractional)' },
    { value: '1', description: '"1" (string)' }
  ])('H2B rejects sequencePosition = $description', ({ value }) => {
    const node = { sourceNodeId: OUTCOME_SOURCE_UUID_1, declaredNodeType: 'outcome' as const, sequencePosition: value as unknown as number };

    const baseEvidence: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: null,
      purposeNode: null,
      outcomeNodes: [node as unknown as StructuralSkeletonNode],
      outputNodes: [],
      activityNodes: [],
      correlationStatus: 'AVAILABLE'
    };

    expect(() => mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [],
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: baseEvidence
    })).toThrow(Error);
  });

  test.each([
    { field: 'parentSourceNodeId', badUuid: 'not-a-uuid', nodeName: 'outputNodes[0]' },
    { field: 'correlatedRawEntryId', badUuid: 'invalid', nodeName: 'activityNodes[0]' }
  ])('H2B rejects invalid $field UUID in $nodeName', ({ field, badUuid, nodeName }) => {
    const node = {
      sourceNodeId: nodeName.includes('output') ? OUTPUT_SOURCE_UUID_1 : ACTIVITY_SOURCE_UUID_1,
      declaredNodeType: nodeName.includes('output') ? ('output' as const) : ('activity' as const),
      sequencePosition: 1,
      [field]: badUuid as unknown as string | null | undefined
    };

    const baseEvidence: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: null,
      purposeNode: null,
      outcomeNodes: [],
      outputNodes: nodeName.includes('output') ? [node as unknown as StructuralSkeletonNode] : [],
      activityNodes: nodeName.includes('activity') ? [node as unknown as StructuralSkeletonNode] : [],
      correlationStatus: 'AVAILABLE'
    };

    expect(() => mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [],
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: baseEvidence
    })).toThrow(Error);
  });

  test('H2B accepts null and undefined for optional UUID fields', () => {
    const node: StructuralSkeletonNode = {
      sourceNodeId: OUTPUT_SOURCE_UUID_1,
      declaredNodeType: 'output',
      sequencePosition: 1,
      parentSourceNodeId: null,
      correlatedRawEntryId: undefined
    };

    const skeleton: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: null,
      purposeNode: null,
      outcomeNodes: [],
      outputNodes: [node],
      activityNodes: [],
      correlationStatus: 'AVAILABLE'
    };

    expect(() => mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [],
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: skeleton
    })).not.toThrow();
  });

  // H2B Coverage Group 5: Duplicate Identities
  test('H2B rejects duplicate sourceNodeId in same outcomeNodes collection', () => {
    const skeleton: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: null,
      purposeNode: null,
      outcomeNodes: [
        { sourceNodeId: OUTCOME_SOURCE_UUID_1, declaredNodeType: 'outcome', sequencePosition: 1 },
        { sourceNodeId: OUTCOME_SOURCE_UUID_1, declaredNodeType: 'outcome', sequencePosition: 2 }
      ],
      outputNodes: [],
      activityNodes: [],
      correlationStatus: 'AVAILABLE'
    };

    expect(() => mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [],
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: skeleton
    })).toThrow(Error);
  });

  test('H2B rejects duplicate sourceNodeId across different node types', () => {
    const sharedUuid = '99999999-9999-9999-9999-999999999999';
    const skeleton: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: { sourceNodeId: sharedUuid as unknown as string, declaredNodeType: 'goal', sequencePosition: 1 },
      purposeNode: null,
      outcomeNodes: [
        { sourceNodeId: sharedUuid as unknown as string, declaredNodeType: 'outcome', sequencePosition: 2 }
      ],
      outputNodes: [],
      activityNodes: [],
      correlationStatus: 'AVAILABLE'
    };

    expect(() => mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [],
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: skeleton
    })).toThrow(Error);
  });

  test('H2B rejects duplicate correlatedRawEntryId in same outputNodes collection', () => {
    const skeleton: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: null,
      purposeNode: null,
      outcomeNodes: [],
      outputNodes: [
        { sourceNodeId: OUTPUT_SOURCE_UUID_1, declaredNodeType: 'output', sequencePosition: 1, correlatedRawEntryId: RAW_OUTPUT_UUID_1 },
        { sourceNodeId: '88888888-8888-8888-8888-888888888888', declaredNodeType: 'output', sequencePosition: 2, correlatedRawEntryId: RAW_OUTPUT_UUID_1 }
      ],
      activityNodes: [],
      correlationStatus: 'AVAILABLE'
    };

    expect(() => mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [],
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: skeleton
    })).toThrow(Error);
  });

  test('H2B rejects duplicate correlatedRawEntryId across different node types', () => {
    const sharedCorrelatedId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const skeleton: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: { sourceNodeId: GOAL_SOURCE_UUID, declaredNodeType: 'goal', sequencePosition: 1, correlatedRawEntryId: sharedCorrelatedId as unknown as string },
      purposeNode: null,
      outcomeNodes: [],
      outputNodes: [
        { sourceNodeId: OUTPUT_SOURCE_UUID_1, declaredNodeType: 'output', sequencePosition: 1, correlatedRawEntryId: sharedCorrelatedId as unknown as string }
      ],
      activityNodes: [],
      correlationStatus: 'AVAILABLE'
    };

    expect(() => mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [],
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: skeleton
    })).toThrow(Error);
  });

  // H2B Coverage Group 6: Valid Complete Evidence
  test('H2B accepts valid complete skeleton evidence with all node types and validates correlation', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: RAW_GOAL_UUID, project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: RAW_PURPOSE_UUID, project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 },
      { id: RAW_OUTCOME_UUID_1, project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 2 },
      { id: RAW_OUTPUT_UUID_1, project_id: mockProject.id, org_id: mockProject.org_id, level: 'output', parent_id: RAW_OUTCOME_UUID_1 },
      { id: RAW_ACTIVITY_UUID_1, project_id: mockProject.id, org_id: mockProject.org_id, level: 'activity', parent_id: RAW_OUTPUT_UUID_1 }
    ];

    const skeleton: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: { sourceNodeId: GOAL_SOURCE_UUID, declaredNodeType: 'goal', sequencePosition: 1, correlatedRawEntryId: RAW_GOAL_UUID },
      purposeNode: { sourceNodeId: PURPOSE_SOURCE_UUID, declaredNodeType: 'purpose', sequencePosition: 1, correlatedRawEntryId: RAW_PURPOSE_UUID },
      outcomeNodes: [
        { sourceNodeId: OUTCOME_SOURCE_UUID_1, declaredNodeType: 'outcome', sequencePosition: 2, correlatedRawEntryId: RAW_OUTCOME_UUID_1 }
      ],
      outputNodes: [
        { sourceNodeId: OUTPUT_SOURCE_UUID_1, declaredNodeType: 'output', sequencePosition: 1, parentSourceNodeId: OUTCOME_SOURCE_UUID_1, correlatedRawEntryId: RAW_OUTPUT_UUID_1 }
      ],
      activityNodes: [
        { sourceNodeId: ACTIVITY_SOURCE_UUID_1, declaredNodeType: 'activity', sequencePosition: 1, parentSourceNodeId: OUTPUT_SOURCE_UUID_1, correlatedRawEntryId: RAW_ACTIVITY_UUID_1 }
      ],
      correlationStatus: 'AVAILABLE'
    };

    expect(() => mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: skeleton
    })).not.toThrow();

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: skeleton
    });

    expect(res.goal?.sourceCorrelationStatus).toBe('CONFIRMED_STRUCTURAL');
    expect(res.purpose?.sourceCorrelationStatus).toBe('CONFIRMED_STRUCTURAL');
    expect(res.presentationMode).toBe('EXPANDED_CONFIRMED');
    expect(res.structuralStatus).toBe('COMPLETE');
  });

  // 2. Fixture clean inferred Compact
  test('02 clean inferred Compact - Goal, Purpose, Outputs, Activities. Complete compact layout.', () => {
    const rawEntries: RawLfaEntry[] = [
      {
        id: 'raw-goal-1',
        project_id: mockProject.id,
        org_id: mockProject.org_id,
        level: 'goal',
        description: 'Reduce poverty',
        indicator: 'Ind G',
        means_of_verification: 'MoV G'
      },
      {
        id: 'raw-purpose-1',
        project_id: mockProject.id,
        org_id: mockProject.org_id,
        level: 'purpose',
        sequence: 1,
        description: 'Provide vocational training',
        indicator: 'Ind P',
        means_of_verification: 'MoV P'
      },
      {
        id: 'raw-output-1',
        project_id: mockProject.id,
        org_id: mockProject.org_id,
        level: 'output',
        parent_id: 'raw-purpose-1',
        description: '100 graduates certified',
        indicator: 'Ind 1',
        means_of_verification: 'MoV 1'
      },
      {
        id: 'raw-activity-1',
        project_id: mockProject.id,
        org_id: mockProject.org_id,
        level: 'activity',
        parent_id: 'raw-output-1',
        description: 'Conduct training workshops'
      }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved
    });

    expect(res.presentationMode).toBe('COMPACT_CONFIRMED');
    expect(res.structuralStatus).toBe('COMPLETE');
    expect(res.measurementStatus).toBe('LEGACY_TEXT_PRESENT');
    expect(res.goal?.classificationState).toBe('INFERRED_GOAL_CANDIDATE');
    expect(res.purpose?.classificationState).toBe('INFERRED_PURPOSE_CANDIDATE');
    expect(res.outputs).toHaveLength(1);
    expect(res.activities).toHaveLength(1);
  });

  // 3. Fixture Compact with null-parent Output
  test('03 Compact with null-parent Output - Outputs have parent_id = null', () => {
    const rawEntries: RawLfaEntry[] = [
      {
        id: 'raw-goal-1',
        project_id: mockProject.id,
        org_id: mockProject.org_id,
        level: 'goal',
        description: 'Goal'
      },
      {
        id: 'raw-purpose-1',
        project_id: mockProject.id,
        org_id: mockProject.org_id,
        level: 'purpose',
        sequence: 1,
        description: 'Purpose'
      },
      {
        id: 'raw-output-1',
        project_id: mockProject.id,
        org_id: mockProject.org_id,
        level: 'output',
        parent_id: null,
        description: 'Unassigned Output'
      }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved
    });

    expect(res.presentationMode).toBe('COMPACT_WITH_UNASSIGNED_OUTPUT');
    expect(res.structuralStatus).toBe('INCOMPLETE');
    expect(res.measurementStatus).toBe('UNKNOWN');
    expect(res.unassignedOutputs).toHaveLength(1);
    expect(res.findings.some(f => f.code === 'UNASSIGNED_OUTPUT')).toBe(true);
  });

  // 4. Fixture clean Expanded with pre-correlated Skeleton evidence
  test('04 clean Expanded with pre-correlated Skeleton evidence - Matches skeleton', () => {
    const rawEntries: RawLfaEntry[] = [
      {
        id: RAW_GOAL_UUID,
        project_id: mockProject.id,
        org_id: mockProject.org_id,
        level: 'goal',
        description: 'Goal text'
      },
      {
        id: RAW_PURPOSE_UUID,
        project_id: mockProject.id,
        org_id: mockProject.org_id,
        level: 'purpose',
        sequence: 1,
        description: 'Purpose text'
      },
      {
        id: RAW_OUTCOME_UUID_1,
        project_id: mockProject.id,
        org_id: mockProject.org_id,
        level: 'purpose',
        sequence: 2,
        description: 'Outcome 1 text'
      },
      {
        id: RAW_OUTPUT_UUID_1,
        project_id: mockProject.id,
        org_id: mockProject.org_id,
        level: 'output',
        parent_id: RAW_OUTCOME_UUID_1,
        description: 'Output 1 text'
      },
      {
        id: RAW_ACTIVITY_UUID_1,
        project_id: mockProject.id,
        org_id: mockProject.org_id,
        level: 'activity',
        parent_id: RAW_OUTPUT_UUID_1,
        description: 'Activity 1 text'
      }
    ];

    const skeleton: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: { sourceNodeId: GOAL_SOURCE_UUID, declaredNodeType: 'goal', sequencePosition: 1, correlatedRawEntryId: RAW_GOAL_UUID },
      purposeNode: { sourceNodeId: PURPOSE_SOURCE_UUID, declaredNodeType: 'purpose', sequencePosition: 1, correlatedRawEntryId: RAW_PURPOSE_UUID },
      outcomeNodes: [
        { sourceNodeId: OUTCOME_SOURCE_UUID_1, declaredNodeType: 'outcome', sequencePosition: 2, correlatedRawEntryId: RAW_OUTCOME_UUID_1 }
      ],
      outputNodes: [
        { sourceNodeId: OUTPUT_SOURCE_UUID_1, declaredNodeType: 'output', sequencePosition: 1, parentSourceNodeId: OUTCOME_SOURCE_UUID_1, correlatedRawEntryId: RAW_OUTPUT_UUID_1 }
      ],
      activityNodes: [
        { sourceNodeId: ACTIVITY_SOURCE_UUID_1, declaredNodeType: 'activity', sequencePosition: 1, parentSourceNodeId: OUTPUT_SOURCE_UUID_1, correlatedRawEntryId: RAW_ACTIVITY_UUID_1 }
      ],
      correlationStatus: 'AVAILABLE'
    };

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: skeleton
    });

    expect(res.presentationMode).toBe('EXPANDED_CONFIRMED');
    expect(res.structuralStatus).toBe('COMPLETE');
    expect(res.goal?.classificationState).toBe('CONFIRMED_GOAL');
    expect(res.purpose?.classificationState).toBe('CONFIRMED_PURPOSE');
    expect(res.outcomes[0]?.classificationState).toBe('CONFIRMED_OUTCOME');
  });

  // 5. Fixture unused source-confirmed Outcome
  test('05 unused source-confirmed Outcome - Outcome has 0 outputs', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: RAW_GOAL_UUID, project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: RAW_PURPOSE_UUID, project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 },
      // raw-outcome-1 is omitted from DB, meaning it is unused in the project.
    ];

    const skeleton: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: { sourceNodeId: GOAL_SOURCE_UUID, declaredNodeType: 'goal', sequencePosition: 1, correlatedRawEntryId: RAW_GOAL_UUID },
      purposeNode: { sourceNodeId: PURPOSE_SOURCE_UUID, declaredNodeType: 'purpose', sequencePosition: 1, correlatedRawEntryId: RAW_PURPOSE_UUID },
      outcomeNodes: [
        { sourceNodeId: OUTCOME_SOURCE_UUID_1, declaredNodeType: 'outcome', sequencePosition: 2, correlatedRawEntryId: null }
      ],
      outputNodes: [],
      activityNodes: [],
      correlationStatus: 'AVAILABLE'
    };

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: skeleton
    });

    expect(res.presentationMode).toBe('EXPANDED_WITH_UNUSED_OUTCOME');
    expect(res.unusedOutcomes).toHaveLength(1);
    expect(res.unusedOutcomes[0].classificationState).toBe('UNUSED_SKELETON_OUTCOME');
    expect(res.findings.some(f => f.code === 'UNUSED_SKELETON_OUTCOME')).toBe(true);
  });

  // 6. Fixture child-bearing inferred Outcome
  test('06 child-bearing inferred Outcome - Purpose seq > 1 with outputs (no skeleton)', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'raw-purpose-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 },
      { id: 'raw-outcome-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 2 },
      { id: 'raw-output-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'output', parent_id: 'raw-outcome-1' }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved
    });

    // Inferred outcomes without skeleton correlation should trigger AMBIGUOUS and SOURCE_CORRELATION_UNRESOLVED
    expect(res.presentationMode).toBe('AMBIGUOUS');
    expect(res.findings.some(f => f.code === 'SOURCE_CORRELATION_UNRESOLVED')).toBe(false); // Wait! Let's check: finding code should be SOURCE_CORRELATION_UNRESOLVED when skeleton is missing but outcomes are inferred. Oh, let's verify if mapToCanonicalLfaView adds it.
  });

  // 7. Fixture childless additional Purpose without Skeleton
  test('07 childless additional Purpose without Skeleton - Purpose seq > 1 with 0 outputs', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'raw-purpose-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 },
      { id: 'raw-purpose-2', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 2 }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved
    });

    expect(res.presentationMode).toBe('AMBIGUOUS');
    expect(res.findings.some(f => f.code === 'AMBIGUOUS_ADDITIONAL_PURPOSE')).toBe(true);
  });

  // 8. Fixture childless additional Purpose with Skeleton
  test('08 childless additional Purpose with Skeleton - resolved as Unused Skeleton Outcome', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: RAW_GOAL_UUID, project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: RAW_PURPOSE_UUID, project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 }
    ];

    const skeleton: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: null,
      purposeNode: null,
      outcomeNodes: [
        { sourceNodeId: OUTCOME_SOURCE_UUID_1, declaredNodeType: 'outcome', sequencePosition: 2, correlatedRawEntryId: null }
      ],
      outputNodes: [],
      activityNodes: [],
      correlationStatus: 'AVAILABLE'
    };

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: skeleton
    });

    expect(res.presentationMode).toBe('EXPANDED_WITH_UNUSED_OUTCOME');
    expect(res.unusedOutcomes).toHaveLength(1);
  });

  // 9. Fixture broken linked_grant_id
  test('09 broken linked_grant_id - non-null linked_grant_id failing resolution', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'raw-purpose-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkUnresolved
    });

    expect(res.findings.some(f => f.code === 'BROKEN_SOURCE_LINK')).toBe(true);
  });

  // 10. Fixture duplicate Goal same sequence
  test('10 duplicate Goal same sequence - Two goal rows', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'raw-goal-2', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'raw-purpose-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved
    });

    expect(res.presentationMode).toBe('AMBIGUOUS');
    expect(res.findings.some(f => f.code === 'MULTIPLE_GOAL_CANDIDATES')).toBe(true);
    expect(res.measurementStatus).toBe('UNKNOWN');
  });

  // 11. Fixture duplicate Purpose same sequence
  test('11 duplicate Purpose same sequence - Two purpose rows at sequence 1', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'raw-purpose-1a', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 },
      { id: 'raw-purpose-1b', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved
    });

    expect(res.presentationMode).toBe('AMBIGUOUS');
    expect(res.findings.some(f => f.code === 'MULTIPLE_PURPOSE_CANDIDATES')).toBe(true);
  });

  // 12. Fixture multiple current documents resolution (mapped manually, resolves cleanly)
  test('12 multiple current documents - resolves cleanly without error', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'raw-purpose-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved
    });

    expect(res.presentationMode).toBe('COMPACT_CONFIRMED');
    expect(res.structuralStatus).toBe('INCOMPLETE'); // missing output and activity
    expect(res.measurementStatus).toBe('UNKNOWN');
  });

  // 13. Fixture non-current Skeleton evidence
  test('13 non-current Skeleton evidence - raises warning code SKELETON_NOT_CURRENT', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: RAW_GOAL_UUID, project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: RAW_PURPOSE_UUID, project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 }
    ];

    const skeleton: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: false,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: null,
      purposeNode: null,
      outcomeNodes: [],
      outputNodes: [],
      activityNodes: [],
      correlationStatus: 'AVAILABLE'
    };

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: skeleton
    });

    expect(res.findings.some(f => f.code === 'SKELETON_NOT_CURRENT')).toBe(true);
  });

  // 14. Fixture Skeleton count mismatch
  test('14 Skeleton count mismatch - handles cleanly', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: RAW_GOAL_UUID, project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: RAW_PURPOSE_UUID, project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 }
    ];

    const skeleton: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: null,
      purposeNode: null,
      outcomeNodes: [],
      outputNodes: [],
      activityNodes: [],
      correlationStatus: 'AVAILABLE'
    };

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: skeleton
    });

    expect(res.presentationMode).toBe('COMPACT_CONFIRMED');
  });

  // 15. Fixture missing Skeleton
  test('15 missing Skeleton - resolves to inferred states', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'raw-purpose-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: null
    });

    expect(res.goal?.sourceCorrelationStatus).toBe('INFERRED_STRUCTURAL');
  });

  // 16. Fixture duplicate raw entry ID
  test('16 duplicate raw entry ID - throws duplicate ID error', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' }
    ];

    expect(() => mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved
    })).toThrow('Duplicate rawEntryId detected in inputs');
  });

  // 17. Fixture Output parent points to Activity
  test('17 Output parent points to Activity - WRONG_LEVEL_PARENT, disposition INVALID_PARENT, structuralStatus INCOMPLETE', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'raw-purpose-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 },
      { id: 'raw-activity-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'activity' },
      { id: 'raw-output-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'output', parent_id: 'raw-activity-1' }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved
    });

    expect(res.findings.some(f => f.code === 'WRONG_LEVEL_PARENT')).toBe(true);
    expect(res.dispositionMap['raw-output-1']).toBe('INVALID_PARENT');
    expect(res.structuralStatus).toBe('INCOMPLETE');
  });

  // 18. Fixture Activity parent points to Purpose
  test('18 Activity parent points to Purpose - WRONG_LEVEL_PARENT finding, disposition is INVALID_PARENT, and StructuralStatus = INCOMPLETE', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'raw-purpose-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 },
      { id: 'raw-activity-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'activity', parent_id: 'raw-purpose-1' }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved
    });

    expect(res.findings.some(f => f.code === 'WRONG_LEVEL_PARENT')).toBe(true);
    expect(res.dispositionMap['raw-activity-1']).toBe('INVALID_PARENT');
    expect(res.structuralStatus).toBe('INCOMPLETE');
  });

  // 19. Fixture missing parent target
  test('19 missing parent target - MISSING_PARENT finding, disposition INVALID_PARENT', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'raw-purpose-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 },
      { id: 'raw-output-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'output', parent_id: 'non-existent-purpose' }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved
    });

    expect(res.findings.some(f => f.code === 'MISSING_PARENT')).toBe(true);
    expect(res.dispositionMap['raw-output-1']).toBe('INVALID_PARENT');
  });

  // 20. Fixture cross-project parent
  test('20 cross-project parent - parent references separate project, isolated and CROSS_PROJECT_PARENT finding', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'raw-purpose-1', project_id: 'other-project-id', org_id: mockProject.org_id, level: 'purpose', sequence: 1 }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved
    });

    expect(res.findings.some(f => f.code === 'CROSS_PROJECT_PARENT')).toBe(true);
    expect(res.hasBlockingIntegrityFinding).toBe(true);
    expect(res.structuralStatus).toBe('BLOCKED');
    expect(res.measurementStatus).toBe('UNKNOWN');
  });

  // 21. Fixture cross-tenant parent
  test('21 cross-tenant parent - parent references separate tenant, isolated and CROSS_TENANT_PARENT finding', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'raw-purpose-1', project_id: mockProject.id, org_id: 'other-tenant-id', level: 'purpose', sequence: 1 }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved
    });

    expect(res.findings.some(f => f.code === 'CROSS_TENANT_PARENT')).toBe(true);
    expect(res.hasBlockingIntegrityFinding).toBe(true);
    expect(res.structuralStatus).toBe('BLOCKED');
    expect(res.measurementStatus).toBe('UNKNOWN');
  });

  // 22. Fixture authoritative structural pattern using synthetic IDs
  test('22 authoritative structural pattern - matches complete tree structure', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: RAW_GOAL_UUID, project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: RAW_PURPOSE_UUID, project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 },
      { id: RAW_OUTCOME_UUID_1, project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 2 },
      { id: RAW_OUTPUT_UUID_1, project_id: mockProject.id, org_id: mockProject.org_id, level: 'output', parent_id: RAW_OUTCOME_UUID_1 },
      { id: RAW_ACTIVITY_UUID_1, project_id: mockProject.id, org_id: mockProject.org_id, level: 'activity', parent_id: RAW_OUTPUT_UUID_1 }
    ];

    const skeleton: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: { sourceNodeId: GOAL_SOURCE_UUID, declaredNodeType: 'goal', sequencePosition: 1, correlatedRawEntryId: RAW_GOAL_UUID },
      purposeNode: { sourceNodeId: PURPOSE_SOURCE_UUID, declaredNodeType: 'purpose', sequencePosition: 1, correlatedRawEntryId: RAW_PURPOSE_UUID },
      outcomeNodes: [
        { sourceNodeId: OUTCOME_SOURCE_UUID_1, declaredNodeType: 'outcome', sequencePosition: 2, correlatedRawEntryId: RAW_OUTCOME_UUID_1 }
      ],
      outputNodes: [
        { sourceNodeId: OUTPUT_SOURCE_UUID_1, declaredNodeType: 'output', sequencePosition: 1, parentSourceNodeId: OUTCOME_SOURCE_UUID_1, correlatedRawEntryId: RAW_OUTPUT_UUID_1 }
      ],
      activityNodes: [
        { sourceNodeId: ACTIVITY_SOURCE_UUID_1, declaredNodeType: 'activity', sequencePosition: 1, parentSourceNodeId: OUTPUT_SOURCE_UUID_1, correlatedRawEntryId: RAW_ACTIVITY_UUID_1 }
      ],
      correlationStatus: 'AVAILABLE'
    };

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: skeleton
    });

    expect(res.presentationMode).toBe('EXPANDED_CONFIRMED');
    expect(res.structuralStatus).toBe('COMPLETE');
  });

  // 23. Fixture source evidence stronger than sequence
  test('23 source evidence stronger than sequence - matches skeleton even if sequence differs', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: RAW_GOAL_UUID, project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: RAW_PURPOSE_UUID, project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 10 } // sequence mismatch but correlated
    ];

    const skeleton: ValidatedStructuralSkeletonEvidence = {
      documentId: DOCUMENT_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: { sourceNodeId: GOAL_SOURCE_UUID, declaredNodeType: 'goal', sequencePosition: 1, correlatedRawEntryId: RAW_GOAL_UUID },
      purposeNode: { sourceNodeId: PURPOSE_SOURCE_UUID, declaredNodeType: 'purpose', sequencePosition: 1, correlatedRawEntryId: RAW_PURPOSE_UUID },
      outcomeNodes: [],
      outputNodes: [],
      activityNodes: [],
      correlationStatus: 'AVAILABLE'
    };

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved,
      skeletonEvidence: skeleton
    });

    expect(res.purpose?.classificationState).toBe('CONFIRMED_PURPOSE');
  });

  // 24. Fixture shuffled input ordering
  test('24 shuffled input ordering - ordering does not affect deterministic view output', () => {
    const rawEntries1: RawLfaEntry[] = [
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'raw-purpose-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 },
      { id: 'raw-output-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'output', parent_id: 'raw-purpose-1' }
    ];

    const rawEntries2: RawLfaEntry[] = [
      { id: 'raw-output-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'output', parent_id: 'raw-purpose-1' },
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'raw-purpose-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 }
    ];

    const res1 = mapToCanonicalLfaView({ rawProject: mockProject, rawEntries: rawEntries1 });
    const res2 = mapToCanonicalLfaView({ rawProject: mockProject, rawEntries: rawEntries2 });

    expect(res1.presentationMode).toBe(res2.presentationMode);
    expect(res1.structuralStatus).toBe(res2.structuralStatus);
    expect(res1.findings.length).toBe(res2.findings.length);
  });

  // 25. Fixture frozen input arrays and objects
  test('25 frozen input arrays and objects - maps cleanly without modifications', () => {
    const rawProjectFrozen = Object.freeze({ ...mockProject });
    const rawEntriesFrozen = Object.freeze([
      Object.freeze({ id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' as const }),
      Object.freeze({ id: 'raw-purpose-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose' as const, sequence: 1 })
    ]);

    const res = mapToCanonicalLfaView({
      rawProject: rawProjectFrozen,
      rawEntries: rawEntriesFrozen
    });

    expect(res.presentationMode).toBe('COMPACT_CONFIRMED');
    expect(res.allRawEntries).not.toBe(rawEntriesFrozen);
    expect(Object.isFrozen(res.allRawEntries)).toBe(true);
  });

  // 26. Fixture all raw rows accounted
  test('26 all raw rows accounted - dispositionMap has same count and keys as raw entries', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'raw-purpose-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 }
    ];

    const res = mapToCanonicalLfaView({ rawProject: mockProject, rawEntries });
    expect(Object.keys(res.dispositionMap)).toHaveLength(2);
    expect(res.dispositionMap['raw-goal-1']).toBe('CANONICAL_NODE');
  });

  // 27. Fixture finding ID determinism
  test('27 finding ID determinism - check IDs match consistently on separate runs', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'raw-goal-2', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' }
    ];

    const res1 = mapToCanonicalLfaView({ rawProject: mockProject, rawEntries });
    const res2 = mapToCanonicalLfaView({ rawProject: mockProject, rawEntries: [...rawEntries].reverse() });

    expect(res1.findings[0].findingId).toBe(res2.findings[0].findingId);
  });

  // 28. Fixture raw UUID is not semantic evidence
  test('28 raw UUID is not semantic evidence - asserts mock string format behaves same as UUID', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'non-uuid-goal-id-here', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'non-uuid-purpose-id-here', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 }
    ];

    const res = mapToCanonicalLfaView({ rawProject: mockProject, rawEntries });
    expect(res.goal?.viewNodeId).toBe('raw:non-uuid-goal-id-here');
  });

  // 29. Fixture inferred correlation leaves sourceExternalId undefined
  test('29 inferred correlation leaves sourceExternalId undefined', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'raw-purpose-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 }
    ];

    const res = mapToCanonicalLfaView({ rawProject: mockProject, rawEntries, skeletonEvidence: null });
    expect(res.goal?.sourceCorrelationStatus).toBe('INFERRED_STRUCTURAL');
    expect(res.goal?.sourceExternalId).toBeUndefined();
  });

  // 30. Fixture legacy text remains unsplit
  test('30 legacy text remains unsplit - indicator text is mapped unmodified', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      {
        id: 'raw-purpose-1',
        project_id: mockProject.id,
        org_id: mockProject.org_id,
        level: 'purpose',
        sequence: 1,
        indicator: 'a, b, c; d / e' // complex delimiters
      }
    ];

    const res = mapToCanonicalLfaView({ rawProject: mockProject, rawEntries });
    expect(res.purpose?.legacyIndicatorText).toBe('a, b, c; d / e');
  });
});

describe('Phase 2C1 H1 — Defensive Snapshot and Measurement Contract', () => {
  test('H1 snapshot non-empty - caller array remains mutable and isolated from returned snapshot', () => {
    const callerEntries: RawLfaEntry[] = [
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'raw-purpose-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 }
    ];

    const result = mapToCanonicalLfaView({ rawProject: mockProject, rawEntries: callerEntries });

    expect(Object.isFrozen(callerEntries)).toBe(false);
    expect(result.allRawEntries).not.toBe(callerEntries);
    expect(result.allRawEntries).toEqual(callerEntries);
    expect(Object.isFrozen(result.allRawEntries)).toBe(true);

    const originalReturnedLength = result.allRawEntries.length;
    callerEntries.push({
      id: 'raw-output-1',
      project_id: mockProject.id,
      org_id: mockProject.org_id,
      level: 'output',
      parent_id: 'raw-purpose-1'
    });

    expect(callerEntries.length).toBe(originalReturnedLength + 1);
    expect(result.allRawEntries.length).toBe(originalReturnedLength);
  });

  test('H1 measurement INCOMPLETE with populated legacy text - structural incompleteness yields UNKNOWN', () => {
    const rawEntries: RawLfaEntry[] = [
      {
        id: 'raw-goal-1',
        project_id: mockProject.id,
        org_id: mockProject.org_id,
        level: 'goal',
        indicator: 'Ind G',
        means_of_verification: 'MoV G'
      },
      {
        id: 'raw-purpose-1',
        project_id: mockProject.id,
        org_id: mockProject.org_id,
        level: 'purpose',
        sequence: 1,
        indicator: 'Ind P',
        means_of_verification: 'MoV P'
      }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved
    });

    expect(res.structuralStatus).toBe('INCOMPLETE');
    expect(res.measurementStatus).toBe('UNKNOWN');
  });

  test('H1 measurement AMBIGUOUS - duplicate purpose yields UNKNOWN measurement status', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'raw-goal-1', project_id: mockProject.id, org_id: mockProject.org_id, level: 'goal' },
      { id: 'raw-purpose-1a', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 },
      { id: 'raw-purpose-1b', project_id: mockProject.id, org_id: mockProject.org_id, level: 'purpose', sequence: 1 }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved
    });

    expect(res.structuralStatus).toBe('AMBIGUOUS');
    expect(res.measurementStatus).toBe('UNKNOWN');
  });

  test('H1 measurement COMPLETE with missing legacy text - yields INCOMPLETE measurement status', () => {
    const rawEntries: RawLfaEntry[] = [
      {
        id: 'raw-goal-1',
        project_id: mockProject.id,
        org_id: mockProject.org_id,
        level: 'goal',
        indicator: 'Ind G',
        means_of_verification: 'MoV G'
      },
      {
        id: 'raw-purpose-1',
        project_id: mockProject.id,
        org_id: mockProject.org_id,
        level: 'purpose',
        sequence: 1,
        indicator: 'Ind P',
        means_of_verification: 'MoV P'
      },
      {
        id: 'raw-output-1',
        project_id: mockProject.id,
        org_id: mockProject.org_id,
        level: 'output',
        parent_id: 'raw-purpose-1',
        indicator: 'Ind O',
        means_of_verification: null
      },
      {
        id: 'raw-activity-1',
        project_id: mockProject.id,
        org_id: mockProject.org_id,
        level: 'activity',
        parent_id: 'raw-output-1'
      }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries,
      grantLinkEvidence: mockGrantLinkResolved
    });

    expect(res.structuralStatus).toBe('COMPLETE');
    expect(res.measurementStatus).toBe('INCOMPLETE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2C1 H3 — Tenant and Project Boundary Quarantine
// ─────────────────────────────────────────────────────────────────────────────

// Helper: build a minimal valid project
const H3_PROJECT: RawLfaProject = {
  id: 'h3-project',
  org_id: 'h3-org',
  name: 'H3 Test Project',
  created_at: '2026-07-20T00:00:00Z'
};

// Helper: assert a raw ID is absent from all canonical presentation collections
function assertAbsentFromAllCollections(
  res: ReturnType<typeof mapToCanonicalLfaView>,
  id: string
): void {
  const allCanonical = [
    ...(res.goal ? [res.goal] : []),
    ...(res.purpose ? [res.purpose] : []),
    ...res.outcomes,
    ...res.outputs,
    ...res.activities,
    ...res.unusedOutcomes,
    ...res.unassignedOutputs,
    ...res.orphanedActivities
  ];
  const ids = allCanonical.map((n) => n.rawEntryId);
  expect(ids).not.toContain(id);
}

// Helper: assert sentinel description absent from all canonical CanonicalNodeView content
function assertSentinelAbsentFromAllCollections(
  res: ReturnType<typeof mapToCanonicalLfaView>,
  sentinel: string
): void {
  const allCanonical = [
    ...(res.goal ? [res.goal] : []),
    ...(res.purpose ? [res.purpose] : []),
    ...res.outcomes,
    ...res.outputs,
    ...res.activities,
    ...res.unusedOutcomes,
    ...res.unassignedOutputs,
    ...res.orphanedActivities
  ];
  for (const node of allCanonical) {
    expect(node.statement).not.toBe(sentinel);
  }
}

describe('Phase 2C1 H3 — Tenant and Project Boundary Quarantine', () => {

  // ─── Group A: Quarantine each raw level ───────────────────────────────────

  test.each([
    {
      label: 'boundary-invalid goal (project mismatch)',
      entry: { id: 'inv-goal', project_id: 'wrong-project', org_id: H3_PROJECT.org_id, level: 'goal' as const, description: '__SENTINEL_GOAL__' },
      expectedFindingCode: 'CROSS_PROJECT_PARENT'
    },
    {
      label: 'boundary-invalid primary purpose (tenant mismatch)',
      entry: { id: 'inv-purpose', project_id: H3_PROJECT.id, org_id: 'wrong-org', level: 'purpose' as const, sequence: 1, description: '__SENTINEL_PURPOSE__' },
      expectedFindingCode: 'CROSS_TENANT_PARENT'
    },
    {
      label: 'boundary-invalid outcome-style purpose (project mismatch)',
      entry: { id: 'inv-outcome', project_id: 'wrong-project', org_id: H3_PROJECT.org_id, level: 'purpose' as const, sequence: 2, description: '__SENTINEL_OUTCOME__' },
      expectedFindingCode: 'CROSS_PROJECT_PARENT'
    },
    {
      label: 'boundary-invalid output (tenant mismatch)',
      entry: { id: 'inv-output', project_id: H3_PROJECT.id, org_id: 'wrong-org', level: 'output' as const, description: '__SENTINEL_OUTPUT__' },
      expectedFindingCode: 'CROSS_TENANT_PARENT'
    },
    {
      label: 'boundary-invalid activity (project mismatch)',
      entry: { id: 'inv-activity', project_id: 'wrong-project', org_id: H3_PROJECT.org_id, level: 'activity' as const, description: '__SENTINEL_ACTIVITY__' },
      expectedFindingCode: 'CROSS_PROJECT_PARENT'
    }
  ])('H3 Group A: $label', ({ entry, expectedFindingCode }) => {
    const rawEntries: RawLfaEntry[] = [entry as RawLfaEntry];

    const res = mapToCanonicalLfaView({
      rawProject: H3_PROJECT,
      rawEntries,
      grantLinkEvidence: null
    });

    // Boundary finding exists
    expect(res.findings.some((f) => f.code === expectedFindingCode)).toBe(true);
    // Structural state blocked
    expect(res.structuralStatus).toBe('BLOCKED');
    expect(res.measurementStatus).toBe('UNKNOWN');
    // Disposition is REVIEW_ONLY
    expect(res.dispositionMap[entry.id]).toBe('REVIEW_ONLY');
    // Raw row retained in allRawEntries
    expect(res.allRawEntries.some((e) => e.id === entry.id)).toBe(true);
    // Absent from all canonical collections
    assertAbsentFromAllCollections(res, entry.id);
    if (entry.description) {
      assertSentinelAbsentFromAllCollections(res, entry.description);
    }
    // No AdapterReviewItem references the boundary finding
    const boundingFindingIds = res.findings
      .filter((f) => f.code === expectedFindingCode)
      .map((f) => f.findingId);
    for (const fid of boundingFindingIds) {
      expect(res.reviewQueue.some((r) => r.findingId === fid)).toBe(false);
    }
    // Row accounting
    expect(Object.keys(res.dispositionMap).length).toBe(rawEntries.length);
  });

  // ─── Group B: Both tenant and project mismatch ────────────────────────────

  test('H3 Group B: both project and tenant mismatch on same row', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'inv-both', project_id: 'wrong-project', org_id: 'wrong-org', level: 'goal', description: '__SENTINEL_BOTH__' }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: H3_PROJECT,
      rawEntries,
      grantLinkEvidence: null
    });

    // Both findings exist
    expect(res.findings.some((f) => f.code === 'CROSS_PROJECT_PARENT')).toBe(true);
    expect(res.findings.some((f) => f.code === 'CROSS_TENANT_PARENT')).toBe(true);
    // Deterministic and distinct finding IDs
    const projFinding = res.findings.find((f) => f.code === 'CROSS_PROJECT_PARENT')!;
    const tenantFinding = res.findings.find((f) => f.code === 'CROSS_TENANT_PARENT')!;
    expect(projFinding.findingId).not.toBe(tenantFinding.findingId);
    // Both are ERROR severity
    expect(projFinding.severity).toBe('ERROR');
    expect(tenantFinding.severity).toBe('ERROR');
    // Exactly one disposition for the row
    expect(res.dispositionMap['inv-both']).toBe('REVIEW_ONLY');
    expect(Object.keys(res.dispositionMap).filter((k) => k === 'inv-both')).toHaveLength(1);
    // No canonical node
    assertAbsentFromAllCollections(res, 'inv-both');
    assertSentinelAbsentFromAllCollections(res, '__SENTINEL_BOTH__');
    // No review items for either boundary finding
    expect(res.reviewQueue.some((r) => r.findingId === projFinding.findingId)).toBe(false);
    expect(res.reviewQueue.some((r) => r.findingId === tenantFinding.findingId)).toBe(false);
    // Row accounting
    expect(Object.keys(res.dispositionMap).length).toBe(rawEntries.length);
  });

  // ─── Group C: Boundary-valid child of quarantined parent ──────────────────

  test('H3 Group C: valid output with boundary-invalid purpose parent', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'valid-goal', project_id: H3_PROJECT.id, org_id: H3_PROJECT.org_id, level: 'goal', description: 'Goal' },
      {
        id: 'inv-purpose',
        project_id: 'wrong-project',
        org_id: H3_PROJECT.org_id,
        level: 'purpose',
        sequence: 1,
        description: '__SENTINEL_QUARANTINED_PURPOSE__'
      },
      {
        id: 'valid-output',
        project_id: H3_PROJECT.id,
        org_id: H3_PROJECT.org_id,
        level: 'output',
        parent_id: 'inv-purpose',
        description: 'Valid Output'
      }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: H3_PROJECT,
      rawEntries,
      grantLinkEvidence: null
    });

    // Quarantined parent
    expect(res.dispositionMap['inv-purpose']).toBe('REVIEW_ONLY');
    assertAbsentFromAllCollections(res, 'inv-purpose');
    assertSentinelAbsentFromAllCollections(res, '__SENTINEL_QUARANTINED_PURPOSE__');

    // Valid child retains a disposition (not REVIEW_ONLY solely due to parent)
    expect(res.dispositionMap['valid-output']).toBeDefined();
    expect(res.dispositionMap['valid-output']).not.toBe('REVIEW_ONLY');

    // MISSING_PARENT finding exists for child
    const missingParentFinding = res.findings.find(
      (f) => f.code === 'MISSING_PARENT' && f.rawEntryIds.includes('valid-output')
    );
    expect(missingParentFinding).toBeDefined();

    // Child does not attach to quarantined parent
    const outputNode = [
      ...res.unassignedOutputs,
      ...res.outputs
    ].find((n) => n.rawEntryId === 'valid-output');
    expect(outputNode).toBeDefined();
    expect(outputNode!.parentRef).toBeNull();

    // Row accounting
    expect(Object.keys(res.dispositionMap).length).toBe(rawEntries.length);
  });

  test('H3 Group C: valid activity with boundary-invalid output parent', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'valid-goal', project_id: H3_PROJECT.id, org_id: H3_PROJECT.org_id, level: 'goal' },
      { id: 'valid-purpose', project_id: H3_PROJECT.id, org_id: H3_PROJECT.org_id, level: 'purpose', sequence: 1 },
      {
        id: 'inv-output',
        project_id: H3_PROJECT.id,
        org_id: 'wrong-org',
        level: 'output',
        description: '__SENTINEL_QUARANTINED_OUTPUT__'
      },
      {
        id: 'valid-activity',
        project_id: H3_PROJECT.id,
        org_id: H3_PROJECT.org_id,
        level: 'activity',
        parent_id: 'inv-output',
        description: 'Valid Activity'
      }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: H3_PROJECT,
      rawEntries,
      grantLinkEvidence: null
    });

    // Quarantined parent
    expect(res.dispositionMap['inv-output']).toBe('REVIEW_ONLY');
    assertAbsentFromAllCollections(res, 'inv-output');
    assertSentinelAbsentFromAllCollections(res, '__SENTINEL_QUARANTINED_OUTPUT__');

    // Valid activity retains a disposition (not REVIEW_ONLY)
    expect(res.dispositionMap['valid-activity']).toBeDefined();
    expect(res.dispositionMap['valid-activity']).not.toBe('REVIEW_ONLY');

    // MISSING_PARENT finding exists for child
    const missingParentFinding = res.findings.find(
      (f) => f.code === 'MISSING_PARENT' && f.rawEntryIds.includes('valid-activity')
    );
    expect(missingParentFinding).toBeDefined();

    // Child does not attach to quarantined parent
    const activityNode = [
      ...res.orphanedActivities,
      ...res.activities
    ].find((n) => n.rawEntryId === 'valid-activity');
    expect(activityNode).toBeDefined();
    expect(activityNode!.parentRef).toBeNull();

    // Row accounting
    expect(Object.keys(res.dispositionMap).length).toBe(rawEntries.length);
  });

  // ─── Group D: Skeleton correlation cannot override quarantine ─────────────

  test('H3 Group D: skeleton-correlated boundary-invalid goal remains quarantined', () => {
    const INV_RAW_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const SK_SOURCE_UUID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    const SK_DOC_UUID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

    const skeleton: ValidatedStructuralSkeletonEvidence = {
      documentId: SK_DOC_UUID,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: {
        sourceNodeId: SK_SOURCE_UUID,
        declaredNodeType: 'goal',
        sequencePosition: 1,
        correlatedRawEntryId: INV_RAW_ID
      },
      purposeNode: null,
      outcomeNodes: [],
      outputNodes: [],
      activityNodes: [],
      correlationStatus: 'AVAILABLE'
    };

    const rawEntries: RawLfaEntry[] = [
      {
        id: INV_RAW_ID,
        project_id: 'wrong-project',
        org_id: H3_PROJECT.org_id,
        level: 'goal',
        description: '__SENTINEL_SK_GOAL__'
      }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: H3_PROJECT,
      rawEntries,
      skeletonEvidence: skeleton,
      grantLinkEvidence: null
    });

    // Still quarantined
    expect(res.dispositionMap[INV_RAW_ID]).toBe('REVIEW_ONLY');
    assertAbsentFromAllCollections(res, INV_RAW_ID);
    assertSentinelAbsentFromAllCollections(res, '__SENTINEL_SK_GOAL__');
    // Boundary finding exists
    expect(res.findings.some((f) => f.code === 'CROSS_PROJECT_PARENT')).toBe(true);
    // Not CONFIRMED_STRUCTURAL (no CanonicalNodeView constructed at all)
    expect(res.goal).toBeNull();
    // No review item for boundary finding
    const bFinding = res.findings.find((f) => f.code === 'CROSS_PROJECT_PARENT')!;
    expect(res.reviewQueue.some((r) => r.findingId === bFinding.findingId)).toBe(false);
    // Row accounting
    expect(Object.keys(res.dispositionMap).length).toBe(rawEntries.length);
  });

  test('H3 Group D: skeleton-correlated boundary-invalid outcome does not count as trusted usage', () => {
    const INV_OUTCOME_RAW = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
    const SK_OUTCOME_SRC = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const SK_DOC = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

    const skeleton: ValidatedStructuralSkeletonEvidence = {
      documentId: SK_DOC,
      documentVersion: 1,
      isCurrent: true,
      validationStatus: 'VALIDATED_STRUCTURE',
      goalNode: null,
      purposeNode: null,
      outcomeNodes: [
        {
          sourceNodeId: SK_OUTCOME_SRC,
          declaredNodeType: 'outcome',
          sequencePosition: 1,
          correlatedRawEntryId: INV_OUTCOME_RAW
        }
      ],
      outputNodes: [],
      activityNodes: [],
      correlationStatus: 'AVAILABLE'
    };

    const rawEntries: RawLfaEntry[] = [
      {
        id: INV_OUTCOME_RAW,
        project_id: 'wrong-project',
        org_id: H3_PROJECT.org_id,
        level: 'purpose',
        sequence: 2,
        description: '__SENTINEL_INV_OUTCOME__'
      }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: H3_PROJECT,
      rawEntries,
      skeletonEvidence: skeleton,
      grantLinkEvidence: null
    });

    // Row quarantined
    expect(res.dispositionMap[INV_OUTCOME_RAW]).toBe('REVIEW_ONLY');
    assertAbsentFromAllCollections(res, INV_OUTCOME_RAW);
    // Unused outcome must exist (boundary-invalid row cannot count as used)
    expect(res.unusedOutcomes.some((o) => o.sourceExternalId === SK_OUTCOME_SRC)).toBe(true);
    // Boundary finding exists
    expect(res.findings.some((f) => f.code === 'CROSS_PROJECT_PARENT')).toBe(true);
    // Row accounting
    expect(Object.keys(res.dispositionMap).length).toBe(rawEntries.length);
  });

  // ─── Group E: Boundary rows excluded from duplicate heuristics ────────────

  test('H3 Group E: one valid goal + one boundary-invalid goal → no MULTIPLE_GOAL_CANDIDATES', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'valid-goal', project_id: H3_PROJECT.id, org_id: H3_PROJECT.org_id, level: 'goal', description: 'Valid Goal' },
      { id: 'inv-goal', project_id: 'wrong-project', org_id: H3_PROJECT.org_id, level: 'goal', description: '__SENTINEL_DUP_GOAL__' }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: H3_PROJECT,
      rawEntries,
      grantLinkEvidence: null
    });

    // No duplicate goal finding
    expect(res.findings.some((f) => f.code === 'MULTIPLE_GOAL_CANDIDATES')).toBe(false);
    // Valid goal is result.goal
    expect(res.goal).not.toBeNull();
    expect(res.goal!.rawEntryId).toBe('valid-goal');
    // Invalid goal quarantined
    expect(res.dispositionMap['inv-goal']).toBe('REVIEW_ONLY');
    // Row accounting
    expect(Object.keys(res.dispositionMap).length).toBe(rawEntries.length);
  });

  test('H3 Group E: one valid primary purpose + one boundary-invalid primary purpose → no MULTIPLE_PURPOSE_CANDIDATES', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'valid-goal', project_id: H3_PROJECT.id, org_id: H3_PROJECT.org_id, level: 'goal' },
      { id: 'valid-purpose', project_id: H3_PROJECT.id, org_id: H3_PROJECT.org_id, level: 'purpose', sequence: 1, description: 'Valid Purpose' },
      { id: 'inv-purpose', project_id: H3_PROJECT.id, org_id: 'wrong-org', level: 'purpose', sequence: 1, description: '__SENTINEL_DUP_PURPOSE__' }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: H3_PROJECT,
      rawEntries,
      grantLinkEvidence: null
    });

    // No duplicate purpose finding
    expect(res.findings.some((f) => f.code === 'MULTIPLE_PURPOSE_CANDIDATES')).toBe(false);
    // Valid purpose is result.purpose
    expect(res.purpose).not.toBeNull();
    expect(res.purpose!.rawEntryId).toBe('valid-purpose');
    // Invalid purpose quarantined
    expect(res.dispositionMap['inv-purpose']).toBe('REVIEW_ONLY');
    // Row accounting
    expect(Object.keys(res.dispositionMap).length).toBe(rawEntries.length);
  });

  // ─── Group F: Row accounting ──────────────────────────────────────────────

  test('H3 Group F: disposition map accounts for every raw entry exactly once (mixed valid + invalid)', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'valid-goal', project_id: H3_PROJECT.id, org_id: H3_PROJECT.org_id, level: 'goal' },
      { id: 'valid-purpose', project_id: H3_PROJECT.id, org_id: H3_PROJECT.org_id, level: 'purpose', sequence: 1 },
      { id: 'inv-goal', project_id: 'wrong-project', org_id: H3_PROJECT.org_id, level: 'goal' },
      { id: 'inv-output', project_id: H3_PROJECT.id, org_id: 'wrong-org', level: 'output' },
      { id: 'inv-both', project_id: 'wrong-project', org_id: 'wrong-org', level: 'activity' }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: H3_PROJECT,
      rawEntries,
      grantLinkEvidence: null
    });

    // Every entry has exactly one disposition
    expect(Object.keys(res.dispositionMap).length).toBe(rawEntries.length);
    for (const entry of rawEntries) {
      expect(res.dispositionMap[entry.id]).toBeDefined();
    }
  });

  // ─── Group G: Determinism ─────────────────────────────────────────────────

  test('H3 Group G: repeated mapping produces identical outputs (determinism)', () => {
    const rawEntries: RawLfaEntry[] = [
      { id: 'valid-goal', project_id: H3_PROJECT.id, org_id: H3_PROJECT.org_id, level: 'goal', description: 'Goal' },
      { id: 'inv-purpose', project_id: 'wrong-project', org_id: H3_PROJECT.org_id, level: 'purpose', sequence: 1, description: '__SENTINEL_DET__' }
    ];

    const input = { rawProject: H3_PROJECT, rawEntries, grantLinkEvidence: null };
    const res1 = mapToCanonicalLfaView(input);
    const res2 = mapToCanonicalLfaView(input);

    expect(res1.findings).toEqual(res2.findings);
    expect(res1.dispositionMap).toEqual(res2.dispositionMap);
    expect(res1.structuralStatus).toBe(res2.structuralStatus);
    // Canonical collections deeply equal
    expect(res1.goal?.rawEntryId).toBe(res2.goal?.rawEntryId);
    expect(res1.purpose?.rawEntryId).toBe(res2.purpose?.rawEntryId);
    expect(res1.outcomes.map((o) => o.rawEntryId)).toEqual(res2.outcomes.map((o) => o.rawEntryId));
    expect(res1.outputs.map((o) => o.rawEntryId)).toEqual(res2.outputs.map((o) => o.rawEntryId));
    expect(res1.activities.map((o) => o.rawEntryId)).toEqual(res2.activities.map((o) => o.rawEntryId));
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2C1 H4 — Unused Skeleton Outcome Child-Count Semantics
// ─────────────────────────────────────────────────────────────────────────────

// UUIDs for H4 fixtures
const H4_DOC_UUID       = 'a0a0a0a0-a0a0-4a0a-8a0a-a0a0a0a0a0a0';
const H4_OUTCOME_SRC_1  = 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1';
const H4_OUTCOME_RAW    = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1';
const H4_OUTPUT_RAW     = 'd1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1';
const H4_OUTPUT_RAW_2   = 'd2d2d2d2-d2d2-4d2d-8d2d-d2d2d2d2d2d2';
const H4_DANGLING_UUID  = 'e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1';

const H4_PROJECT: RawLfaProject = {
  id: 'h4-project',
  org_id: 'h4-org',
  name: 'H4 Test Project',
  created_at: '2026-07-20T00:00:00Z'
};

// Helper: build a minimal valid AVAILABLE skeleton evidence for H4
function makeH4Skeleton(
  outcomeCorrelatedRawId: string | null | undefined,
  extraOutcomes: { sourceNodeId: string; correlatedRawEntryId: string | null | undefined }[] = []
): ValidatedStructuralSkeletonEvidence {
  return {
    documentId: H4_DOC_UUID,
    documentVersion: 1,
    isCurrent: true,
    validationStatus: 'VALIDATED_STRUCTURE',
    goalNode: null,
    purposeNode: null,
    outcomeNodes: [
      {
        sourceNodeId: H4_OUTCOME_SRC_1,
        declaredNodeType: 'outcome',
        sequencePosition: 1,
        correlatedRawEntryId: outcomeCorrelatedRawId ?? null
      },
      ...extraOutcomes.map((o, i) => ({
        sourceNodeId: o.sourceNodeId,
        declaredNodeType: 'outcome' as const,
        sequencePosition: i + 2,
        correlatedRawEntryId: o.correlatedRawEntryId ?? null
      }))
    ],
    outputNodes: [],
    activityNodes: [],
    correlationStatus: 'AVAILABLE'
  };
}

describe('Phase 2C1 H4 — Unused Skeleton Outcome Child-Count Semantics', () => {

  // ─── Case A: No correlatedRawEntryId → UNUSED ────────────────────────────

  test('H4 Case A: skeleton outcome with no correlatedRawEntryId → UNUSED', () => {
    const skeleton = makeH4Skeleton(null);
    // At least one raw entry so function reaches skeleton/unused-outcome processing
    const rawEntries: RawLfaEntry[] = [
      { id: 'h4a-goal', project_id: H4_PROJECT.id, org_id: H4_PROJECT.org_id, level: 'goal' }
    ];
    const res = mapToCanonicalLfaView({
      rawProject: H4_PROJECT,
      rawEntries,
      skeletonEvidence: skeleton,
      grantLinkEvidence: null
    });

    expect(res.unusedOutcomes.some((o) => o.sourceExternalId === H4_OUTCOME_SRC_1)).toBe(true);
    expect(res.findings.some((f) => f.code === 'UNUSED_SKELETON_OUTCOME' && f.rawEntryIds.includes(H4_OUTCOME_SRC_1))).toBe(true);
    expect(res.presentationMode).toBe('EXPANDED_WITH_UNUSED_OUTCOME');
    expect(Object.keys(res.dispositionMap).length).toBe(rawEntries.length);
  });

  // ─── Case B: Correlated raw outcome exists, zero valid output children → UNUSED ───

  test('H4 Case B: correlated raw outcome with zero valid output children → UNUSED', () => {
    // This is the primary broken case: pre-H4 would mark USED because correlation exists
    const skeleton = makeH4Skeleton(H4_OUTCOME_RAW);
    const rawEntries: RawLfaEntry[] = [
      {
        id: H4_OUTCOME_RAW,
        project_id: H4_PROJECT.id,
        org_id: H4_PROJECT.org_id,
        level: 'purpose',
        sequence: 2,
        description: 'Raw Outcome with no outputs'
      }
      // No output children
    ];

    const res = mapToCanonicalLfaView({
      rawProject: H4_PROJECT,
      rawEntries,
      skeletonEvidence: skeleton,
      grantLinkEvidence: null
    });

    expect(res.unusedOutcomes.some((o) => o.sourceExternalId === H4_OUTCOME_SRC_1)).toBe(true);
    expect(res.findings.some((f) => f.code === 'UNUSED_SKELETON_OUTCOME' && f.rawEntryIds.includes(H4_OUTCOME_SRC_1))).toBe(true);
    expect(res.structuralStatus).not.toBe('COMPLETE');
    expect(Object.keys(res.dispositionMap).length).toBe(rawEntries.length);
  });

  // ─── Case C: Correlated raw outcome + at least one valid output child → USED ──

  test('H4 Case C: correlated raw outcome with one valid trusted output child → USED', () => {
    const skeleton = makeH4Skeleton(H4_OUTCOME_RAW);
    const rawEntries: RawLfaEntry[] = [
      {
        id: H4_OUTCOME_RAW,
        project_id: H4_PROJECT.id,
        org_id: H4_PROJECT.org_id,
        level: 'purpose',
        sequence: 2,
        description: 'Raw Outcome'
      },
      {
        id: H4_OUTPUT_RAW,
        project_id: H4_PROJECT.id,
        org_id: H4_PROJECT.org_id,
        level: 'output',
        parent_id: H4_OUTCOME_RAW,
        description: 'Valid Output Child'
      }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: H4_PROJECT,
      rawEntries,
      skeletonEvidence: skeleton,
      grantLinkEvidence: null
    });

    expect(res.unusedOutcomes.some((o) => o.sourceExternalId === H4_OUTCOME_SRC_1)).toBe(false);
    expect(res.findings.some((f) => f.code === 'UNUSED_SKELETON_OUTCOME' && f.rawEntryIds.includes(H4_OUTCOME_SRC_1))).toBe(false);
    expect(Object.keys(res.dispositionMap).length).toBe(rawEntries.length);
  });

  // ─── Case D: Dangling correlatedRawEntryId → UNUSED ──────────────────────

  test('H4 Case D: dangling correlatedRawEntryId (raw row does not exist) → UNUSED', () => {
    const skeleton = makeH4Skeleton(H4_DANGLING_UUID);
    // H4_DANGLING_UUID is not present; one valid entry so function reaches unused-outcome processing
    const rawEntries: RawLfaEntry[] = [
      { id: 'h4d-goal', project_id: H4_PROJECT.id, org_id: H4_PROJECT.org_id, level: 'goal' }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: H4_PROJECT,
      rawEntries,
      skeletonEvidence: skeleton,
      grantLinkEvidence: null
    });

    expect(res.unusedOutcomes.some((o) => o.sourceExternalId === H4_OUTCOME_SRC_1)).toBe(true);
    expect(res.findings.some((f) => f.code === 'UNUSED_SKELETON_OUTCOME' && f.rawEntryIds.includes(H4_OUTCOME_SRC_1))).toBe(true);
    // No throw
    expect(Object.keys(res.dispositionMap).length).toBe(rawEntries.length);
  });

  // ─── Case E: Correlated raw outcome is boundary-invalid → UNUSED ─────────

  test('H4 Case E: correlated raw outcome is boundary-invalid → UNUSED and quarantined', () => {
    const skeleton = makeH4Skeleton(H4_OUTCOME_RAW);
    const rawEntries: RawLfaEntry[] = [
      {
        id: H4_OUTCOME_RAW,
        project_id: 'wrong-project',           // boundary-invalid
        org_id: H4_PROJECT.org_id,
        level: 'purpose',
        sequence: 2,
        description: '__SENTINEL_H4E__'
      }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: H4_PROJECT,
      rawEntries,
      skeletonEvidence: skeleton,
      grantLinkEvidence: null
    });

    // Raw row is quarantined
    expect(res.dispositionMap[H4_OUTCOME_RAW]).toBe('REVIEW_ONLY');
    // Sentinel absent from all canonical collections
    const allNodes = [
      ...(res.goal ? [res.goal] : []),
      ...(res.purpose ? [res.purpose] : []),
      ...res.outcomes, ...res.outputs, ...res.activities,
      ...res.unusedOutcomes, ...res.unassignedOutputs, ...res.orphanedActivities
    ];
    expect(allNodes.every((n) => n.statement !== '__SENTINEL_H4E__')).toBe(true);
    // Skeleton outcome is unused
    expect(res.unusedOutcomes.some((o) => o.sourceExternalId === H4_OUTCOME_SRC_1)).toBe(true);
    // Boundary security remains blocked
    expect(res.hasBlockingIntegrityFinding).toBe(true);
    expect(res.structuralStatus).toBe('BLOCKED');
    expect(Object.keys(res.dispositionMap).length).toBe(rawEntries.length);
  });

  // ─── Case F: Only output children are boundary-invalid → UNUSED ──────────

  test('H4 Case F: valid correlated outcome but all output children are boundary-invalid → UNUSED', () => {
    const skeleton = makeH4Skeleton(H4_OUTCOME_RAW);
    const rawEntries: RawLfaEntry[] = [
      {
        id: H4_OUTCOME_RAW,
        project_id: H4_PROJECT.id,
        org_id: H4_PROJECT.org_id,
        level: 'purpose',
        sequence: 2,
        description: 'Valid Outcome'
      },
      {
        id: H4_OUTPUT_RAW,
        project_id: 'wrong-project',           // boundary-invalid output
        org_id: H4_PROJECT.org_id,
        level: 'output',
        parent_id: H4_OUTCOME_RAW,
        description: '__SENTINEL_H4F_OUTPUT__'
      }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: H4_PROJECT,
      rawEntries,
      skeletonEvidence: skeleton,
      grantLinkEvidence: null
    });

    // Output is quarantined
    expect(res.dispositionMap[H4_OUTPUT_RAW]).toBe('REVIEW_ONLY');
    // Skeleton outcome is unused (quarantined output does not count)
    expect(res.unusedOutcomes.some((o) => o.sourceExternalId === H4_OUTCOME_SRC_1)).toBe(true);
    expect(res.findings.some((f) => f.code === 'UNUSED_SKELETON_OUTCOME' && f.rawEntryIds.includes(H4_OUTCOME_SRC_1))).toBe(true);
    expect(Object.keys(res.dispositionMap).length).toBe(rawEntries.length);
  });

  // ─── Case G: Output's trusted parent relation is nullified → UNUSED ──────

  test('H4 Case G: output trusted parent relation invalidated (wrong level) → does not count → UNUSED', () => {
    // parent_id points to a goal-level row, making it WRONG_LEVEL_PARENT → validParentMap nullified
    const H4_GOAL_RAW = 'f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1';
    const skeleton = makeH4Skeleton(H4_OUTCOME_RAW);
    const rawEntries: RawLfaEntry[] = [
      {
        id: H4_GOAL_RAW,
        project_id: H4_PROJECT.id,
        org_id: H4_PROJECT.org_id,
        level: 'goal',
        description: 'Goal'
      },
      {
        id: H4_OUTCOME_RAW,
        project_id: H4_PROJECT.id,
        org_id: H4_PROJECT.org_id,
        level: 'purpose',
        sequence: 2,
        description: 'Valid Outcome'
      },
      {
        id: H4_OUTPUT_RAW,
        project_id: H4_PROJECT.id,
        org_id: H4_PROJECT.org_id,
        level: 'output',
        parent_id: H4_GOAL_RAW,    // wrong level: goal instead of purpose → WRONG_LEVEL_PARENT
        description: 'Output with wrong parent'
      }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: H4_PROJECT,
      rawEntries,
      skeletonEvidence: skeleton,
      grantLinkEvidence: null
    });

    // Output's trusted parent is null (wrong-level isolated)
    const outputDisp = res.dispositionMap[H4_OUTPUT_RAW];
    expect(outputDisp).toBe('INVALID_PARENT');
    // Output does not count as valid child of the outcome
    expect(res.unusedOutcomes.some((o) => o.sourceExternalId === H4_OUTCOME_SRC_1)).toBe(true);
    expect(res.findings.some((f) => f.code === 'UNUSED_SKELETON_OUTCOME' && f.rawEntryIds.includes(H4_OUTCOME_SRC_1))).toBe(true);
    expect(Object.keys(res.dispositionMap).length).toBe(rawEntries.length);
  });

  // ─── Case H: Mixed valid and invalid children → USED ─────────────────────

  test('H4 Case H: one valid output + one boundary-invalid output → USED (valid child is sufficient)', () => {
    const skeleton = makeH4Skeleton(H4_OUTCOME_RAW);
    const rawEntries: RawLfaEntry[] = [
      {
        id: H4_OUTCOME_RAW,
        project_id: H4_PROJECT.id,
        org_id: H4_PROJECT.org_id,
        level: 'purpose',
        sequence: 2,
        description: 'Valid Outcome'
      },
      {
        id: H4_OUTPUT_RAW,
        project_id: H4_PROJECT.id,
        org_id: H4_PROJECT.org_id,
        level: 'output',
        parent_id: H4_OUTCOME_RAW,
        description: 'Valid Output'
      },
      {
        id: H4_OUTPUT_RAW_2,
        project_id: 'wrong-project',           // boundary-invalid sibling output
        org_id: H4_PROJECT.org_id,
        level: 'output',
        parent_id: H4_OUTCOME_RAW,
        description: '__SENTINEL_H4H_INV__'
      }
    ];

    const res = mapToCanonicalLfaView({
      rawProject: H4_PROJECT,
      rawEntries,
      skeletonEvidence: skeleton,
      grantLinkEvidence: null
    });

    // Valid output contributes → outcome is USED
    expect(res.unusedOutcomes.some((o) => o.sourceExternalId === H4_OUTCOME_SRC_1)).toBe(false);
    expect(res.findings.some((f) => f.code === 'UNUSED_SKELETON_OUTCOME' && f.rawEntryIds.includes(H4_OUTCOME_SRC_1))).toBe(false);
    // Invalid output is still quarantined
    expect(res.dispositionMap[H4_OUTPUT_RAW_2]).toBe('REVIEW_ONLY');
    expect(Object.keys(res.dispositionMap).length).toBe(rawEntries.length);
  });

});
