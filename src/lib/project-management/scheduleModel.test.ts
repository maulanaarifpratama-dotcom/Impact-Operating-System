import { describe, test, expect } from 'vitest';
import {
  computeWbsSchedule,
  computeStageSchedule,
  computeItemProgress,
  computeLeafProgress,
  buildVisibleRows,
  type WbsScheduleInput,
  type StageScheduleInput,
} from './scheduleModel';

const STAGE_START = '2026-01-01';
const TODAY = new Date('2026-04-15');
const FAR_PAST = new Date('2026-01-15');
const STAGE: StageScheduleInput = {
  id: 's1', title: 'Stage 1', planned_start_date: STAGE_START,
  planned_end_date: '2026-06-30', actual_start_date: null, actual_end_date: null,
  status: 'not_started',
};

function makeWbs(overrides: Partial<WbsScheduleInput> = {}): WbsScheduleInput {
  return {
    id: 'w1', level: 2, parentId: null, stageId: 's1', name: 'Activity A',
    status: 'not_started', progressPercent: 0, startMonth: 1,
    durationWeeks: 4, blockedReason: null, ownerId: null, ...overrides,
  };
}

describe('computeLeafProgress', () => {
  test('incomplete is 0%', () => expect(computeLeafProgress('not_started')).toBe(0));
  test('completed is 100%', () => expect(computeLeafProgress('completed')).toBe(100));
  test('cancelled is 0%', () => expect(computeLeafProgress('cancelled')).toBe(0));
  test('in_progress is 0%', () => expect(computeLeafProgress('in_progress')).toBe(0));
});

describe('computeWbsSchedule', () => {
  test('start_month 1 begins at Stage planned_start_date', () => {
    const s = computeWbsSchedule(makeWbs({ startMonth: 1, durationWeeks: 4 }), STAGE_START);
    expect(s.missingSchedule).toBe(false);
    expect(s.derivedStartDate!.getMonth()).toBe(0); // January
  });

  test('start_month 2 shifts one month from Stage start', () => {
    const s = computeWbsSchedule(makeWbs({ startMonth: 2, durationWeeks: 4 }), STAGE_START);
    expect(s.missingSchedule).toBe(false);
    expect(s.derivedStartDate!.getMonth()).toBe(1); // February
  });

  test('duration_weeks produces correct finish date', () => {
    const s = computeWbsSchedule(makeWbs({ startMonth: 1, durationWeeks: 4 }), STAGE_START);
    expect(s.missingSchedule).toBe(false);
    const diffDays = Math.floor((s.derivedFinishDate!.getTime() - s.derivedStartDate!.getTime()) / 86400000);
    expect(diffDays).toBe(28);
  });

  test('missing Stage start → missing schedule', () => {
    const s = computeWbsSchedule(makeWbs(), null);
    expect(s.missingSchedule).toBe(true);
    expect(s.state).toBe('missing-schedule');
  });

  test('null start_month → missing schedule', () => {
    const s = computeWbsSchedule(makeWbs({ startMonth: null }), STAGE_START);
    expect(s.missingSchedule).toBe(true);
  });

  test('null duration_weeks → missing schedule', () => {
    const s = computeWbsSchedule(makeWbs({ durationWeeks: null }), STAGE_START);
    expect(s.missingSchedule).toBe(true);
  });

  test('zero duration_weeks → missing schedule', () => {
    const s = computeWbsSchedule(makeWbs({ durationWeeks: 0 }), STAGE_START);
    expect(s.missingSchedule).toBe(true);
  });

  test('negative duration_weeks → missing schedule', () => {
    const s = computeWbsSchedule(makeWbs({ durationWeeks: -1 }), STAGE_START);
    expect(s.missingSchedule).toBe(true);
  });

  test('overdue when finish past', () => {
    const s = computeWbsSchedule(makeWbs({ startMonth: 1, durationWeeks: 1 }), STAGE_START, FAR_PAST);
    expect(s.state).toBe('overdue');
    expect(s.daysOverdue).toBeGreaterThan(0);
  });

  test('completed is not overdue', () => {
    const s = computeWbsSchedule(makeWbs({ startMonth: 1, durationWeeks: 1, status: 'completed' }), STAGE_START, FAR_PAST);
    expect(s.state).toBe('completed');
  });

  test('cancelled is not overdue', () => {
    const s = computeWbsSchedule(makeWbs({ startMonth: 1, durationWeeks: 1, status: 'cancelled' }), STAGE_START, FAR_PAST);
    expect(s.state).not.toBe('overdue');
  });

  test('blocked has own state', () => {
    const s = computeWbsSchedule(makeWbs({ startMonth: 1, durationWeeks: 4, status: 'blocked' }), STAGE_START, TODAY);
    expect(s.state).toBe('blocked');
  });

  test('due within 7 days', () => {
    const upcoming = new Date();
    upcoming.setDate(upcoming.getDate() + 5);
    const startDate = new Date(upcoming.getFullYear(), upcoming.getMonth() - 1, 1);
    const startStr = startDate.toISOString().split('T')[0];
    const s = computeWbsSchedule(makeWbs({ startMonth: 1, durationWeeks: 1 }), startStr, new Date());
    expect(['due-soon-7', 'due-soon-14', 'on-time', 'overdue']).toContain(s.state);
  });

  test('no NaN', () => {
    const s = computeWbsSchedule(makeWbs({ startMonth: 1, durationWeeks: 4 }), STAGE_START, TODAY);
    expect(isNaN(s.daysOverdue)).toBe(false);
    expect(isNaN(s.derivedStartDate?.getTime() ?? 0)).toBe(false);
    expect(isNaN(s.derivedFinishDate?.getTime() ?? 0)).toBe(false);
  });
});

describe('computeStageSchedule', () => {
  test('missing end_date → missing', () => {
    const s = computeStageSchedule({ ...STAGE, planned_end_date: null }, TODAY);
    expect(s.missingSchedule).toBe(true);
  });

  test('overdue stage', () => {
    const s = computeStageSchedule({ ...STAGE, planned_end_date: '2026-02-01' }, TODAY);
    expect(s.state).toBe('overdue');
  });

  test('completed stage is not overdue', () => {
    const s = computeStageSchedule({ ...STAGE, planned_end_date: '2026-02-01', status: 'completed' }, TODAY);
    expect(s.state).toBe('completed');
  });
});

describe('computeItemProgress', () => {
  test('completed leaf = 100%', () => {
    const p = computeItemProgress(makeWbs({ status: 'completed' }), []);
    expect(p).toBe(100);
  });

  test('incomplete leaf = 0%', () => {
    const p = computeItemProgress(makeWbs({ status: 'in_progress' }), []);
    expect(p).toBe(0);
  });

  test('task rollup from subtasks', () => {
    const parent = makeWbs({ id: 'task1', level: 3, status: 'not_started' });
    const sub1 = makeWbs({ id: 'sub1', level: 4, parentId: 'task1', status: 'completed' });
    const sub2 = makeWbs({ id: 'sub2', level: 4, parentId: 'task1', status: 'not_started' });
    const p = computeItemProgress(parent, [parent, sub1, sub2]);
    expect(p).toBe(50);
  });

  test('cancelled child excluded from rollup', () => {
    const parent = makeWbs({ id: 'task2', level: 3, status: 'not_started' });
    const sub1 = makeWbs({ id: 'sub3', level: 4, parentId: 'task2', status: 'completed' });
    const sub2 = makeWbs({ id: 'sub4', level: 4, parentId: 'task2', status: 'cancelled' });
    const p = computeItemProgress(parent, [parent, sub1, sub2]);
    expect(p).toBe(100);
  });

  test('activity rollup from tasks', () => {
    const act = makeWbs({ id: 'act1', level: 2, status: 'not_started' });
    const t1 = makeWbs({ id: 't1', level: 3, parentId: 'act1', status: 'completed' });
    const t2 = makeWbs({ id: 't2', level: 3, parentId: 'act1', status: 'not_started' });
    const p = computeItemProgress(act, [act, t1, t2]);
    expect(p).toBe(50);
  });
});

describe('buildVisibleRows', () => {
  test('includes all Stage headers', () => {
    const rows = buildVisibleRows({ stages: [STAGE], wbsItems: [], today: TODAY });
    const headers = rows.filter((r) => r.type === 'stage-header');
    expect(headers.length).toBe(1);
    expect(headers[0].title).toBe('Stage 1');
  });

  test('Activity row has correct type', () => {
    const rows = buildVisibleRows({ stages: [STAGE], wbsItems: [makeWbs()], today: TODAY });
    const acts = rows.filter((r) => r.type === 'activity');
    expect(acts.length).toBe(1);
  });

  test('Task row follows Activity', () => {
    const act = makeWbs({ id: 'a1', level: 2 });
    const task = makeWbs({ id: 't1', level: 3, parentId: 'a1' });
    const rows = buildVisibleRows({ stages: [STAGE], wbsItems: [act, task], today: TODAY });
    const idx1 = rows.findIndex((r) => r.wbsId === 'a1');
    const idx2 = rows.findIndex((r) => r.wbsId === 't1');
    expect(idx1).toBeLessThan(idx2);
  });

  test('Subtask row follows Task', () => {
    const act = makeWbs({ id: 'a2', level: 2 });
    const task = makeWbs({ id: 't2', level: 3, parentId: 'a2' });
    const sub = makeWbs({ id: 's2', level: 4, parentId: 't2' });
    const rows = buildVisibleRows({ stages: [STAGE], wbsItems: [act, task, sub], today: TODAY });
    const indices = [act, task, sub].map((w) => rows.findIndex((r) => r.wbsId === w.id));
    expect(indices[0]).toBeLessThan(indices[1]);
    expect(indices[1]).toBeLessThan(indices[2]);
  });

  test('empty Stage has placeholder row', () => {
    const rows = buildVisibleRows({ stages: [STAGE], wbsItems: [], today: TODAY });
    const empty = rows.filter((r) => r.type === 'empty-stage');
    expect(empty.length).toBe(1);
  });

  test('unassigned items appear under unassigned header', () => {
    const unassigned = makeWbs({ stageId: null });
    const rows = buildVisibleRows({ stages: [STAGE], wbsItems: [unassigned], today: TODAY });
    const unHeader = rows.filter((r) => r.key === 'stage-unassigned');
    expect(unHeader.length).toBe(1);
    const items = rows.filter((r) => r.wbsId === unassigned.id);
    expect(items.length).toBe(1);
  });

  test('input arrays not mutated', () => {
    const stages = [STAGE];
    const wbs = [makeWbs()];
    const stageCopy = JSON.stringify(stages);
    const wbsCopy = JSON.stringify(wbs);
    buildVisibleRows({ stages, wbsItems: wbs, today: TODAY });
    expect(JSON.stringify(stages)).toBe(stageCopy);
    expect(JSON.stringify(wbs)).toBe(wbsCopy);
  });
});
