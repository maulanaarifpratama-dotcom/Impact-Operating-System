import { afterEach, describe, expect, test, vi } from 'vitest';
import * as readAdapter from './readAdapter';
import { buildEditorCanonicalLfaView } from './editorCanonicalBridge';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('editorCanonicalBridge', () => {
  test('preserves linked_grant_id on the raw project while keeping grantLinkEvidence null in this adoption slice', () => {
    const mapSpy = vi.spyOn(readAdapter, 'mapToCanonicalLfaView').mockImplementation((input) => ({
      rawProject: input.rawProject,
      allRawEntries: input.rawEntries,
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
      hasBlockingIntegrityFinding: false,
    }));

    buildEditorCanonicalLfaView({
      project: {
        id: 'bridge-project',
        org_id: 'bridge-org',
        name: 'Bridge Project',
        linked_grant_id: 'grant-1',
      },
      entries: [],
      skeletonEvidence: null,
    });

    expect(mapSpy).toHaveBeenCalledTimes(1);
    expect(mapSpy.mock.calls[0]?.[0].rawProject.linked_grant_id).toBe('grant-1');
    expect(mapSpy.mock.calls[0]?.[0].grantLinkEvidence).toBeNull();
  });

  test('maps editor project and entries into a frozen canonical view without mutating input', () => {
    const project = {
      id: 'bridge-project',
      org_id: 'bridge-org',
      name: 'Bridge Project',
      linked_grant_id: null,
      created_at: '2026-07-20T00:00:00Z'
    };
    const entries = [
      { id: 'goal-1', project_id: 'bridge-project', org_id: 'bridge-org', level: 'goal' as const, description: 'Goal' },
      { id: 'purpose-1', project_id: 'bridge-project', org_id: 'bridge-org', level: 'purpose' as const, sequence: 1, description: 'Purpose' },
      { id: 'output-1', project_id: 'bridge-project', org_id: 'bridge-org', level: 'output' as const, parent_id: 'purpose-1', description: 'Output' }
    ] as const;

    const inputEntries = entries.map((entry) => ({ ...entry }));
    const view = buildEditorCanonicalLfaView({ project, entries: inputEntries, skeletonEvidence: null });

    expect(inputEntries).toEqual(entries);
    expect(Object.isFrozen(inputEntries)).toBe(false);
    expect(Object.isFrozen(view)).toBe(true);
    expect(Object.isFrozen(view.allRawEntries)).toBe(true);
    expect(view.rawProject.id).toBe('bridge-project');
    expect(view.goal?.rawEntryId).toBe('goal-1');
    expect(view.purpose?.rawEntryId).toBe('purpose-1');
    expect(view.outputs).toHaveLength(1);
    expect(view.outputs[0].rawEntryId).toBe('output-1');
    expect(view.presentationMode).toBe('COMPACT_CONFIRMED');
  });

  test('returns EMPTY for empty entries and quarantines boundary-invalid rows', () => {
    const project = {
      id: 'bridge-project',
      org_id: 'bridge-org',
      name: 'Bridge Project'
    };

    const emptyView = buildEditorCanonicalLfaView({ project, entries: [], skeletonEvidence: null });
    expect(emptyView.presentationMode).toBe('EMPTY');
    expect(emptyView.structuralStatus).toBe('EMPTY');

    const quarantinedView = buildEditorCanonicalLfaView({
      project,
      entries: [
        { id: 'bad-goal', project_id: 'wrong-project', org_id: 'bridge-org', level: 'goal' }
      ],
      skeletonEvidence: null
    });

    expect(quarantinedView.dispositionMap['bad-goal']).toBe('REVIEW_ONLY');
    expect(Object.keys(quarantinedView.dispositionMap)).toHaveLength(1);
  });
});