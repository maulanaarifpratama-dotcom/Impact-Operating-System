import { describe, expect, test } from 'vitest';
import {
  classifyExistingLfaMaterializationState,
  type ExistingLfaEntryRow,
} from './lfaMaterializationState';

function row(overrides: Partial<ExistingLfaEntryRow>): ExistingLfaEntryRow {
  return {
    id: 'id-default',
    project_id: 'lfa-project-1',
    level: 'goal',
    parent_id: null,
    sequence: 1,
    ...overrides,
  };
}

describe('classifyExistingLfaMaterializationState', () => {
  test('returns EMPTY when no rows exist', () => {
    expect(classifyExistingLfaMaterializationState([])).toEqual({ kind: 'EMPTY' });
  });

  test('returns PARTIAL_UNSAFE for goal and purpose only', () => {
    const rows = [
      row({ id: 'goal-1', level: 'goal' }),
      row({ id: 'purpose-1', level: 'purpose' }),
    ];

    expect(classifyExistingLfaMaterializationState(rows)).toEqual({
      kind: 'PARTIAL_UNSAFE',
      reason: 'output_hilang',
    });
  });

  test('returns PARTIAL_UNSAFE for goal only state', () => {
    const rows = [row({ id: 'goal-1', level: 'goal' })];

    expect(classifyExistingLfaMaterializationState(rows)).toEqual({
      kind: 'PARTIAL_UNSAFE',
      reason: 'purpose_hilang',
    });
  });

  test('returns PARTIAL_UNSAFE for orphan output', () => {
    const rows = [
      row({ id: 'goal-1', level: 'goal' }),
      row({ id: 'purpose-1', level: 'purpose' }),
      row({ id: 'output-1', level: 'output', parent_id: 'missing-purpose' }),
    ];

    expect(classifyExistingLfaMaterializationState(rows)).toEqual({
      kind: 'PARTIAL_UNSAFE',
      reason: 'output_parent_tidak_valid',
    });
  });

  test('returns PARTIAL_UNSAFE for orphan activity', () => {
    const rows = [
      row({ id: 'goal-1', level: 'goal' }),
      row({ id: 'purpose-1', level: 'purpose' }),
      row({ id: 'output-1', level: 'output', parent_id: 'purpose-1' }),
      row({ id: 'activity-1', level: 'activity', parent_id: 'missing-output' }),
    ];

    expect(classifyExistingLfaMaterializationState(rows)).toEqual({
      kind: 'PARTIAL_UNSAFE',
      reason: 'activity_parent_tidak_valid',
    });
  });

  test('returns COMPLETE_OR_EXISTING for goal purpose output without activities', () => {
    const rows = [
      row({ id: 'goal-1', level: 'goal' }),
      row({ id: 'purpose-1', level: 'purpose' }),
      row({ id: 'output-1', level: 'output', parent_id: 'purpose-1' }),
    ];

    expect(classifyExistingLfaMaterializationState(rows)).toEqual({
      kind: 'COMPLETE_OR_EXISTING',
      reason: 'hierarki_lfa_sudah_ada',
    });
  });
});
