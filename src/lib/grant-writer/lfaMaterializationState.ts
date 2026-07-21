export type ExistingLfaEntryLevel = 'goal' | 'purpose' | 'output' | 'activity';

export type ExistingLfaEntryRow = {
  id: string;
  project_id: string;
  level: ExistingLfaEntryLevel;
  parent_id: string | null;
  sequence: number | null;
};

export type ExistingLfaMaterializationState =
  | { kind: 'EMPTY' }
  | { kind: 'COMPLETE_OR_EXISTING'; reason: string }
  | { kind: 'PARTIAL_UNSAFE'; reason: string };

const VALID_LEVELS: ExistingLfaEntryLevel[] = ['goal', 'purpose', 'output', 'activity'];

export function classifyExistingLfaMaterializationState(
  rows: ExistingLfaEntryRow[]
): ExistingLfaMaterializationState {
  if (rows.length === 0) {
    return { kind: 'EMPTY' };
  }

  const hasUnknownLevel = rows.some((row) => !VALID_LEVELS.includes(row.level));
  if (hasUnknownLevel) {
    return {
      kind: 'PARTIAL_UNSAFE',
      reason: 'level_tidak_dikenal',
    };
  }

  const rowById = new Map<string, ExistingLfaEntryRow>();
  for (const row of rows) {
    rowById.set(row.id, row);
  }

  const goals = rows.filter((row) => row.level === 'goal');
  const purposes = rows.filter((row) => row.level === 'purpose');
  const outputs = rows.filter((row) => row.level === 'output');
  const activities = rows.filter((row) => row.level === 'activity');

  if (goals.length === 0 && (purposes.length > 0 || outputs.length > 0 || activities.length > 0)) {
    return {
      kind: 'PARTIAL_UNSAFE',
      reason: 'goal_hilang',
    };
  }

  if (goals.length > 0 && purposes.length === 0) {
    return {
      kind: 'PARTIAL_UNSAFE',
      reason: 'purpose_hilang',
    };
  }

  if (purposes.length > 0 && goals.length === 0) {
    return {
      kind: 'PARTIAL_UNSAFE',
      reason: 'goal_hilang',
    };
  }

  if (outputs.length === 0 && (goals.length > 0 || purposes.length > 0 || activities.length > 0)) {
    return {
      kind: 'PARTIAL_UNSAFE',
      reason: 'output_hilang',
    };
  }

  for (const output of outputs) {
    if (!output.parent_id) {
      return {
        kind: 'PARTIAL_UNSAFE',
        reason: 'output_parent_hilang',
      };
    }

    const parent = rowById.get(output.parent_id);
    if (!parent || parent.level !== 'purpose') {
      return {
        kind: 'PARTIAL_UNSAFE',
        reason: 'output_parent_tidak_valid',
      };
    }
  }

  for (const activity of activities) {
    if (!activity.parent_id) {
      return {
        kind: 'PARTIAL_UNSAFE',
        reason: 'activity_parent_hilang',
      };
    }

    const parent = rowById.get(activity.parent_id);
    if (!parent || parent.level !== 'output') {
      return {
        kind: 'PARTIAL_UNSAFE',
        reason: 'activity_parent_tidak_valid',
      };
    }
  }

  if (goals.length > 0 && purposes.length > 0 && outputs.length > 0) {
    return {
      kind: 'COMPLETE_OR_EXISTING',
      reason: 'hierarki_lfa_sudah_ada',
    };
  }

  return {
    kind: 'PARTIAL_UNSAFE',
    reason: 'struktur_tidak_dapat_diklasifikasikan_aman',
  };
}
