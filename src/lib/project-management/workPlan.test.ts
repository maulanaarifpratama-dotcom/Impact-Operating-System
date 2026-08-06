import { describe, test, expect } from 'vitest';
import {
  buildWorkPlan,
  computeParentProgress,
  computeItemProgress,
  computeActivityBudget,
  resolveStageId,
  StageInput,
  WbsItemInput,
  BudgetItemInput,
} from './workPlan';

const makeWbs = (
  id: string,
  level: 1 | 2 | 3 | 4,
  parentId: string | null,
  overrides: Partial<WbsItemInput> = {},
): WbsItemInput => ({
  id,
  level,
  parent_id: parentId,
  name: overrides.name ?? `Item ${id}`,
  ...overrides,
});

const makeBudget = (
  id: string,
  wbsItemId: string,
  volume: number,
  unitPrice: number,
): BudgetItemInput => ({
  id,
  wbs_item_id: wbsItemId,
  volume,
  unit_price_idr: unitPrice,
});

const makeStage = (
  id: string,
  title: string,
  archived: boolean = false,
): StageInput => ({
  id,
  title,
  archived_at: archived ? new Date().toISOString() : null,
});

// ---- Tests ----

describe('canonical Work Plan adapter', () => {
  describe('buildWorkPlan', () => {
    test('groups Activities under correct Stages', () => {
      const stages = [makeStage('s1', 'Stage 1')];
      const wbs: WbsItemInput[] = [
        makeWbs('l1a', 1, null, { stage_id: 's1' }),
        makeWbs('act1', 2, 'l1a', { name: 'Activity 1' }),
        makeWbs('act2', 2, 'l1a', { name: 'Activity 2' }),
      ];
      const view = buildWorkPlan(stages, wbs, []);

      expect(view.stages).toHaveLength(1);
      expect(view.stages[0].title).toBe('Stage 1');
      expect(view.stages[0].activities).toHaveLength(2);
      expect(view.stages[0].activities[0].name).toBe('Activity 1');
      expect(view.stages[0].activities[1].name).toBe('Activity 2');
      expect(view.unassignedActivities).toHaveLength(0);
    });

    test('Level-1 technical container is hidden from output', () => {
      const stages = [makeStage('s1', 'Stage 1')];
      const wbs: WbsItemInput[] = [
        makeWbs('l1-hidden', 1, null, { stage_id: 's1', name: 'Hidden Container' }),
        makeWbs('act1', 2, 'l1-hidden', { name: 'Visible Activity' }),
      ];
      const view = buildWorkPlan(stages, wbs, []);

      expect(view.stages).toHaveLength(1);
      // The container itself should never appear
      const foundContainer = view.stages[0].activities.some(
        (a) => a.id === 'l1-hidden',
      );
      expect(foundContainer).toBe(false);
      expect(view.stages[0].activities[0].id).toBe('act1');
    });

    test('Level-2 maps to Activity', () => {
      const stages = [makeStage('s1', 'S1')];
      const wbs: WbsItemInput[] = [
        makeWbs('l1', 1, null, { stage_id: 's1' }),
        makeWbs('act1', 2, 'l1', { name: 'My Activity' }),
      ];
      const view = buildWorkPlan(stages, wbs, []);
      expect(view.stages[0].activities[0].id).toBe('act1');
    });

    test('Level-3 maps to Task', () => {
      const stages = [makeStage('s1', 'S1')];
      const wbs: WbsItemInput[] = [
        makeWbs('l1', 1, null, { stage_id: 's1' }),
        makeWbs('act1', 2, 'l1'),
        makeWbs('task1', 3, 'act1', { name: 'My Task' }),
      ];
      const view = buildWorkPlan(stages, wbs, []);
      expect(view.stages[0].activities[0].tasks).toHaveLength(1);
      expect(view.stages[0].activities[0].tasks[0].id).toBe('task1');
      expect(view.stages[0].activities[0].tasks[0].name).toBe('My Task');
    });

    test('Level-4 maps to Subtask', () => {
      const stages = [makeStage('s1', 'S1')];
      const wbs: WbsItemInput[] = [
        makeWbs('l1', 1, null, { stage_id: 's1' }),
        makeWbs('act1', 2, 'l1'),
        makeWbs('task1', 3, 'act1'),
        makeWbs('sub1', 4, 'task1', { name: 'My Subtask' }),
      ];
      const view = buildWorkPlan(stages, wbs, []);
      const subtasks = view.stages[0].activities[0].tasks[0].subtasks;
      expect(subtasks).toHaveLength(1);
      expect(subtasks[0].id).toBe('sub1');
      expect(subtasks[0].name).toBe('My Subtask');
    });

    test('unassigned Activities are visible when no Stage', () => {
      const stages: StageInput[] = [];
      const wbs: WbsItemInput[] = [
        makeWbs('l1', 1, null),
        makeWbs('act1', 2, 'l1', { name: 'Orphan Activity' }),
      ];
      const view = buildWorkPlan(stages, wbs, []);
      expect(view.unassignedActivities).toHaveLength(1);
      expect(view.unassignedActivities[0].name).toBe('Orphan Activity');
    });

    test('archived Stages are excluded', () => {
      const stages = [
        makeStage('s1', 'Active', false),
        makeStage('s2', 'Archived', true),
      ];
      const wbs: WbsItemInput[] = [
        makeWbs('l1a', 1, null, { stage_id: 's1' }),
        makeWbs('act1', 2, 'l1a', { name: 'Active Act' }),
        makeWbs('l1b', 1, null, { stage_id: 's2' }),
        makeWbs('act2', 2, 'l1b', { name: 'Archived Act' }),
      ];
      const view = buildWorkPlan(stages, wbs, []);
      expect(view.stages).toHaveLength(1);
      expect(view.stages[0].title).toBe('Active');
    });
  });

  describe('progress', () => {
    test('Activity progress rolls up from Tasks', () => {
      const wbs: WbsItemInput[] = [
        makeWbs('l1', 1, null),
        makeWbs('act1', 2, 'l1'),
        makeWbs('t1', 3, 'act1', { progress_percent: 30, status: 'in_progress' }),
        makeWbs('t2', 3, 'act1', { progress_percent: 70, status: 'in_progress' }),
      ];
      const view = buildWorkPlan([], wbs, []);
      expect(view.unassignedActivities[0].progress).toBe(50); // average
    });

    test('Task completed = 100%', () => {
      const wbs: WbsItemInput[] = [
        makeWbs('l1', 1, null),
        makeWbs('act1', 2, 'l1'),
        makeWbs('t1', 3, 'act1', { status: 'completed', progress_percent: 42 }),
      ];
      const view = buildWorkPlan([], wbs, []);
      expect(view.unassignedActivities[0].progress).toBe(100);
    });

    test('Activity without Tasks is manual progress', () => {
      const wbs: WbsItemInput[] = [
        makeWbs('l1', 1, null),
        makeWbs('act1', 2, 'l1', { progress_percent: 55, status: 'in_progress' }),
      ];
      const view = buildWorkPlan([], wbs, []);
      expect(view.unassignedActivities[0].progress).toBe(55);
    });

    test('Stage progress rolls up from Activities', () => {
      const stages = [makeStage('s1', 'S1')];
      const wbs: WbsItemInput[] = [
        makeWbs('l1', 1, null, { stage_id: 's1' }),
        makeWbs('act1', 2, 'l1', { progress_percent: 20, status: 'in_progress' }),
        makeWbs('act2', 2, 'l1', { progress_percent: 80, status: 'in_progress' }),
      ];
      const view = buildWorkPlan(stages, wbs, []);
      expect(view.stages[0].progress).toBe(50);
    });

    test('empty Stage progress is 0%', () => {
      const stages = [makeStage('s1', 'Empty Stage')];
      const view = buildWorkPlan(stages, [], []);
      expect(view.stages[0].progress).toBe(0);
    });

    test('cancelled items are excluded from progress', () => {
      const wbs: WbsItemInput[] = [
        makeWbs('l1', 1, null),
        makeWbs('act1', 2, 'l1'),
        makeWbs('t1', 3, 'act1', { progress_percent: 100, status: 'completed' }),
        makeWbs('t2', 3, 'act1', { progress_percent: 30, status: 'cancelled' }),
      ];
      const view = buildWorkPlan([], wbs, []);
      expect(view.unassignedActivities[0].progress).toBe(100); // only t1 counted
    });

    test('completed status forces 100% for leaf items', () => {
      const wbs: WbsItemInput[] = [
        makeWbs('l1', 1, null),
        makeWbs('act1', 2, 'l1'),
        makeWbs('t1', 3, 'act1', { status: 'completed', progress_percent: 30 }),
      ];
      expect(computeItemProgress(wbs[2], wbs)).toBe(100);
    });
  });

  describe('budget', () => {
    test('Activity Budget total is correct', () => {
      const wbs: WbsItemInput[] = [
        makeWbs('l1', 1, null),
        makeWbs('act1', 2, 'l1'),
      ];
      const budget: BudgetItemInput[] = [
        makeBudget('b1', 'act1', 10, 100000), // 1,000,000
        makeBudget('b2', 'act1', 5, 50000),   // 250,000
      ];
      const total = computeActivityBudget('act1', wbs, budget);
      expect(total).toBe(1_250_000);
    });

    test('budget item counted exactly once (no double-count)', () => {
      const wbs: WbsItemInput[] = [
        makeWbs('l1', 1, null),
        makeWbs('act1', 2, 'l1'),
      ];
      const budget: BudgetItemInput[] = [
        makeBudget('b1', 'act1', 2, 50000), // 100,000
      ];
      const view = buildWorkPlan([], wbs, budget);
      expect(view.unassignedActivities[0].budgetTotal).toBe(100_000);
      expect(view.projectBudgetTotal).toBe(100_000);
    });

    test('Stage Budget total is correct', () => {
      const stages = [makeStage('s1', 'S1')];
      const wbs: WbsItemInput[] = [
        makeWbs('l1', 1, null, { stage_id: 's1' }),
        makeWbs('act1', 2, 'l1'),
        makeWbs('act2', 2, 'l1'),
      ];
      const budget: BudgetItemInput[] = [
        makeBudget('b1', 'act1', 1, 100_000),  // 100k
        makeBudget('b2', 'act2', 2, 50_000),   // 100k
      ];
      const view = buildWorkPlan(stages, wbs, budget);
      expect(view.stages[0].budgetTotal).toBe(200_000);
    });

    test('moving Activity between Stages changes grouping only', () => {
      // Activity act1 is under Stage s1 via l1 -> stage_id s1.
      // If we change the Level-1 stage_id, it should appear under s2 instead.
      const stages = [makeStage('s1', 'S1'), makeStage('s2', 'S2')];
      const wbs: WbsItemInput[] = [
        makeWbs('l1', 1, null, { stage_id: 's1' }),
        makeWbs('act1', 2, 'l1'),
      ];
      const budget: BudgetItemInput[] = [
        makeBudget('b1', 'act1', 1, 50000),
      ];

      const view1 = buildWorkPlan(stages, wbs, budget);
      expect(view1.stages[0].activities).toHaveLength(1);
      expect(view1.stages[0].budgetTotal).toBe(50000);
      expect(view1.stages[1].activities).toHaveLength(0);

      // Move: change l1's stage_id
      const wbsMoved = wbs.map((w) =>
        w.id === 'l1' ? { ...w, stage_id: 's2' } : w,
      );
      const view2 = buildWorkPlan(stages, wbsMoved, budget);
      expect(view2.stages[0].activities).toHaveLength(0);
      expect(view2.stages[0].budgetTotal).toBe(0);
      expect(view2.stages[1].activities).toHaveLength(1);
      expect(view2.stages[1].budgetTotal).toBe(50000);
    });
  });

  describe('resolveStageId', () => {
    test('walks parent chain to Level-1 stage_id', () => {
      const wbs: WbsItemInput[] = [
        makeWbs('l1', 1, null, { stage_id: 'stg-123' }),
        makeWbs('act1', 2, 'l1'),
        makeWbs('t1', 3, 'act1'),
      ];
      expect(resolveStageId(wbs[2], wbs)).toBe('stg-123');
      expect(resolveStageId(wbs[1], wbs)).toBe('stg-123');
      expect(resolveStageId(wbs[0], wbs)).toBe('stg-123');
    });

    test('returns null for orphaned items', () => {
      const wbs: WbsItemInput[] = [
        makeWbs('l1', 1, null),
        makeWbs('act1', 2, 'l1'),
      ];
      expect(resolveStageId(wbs[1], wbs)).toBeNull();
    });
  });

  describe('computeParentProgress', () => {
    test('returns own progress when no children (leaf fallback)', () => {
      const wbs: WbsItemInput[] = [
        makeWbs('act1', 2, null, { progress_percent: 50 }),
      ];
      expect(computeParentProgress('act1', wbs)).toBe(50);
    });

    test('averages non-cancelled leaf descendants', () => {
      const wbs: WbsItemInput[] = [
        makeWbs('act1', 2, null),
        makeWbs('t1', 3, 'act1', { progress_percent: 25 }),
        makeWbs('t2', 3, 'act1', { progress_percent: 75 }),
      ];
      expect(computeParentProgress('act1', wbs)).toBe(50);
    });
  });

  describe('computeActivityBudget', () => {
    test('sums direct budget items', () => {
      const wbs = [makeWbs('act1', 2, null)];
      const budget = [makeBudget('b1', 'act1', 3, 1000)];
      expect(computeActivityBudget('act1', wbs, budget)).toBe(3000);
    });

    test('returns 0 for item with no budget', () => {
      const wbs = [makeWbs('act1', 2, null)];
      expect(computeActivityBudget('act1', wbs, [])).toBe(0);
    });

    test('includes descendant budget items', () => {
      const wbs: WbsItemInput[] = [
        makeWbs('act1', 2, null),
        makeWbs('t1', 3, 'act1'),
      ];
      const budget = [makeBudget('b1', 't1', 5, 200)];
      expect(computeActivityBudget('act1', wbs, budget)).toBe(1000);
    });
  });
});
