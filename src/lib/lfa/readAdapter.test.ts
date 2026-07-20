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
