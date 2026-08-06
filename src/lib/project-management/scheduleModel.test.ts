import { describe, test, expect } from 'vitest';
import {
  computeWbsSchedule, computeStageSchedule, computeItemProgress,
  computeLeafProgress, buildVisibleRows,
  type WbsScheduleInput, type StageScheduleInput,
} from './scheduleModel';

const TODAY = new Date('2026-04-15');
const FAR_PAST = new Date('2026-01-15');
const STAGE: StageScheduleInput = { id: 's1', title: 'S1', planned_start_date: null, planned_end_date: null, status: 'not_started' };

function makeWbs(overrides: Partial<WbsScheduleInput> = {}): WbsScheduleInput {
  return {
    id: 'w1', level: 2, parentId: null, stageId: 's1', name: 'A1',
    status: 'not_started', startMonth: null, durationWeeks: null,
    plannedStartDate: '2026-01-01', plannedEndDate: '2026-01-28',
    actualStartDate: null, actualEndDate: null,
    blockedReason: null, ownerId: null, ...overrides,
  };
}

describe('computeLeafProgress', () => {
  test('incomplete is 0%', () => expect(computeLeafProgress('not_started')).toBe(0));
  test('completed is 100%', () => expect(computeLeafProgress('completed')).toBe(100));
  test('cancelled is 0%', () => expect(computeLeafProgress('cancelled')).toBe(0));
  test('in_progress is 0%', () => expect(computeLeafProgress('in_progress')).toBe(0));
});

describe('computeWbsSchedule', () => {
  test('planned dates produce correct schedule', () => {
    const s = computeWbsSchedule(makeWbs({ plannedStartDate: '2026-01-01', plannedEndDate: '2026-01-29' }));
    expect(s.missingSchedule).toBe(false);
    expect(s.derivedStartDate).not.toBeNull();
    expect(s.derivedFinishDate).not.toBeNull();
  });

  test('missing plannedStart → missing schedule', () => {
    const s = computeWbsSchedule(makeWbs({ plannedStartDate: null }));
    expect(s.missingSchedule).toBe(true);
  });

  test('missing plannedEnd → missing schedule', () => {
    const s = computeWbsSchedule(makeWbs({ plannedEndDate: null }));
    expect(s.missingSchedule).toBe(true);
  });

  test('overdue when finish past', () => {
    const s = computeWbsSchedule(makeWbs({ plannedStartDate: '2025-12-01', plannedEndDate: '2025-12-15' }), FAR_PAST);
    expect(s.state).toBe('overdue');
    expect(s.daysOverdue).toBeGreaterThan(0);
  });

  test('completed is not overdue', () => {
    const s = computeWbsSchedule(makeWbs({ plannedStartDate: '2025-12-01', plannedEndDate: '2025-12-15', status: 'completed' }), FAR_PAST);
    expect(s.state).toBe('completed');
  });

  test('cancelled is not overdue', () => {
    const s = computeWbsSchedule(makeWbs({ plannedStartDate: '2025-12-01', plannedEndDate: '2025-12-15', status: 'cancelled' }), FAR_PAST);
    expect(s.state).toBe('completed');
  });

  test('blocked has own state', () => {
    const s = computeWbsSchedule(makeWbs({ status: 'blocked' }), TODAY);
    expect(s.state).toBe('blocked');
  });

  test('no NaN', () => {
    const s = computeWbsSchedule(makeWbs());
    expect(isNaN(s.daysOverdue)).toBe(false);
  });
});

describe('computeStageSchedule', () => {
  const emptyWbs: WbsScheduleInput[] = [];

  test('derives from stage dates when no WBS items', () => {
    const s = computeStageSchedule({ ...STAGE, planned_start_date: '2026-01-01', planned_end_date: '2026-06-30' }, emptyWbs, TODAY);
    expect(s.missingSchedule).toBe(false);
  });

  test('missing all → missing', () => {
    const s = computeStageSchedule(STAGE, emptyWbs, TODAY);
    expect(s.missingSchedule).toBe(true);
  });

  test('overdue stage', () => {
    const s = computeStageSchedule({ ...STAGE, planned_start_date: '2026-01-01', planned_end_date: '2026-02-01' }, emptyWbs, TODAY);
    expect(s.state).toBe('overdue');
  });

  test('completed stage is not overdue', () => {
    const s = computeStageSchedule({ ...STAGE, planned_start_date: '2026-01-01', planned_end_date: '2026-02-01', status: 'completed' }, emptyWbs, TODAY);
    expect(s.state).toBe('completed');
  });

  test('derives from Activity dates when available', () => {
    const item = makeWbs({ id: 'a1', plannedStartDate: '2026-03-01', plannedEndDate: '2026-03-31' });
    const s = computeStageSchedule(STAGE, [item], TODAY);
    expect(s.missingSchedule).toBe(false);
    expect(s.derivedStartDate).not.toBeNull();
    expect(s.derivedFinishDate).not.toBeNull();
  });
});

describe('computeItemProgress', () => {
  test('completed leaf = 100%', () => {
    expect(computeItemProgress(makeWbs({ status: 'completed' }), [])).toBe(100);
  });
  test('incomplete leaf = 0%', () => {
    expect(computeItemProgress(makeWbs({ status: 'in_progress' }), [])).toBe(0);
  });
  test('task rollup from subtasks', () => {
    const p = makeWbs({ id: 't1', level: 3, status: 'not_started' });
    const s1 = makeWbs({ id: 's1', level: 4, parentId: 't1', status: 'completed' });
    const s2 = makeWbs({ id: 's2', level: 4, parentId: 't1', status: 'not_started' });
    expect(computeItemProgress(p, [p, s1, s2])).toBe(50);
  });
  test('cancelled child excluded', () => {
    const p = makeWbs({ id: 't2', level: 3, status: 'not_started' });
    const s1 = makeWbs({ id: 's3', level: 4, parentId: 't2', status: 'completed' });
    const s2 = makeWbs({ id: 's4', level: 4, parentId: 't2', status: 'cancelled' });
    expect(computeItemProgress(p, [p, s1, s2])).toBe(100);
  });
  test('activity rollup from tasks', () => {
    const a = makeWbs({ id: 'a1', level: 2, status: 'not_started' });
    const t1 = makeWbs({ id: 't1', level: 3, parentId: 'a1', status: 'completed' });
    const t2 = makeWbs({ id: 't2', level: 3, parentId: 'a1', status: 'not_started' });
    expect(computeItemProgress(a, [a, t1, t2])).toBe(50);
  });
});

describe('buildVisibleRows', () => {
  test('includes all Stage headers', () => {
    const rows = buildVisibleRows({ stages: [STAGE], wbsItems: [] });
    expect(rows.filter((r) => r.type === 'stage-header').length).toBe(1);
  });
  test('Activity has correct type', () => {
    const rows = buildVisibleRows({ stages: [STAGE], wbsItems: [makeWbs()] });
    expect(rows.filter((r) => r.type === 'activity').length).toBe(1);
  });
  test('Task follows Activity', () => {
    const a = makeWbs({ id: 'a1', level: 2 });
    const t = makeWbs({ id: 't1', level: 3, parentId: 'a1' });
    const rows = buildVisibleRows({ stages: [STAGE], wbsItems: [a, t] });
    expect(rows.findIndex((r) => r.wbsId === 'a1')).toBeLessThan(rows.findIndex((r) => r.wbsId === 't1'));
  });
  test('Subtask follows Task', () => {
    const a = makeWbs({ id: 'a2', level: 2 });
    const t = makeWbs({ id: 't2', level: 3, parentId: 'a2' });
    const s = makeWbs({ id: 's2', level: 4, parentId: 't2' });
    const rows = buildVisibleRows({ stages: [STAGE], wbsItems: [a, t, s] });
    const idx = [a, t, s].map((w) => rows.findIndex((r) => r.wbsId === w.id));
    expect(idx[0]).toBeLessThan(idx[1]);
    expect(idx[1]).toBeLessThan(idx[2]);
  });
  test('empty Stage has placeholder', () => {
    const rows = buildVisibleRows({ stages: [STAGE], wbsItems: [] });
    expect(rows.filter((r) => r.type === 'empty-stage').length).toBe(1);
  });
  test('unassigned appears under header', () => {
    const u = makeWbs({ stageId: null });
    const rows = buildVisibleRows({ stages: [STAGE], wbsItems: [u] });
    expect(rows.filter((r) => r.key === 'stage-unassigned').length).toBe(1);
    expect(rows.filter((r) => r.wbsId === u.id).length).toBe(1);
  });
  test('input arrays not mutated', () => {
    const s = [STAGE]; const w = [makeWbs()];
    const sc = JSON.stringify(s); const wc = JSON.stringify(w);
    buildVisibleRows({ stages: s, wbsItems: w });
    expect(JSON.stringify(s)).toBe(sc);
    expect(JSON.stringify(w)).toBe(wc);
  });
});
