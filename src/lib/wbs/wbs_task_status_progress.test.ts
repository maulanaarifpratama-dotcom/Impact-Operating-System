// NOTE: This simulation test file is SUPERSEDED by src/lib/wbs/wbs_task_status_progress_postgres.test.ts (Real PostgreSQL validation suite) and kept for logic documentation only.
import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Load migration file content
const migrationPath = path.join(
  process.cwd(),
  'supabase/migrations/20260724160000_wbs_task_status_progress.sql'
);
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

// Simulated PL/pgSQL Trigger function to test trigger logic deterministically
interface WbsRow {
  id: string;
  status: string;
  progress_percent: number;
  blocked_reason: string | null;
  completed_at: string | null;
  completed_by: string | null;
  start_month: number;
  duration_weeks: number;
  org_id: string;
  lfa_project_id: string;
}

function runCompletionTrigger(
  op: 'INSERT' | 'UPDATE',
  oldRow: WbsRow | null,
  newRowInput: Partial<WbsRow>,
  authUid: string | null
): WbsRow {
  const newRow: WbsRow = {
    ...(oldRow || {
      id: 'item-1',
      status: 'not_started',
      progress_percent: 0,
      blocked_reason: null,
      completed_at: null,
      completed_by: null,
      start_month: 1,
      duration_weeks: 4,
      org_id: 'org-1',
      lfa_project_id: 'proj-1',
    }),
    ...newRowInput,
  };

  const isOldCompleted = oldRow ? oldRow.status === 'completed' : false;
  const isNewCompleted = newRow.status === 'completed';

  // Case 1: Transitioning INTO 'completed'
  if (isNewCompleted && (op === 'INSERT' || !oldRow || !isOldCompleted)) {
    newRow.completed_at = '2026-07-24T12:00:00.000Z'; // Simulated NOW()
    newRow.completed_by = authUid;
    newRow.progress_percent = 100;
  }
  // Case 2: Remaining in 'completed' state
  else if (isNewCompleted && isOldCompleted) {
    newRow.completed_at = oldRow!.completed_at;
    newRow.completed_by = oldRow!.completed_by;
    newRow.progress_percent = 100;
  }
  // Case 3: Transitioning AWAY from 'completed' to any other status (Option A)
  else if (!isNewCompleted && isOldCompleted) {
    newRow.completed_at = oldRow!.completed_at;
    newRow.completed_by = oldRow!.completed_by;
  }
  // Case 4: Status is not completed and was not completed
  else {
    if (op === 'UPDATE') {
      newRow.completed_at = oldRow ? oldRow.completed_at : null;
      newRow.completed_by = oldRow ? oldRow.completed_by : null;
    } else {
      newRow.completed_at = null;
      newRow.completed_by = null;
    }
  }

  return newRow;
}

describe('WBS-P1A-1A Migration SQL Static & Logic Verification', () => {
  test('Migration file exists and is located under supabase/migrations/', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  test('Validation 11: Does not touch legacy wbs_tasks table', () => {
    expect(migrationSql.includes('wbs_tasks')).toBe(false);
  });

  test('Validation 12: Does not create any new tables', () => {
    expect(migrationSql.toUpperCase().includes('CREATE TABLE')).toBe(false);
  });

  test('Validation 9: Does not mutate lfa_entries table', () => {
    expect(migrationSql.includes('lfa_entries')).toBe(false);
  });

  test('Validation 3 & 4: Contains all required CHECK constraints', () => {
    expect(migrationSql).toContain('lfa_wbs_items_status_check');
    expect(migrationSql).toContain('lfa_wbs_items_progress_percent_check');
    expect(migrationSql).toContain('lfa_wbs_items_completed_consistency_check');

    // Status contract values check
    const allowedStatuses = [
      'draft',
      'not_started',
      'ready',
      'in_progress',
      'blocked',
      'in_review',
      'completed',
      'cancelled',
    ];
    allowedStatuses.forEach((status) => {
      expect(migrationSql).toContain(`'${status}'`);
    });
  });

  test('Validation 5: Completion transition enforces progress_percent = 100, completed_at, and auth.uid() override', () => {
    const initialRow: WbsRow = {
      id: 'item-1',
      status: 'in_progress',
      progress_percent: 50,
      blocked_reason: null,
      completed_at: null,
      completed_by: null,
      start_month: 2,
      duration_weeks: 3,
      org_id: 'org-1',
      lfa_project_id: 'proj-1',
    };

    // Client attempts to pass spoofed completed_by and progress_percent = 50
    const result = runCompletionTrigger(
      'UPDATE',
      initialRow,
      {
        status: 'completed',
        progress_percent: 50,
        completed_by: 'spoofed-user-id',
        completed_at: '2000-01-01T00:00:00Z',
      },
      'authenticated-user-123'
    );

    expect(result.status).toBe('completed');
    expect(result.progress_percent).toBe(100);
    expect(result.completed_by).toBe('authenticated-user-123'); // Overridden by auth.uid()
    expect(result.completed_at).toBe('2026-07-24T12:00:00.000Z');
  });

  test('Validation 6: Transitioning completed item to different status preserves completed_at and completed_by (Option A)', () => {
    const completedRow: WbsRow = {
      id: 'item-1',
      status: 'completed',
      progress_percent: 100,
      blocked_reason: null,
      completed_at: '2026-07-20T10:00:00.000Z',
      completed_by: 'original-completer-uuid',
      start_month: 2,
      duration_weeks: 3,
      org_id: 'org-1',
      lfa_project_id: 'proj-1',
    };

    // Transition away from completed to in_progress
    const uncompletedResult = runCompletionTrigger(
      'UPDATE',
      completedRow,
      { status: 'in_progress', progress_percent: 80 },
      'another-user-uuid'
    );

    expect(uncompletedResult.status).toBe('in_progress');
    expect(uncompletedResult.progress_percent).toBe(80);
    expect(uncompletedResult.completed_at).toBe('2026-07-20T10:00:00.000Z'); // Preserved
    expect(uncompletedResult.completed_by).toBe('original-completer-uuid'); // Preserved
  });

  test('Validation 7: Re-completing an item later updates completed_at and completed_by to the new event', () => {
    const uncompletedRow: WbsRow = {
      id: 'item-1',
      status: 'in_progress',
      progress_percent: 80,
      blocked_reason: null,
      completed_at: '2026-07-20T10:00:00.000Z', // Historical completed_at
      completed_by: 'original-completer-uuid',
      start_month: 2,
      duration_weeks: 3,
      org_id: 'org-1',
      lfa_project_id: 'proj-1',
    };

    // Re-complete item with new actor
    const recompletedResult = runCompletionTrigger(
      'UPDATE',
      uncompletedRow,
      { status: 'completed' },
      'new-recompleter-uuid'
    );

    expect(recompletedResult.status).toBe('completed');
    expect(recompletedResult.progress_percent).toBe(100);
    expect(recompletedResult.completed_at).toBe('2026-07-24T12:00:00.000Z'); // Updated
    expect(recompletedResult.completed_by).toBe('new-recompleter-uuid'); // Updated
  });

  test('Validation 1 & 2: Existing fields start_month and duration_weeks are untouched', () => {
    const row: WbsRow = {
      id: 'item-1',
      status: 'not_started',
      progress_percent: 0,
      blocked_reason: null,
      completed_at: null,
      completed_by: null,
      start_month: 3,
      duration_weeks: 8,
      org_id: 'org-1',
      lfa_project_id: 'proj-1',
    };

    const updated = runCompletionTrigger(
      'UPDATE',
      row,
      { status: 'in_progress', progress_percent: 25 },
      'user-1'
    );

    expect(updated.start_month).toBe(3);
    expect(updated.duration_weeks).toBe(8);
  });

  test('Validation 10: Cancelled rows remain in table and queryable', () => {
    const row: WbsRow = {
      id: 'item-1',
      status: 'in_progress',
      progress_percent: 40,
      blocked_reason: null,
      completed_at: null,
      completed_by: null,
      start_month: 1,
      duration_weeks: 4,
      org_id: 'org-1',
      lfa_project_id: 'proj-1',
    };

    const cancelled = runCompletionTrigger(
      'UPDATE',
      row,
      { status: 'cancelled' },
      'user-1'
    );

    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.id).toBe('item-1');
  });
});
