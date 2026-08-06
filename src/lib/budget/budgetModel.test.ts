import { describe, test, expect } from 'vitest';
import {
  computeBudgetSnapshot,
  computeStageBudgets,
  computeActivityBudgets,
  BudgetItemInput,
  WbsBudgetInput,
  StageBudgetInput,
} from './budgetModel';

const makeBudgetItem = (
  id: string,
  wbsItemId: string | null,
  volume: number,
  unitPrice: number,
  overrides: Partial<BudgetItemInput> = {},
): BudgetItemInput => ({
  id,
  wbs_item_id: wbsItemId,
  volume,
  unit_price_idr: unitPrice,
  ...overrides,
});

const makeWbs = (
  id: string,
  level: number,
  parentId: string | null,
  stageId: string | null = null,
): WbsBudgetInput => ({ id, level, parent_id: parentId, stage_id: stageId });

const makeStage = (id: string, title: string, archived = false): StageBudgetInput => ({
  id,
  title,
  archived_at: archived ? new Date().toISOString() : null,
});

describe('computeBudgetSnapshot', () => {
  test('volume × unit price', () => {
    const items = [makeBudgetItem('b1', null, 10, 50000)];
    const snap = computeBudgetSnapshot({ targetBudget: null, budgetItems: items, durationMonths: 12 });
    expect(snap.detailedBudget).toBe(500_000);
  });

  test('detailed total sums all items', () => {
    const items = [
      makeBudgetItem('b1', null, 2, 100000),
      makeBudgetItem('b2', null, 3, 50000),
    ];
    const snap = computeBudgetSnapshot({ targetBudget: null, budgetItems: items, durationMonths: 12 });
    expect(snap.detailedBudget).toBe(350_000);
  });

  test('coverage with target set', () => {
    const items = [makeBudgetItem('b1', null, 1, 500_000)];
    const snap = computeBudgetSnapshot({ targetBudget: 1_000_000, budgetItems: items, durationMonths: 12 });
    expect(snap.coveragePercent).toBe(50);
  });

  test('remaining gap', () => {
    const items = [makeBudgetItem('b1', null, 1, 300_000)];
    const snap = computeBudgetSnapshot({ targetBudget: 1_000_000, budgetItems: items, durationMonths: 12 });
    expect(snap.remainingGap).toBe(700_000);
  });

  test('over-allocation', () => {
    const items = [makeBudgetItem('b1', null, 1, 1_200_000)];
    const snap = computeBudgetSnapshot({ targetBudget: 1_000_000, budgetItems: items, durationMonths: 12 });
    expect(snap.overAllocation).toBe(200_000);
  });

  test('null target → no gap, 0% coverage', () => {
    const items = [makeBudgetItem('b1', null, 1, 500_000)];
    const snap = computeBudgetSnapshot({ targetBudget: null, budgetItems: items, durationMonths: 12 });
    expect(snap.hasTargetBudget).toBe(false);
    expect(snap.coveragePercent).toBe(0);
    expect(snap.remainingGap).toBeNull();
    expect(snap.overAllocation).toBe(0);
  });

  test('zero target → same as null', () => {
    const snap = computeBudgetSnapshot({ targetBudget: 0, budgetItems: [], durationMonths: 12 });
    expect(snap.hasTargetBudget).toBe(false);
  });

  test('empty budget → zeroes', () => {
    const snap = computeBudgetSnapshot({ targetBudget: 500_000, budgetItems: [], durationMonths: 12 });
    expect(snap.detailedBudget).toBe(0);
    expect(snap.coveragePercent).toBe(0);
    expect(snap.remainingGap).toBe(500_000);
    expect(snap.overAllocation).toBe(0);
  });

  test('realization sum', () => {
    const items = [
      makeBudgetItem('b1', null, 1, 100000, { actual_amount_idr: 40000 }),
      makeBudgetItem('b2', null, 2, 50000, { actual_amount_idr: 30000 }),
    ];
    const snap = computeBudgetSnapshot({ targetBudget: null, budgetItems: items, durationMonths: 12 });
    expect(snap.actualRealization).toBe(70_000);
    expect(snap.utilizationPercent).toBe((70_000 / 200_000) * 100);
  });

  test('burn rate uses duration months', () => {
    const items = [makeBudgetItem('b1', null, 1, 1_200_000)];
    const snap = computeBudgetSnapshot({ targetBudget: null, budgetItems: items, durationMonths: 6 });
    expect(snap.plannedBurnRate).toBe(200_000);
  });

  test('overhead', () => {
    const items = [
      makeBudgetItem('b1', null, 1, 500000, { cost_category: 'Indirect Costs/Overhead' }),
      makeBudgetItem('b2', null, 2, 50000),
    ];
    const snap = computeBudgetSnapshot({ targetBudget: null, budgetItems: items, durationMonths: 12 });
    expect(snap.overheadAmount).toBe(500_000);
    expect(snap.overheadPercent).toBe((500_000 / 600_000) * 100);
  });

  test('no NaN or Infinity', () => {
    const snap = computeBudgetSnapshot({ targetBudget: null, budgetItems: [], durationMonths: 0 });
    expect(Number.isFinite(snap.detailedBudget)).toBe(true);
    expect(Number.isFinite(snap.coveragePercent)).toBe(true);
    expect(Number.isFinite(snap.plannedBurnRate)).toBe(true);
  });
});

describe('computeStageBudgets', () => {
  test('aggregates by Stage via Level-1 ancestor', () => {
    const wbs = [
      makeWbs('l1a', 1, null, 's1'),
      makeWbs('act1', 2, 'l1a'),
      makeWbs('l1b', 1, null, 's2'),
      makeWbs('act2', 2, 'l1b'),
    ];
    const budget = [
      makeBudgetItem('b1', 'act1', 1, 100000),
      makeBudgetItem('b2', 'act2', 2, 50000),
    ];
    const stages = [makeStage('s1', 'Stage 1'), makeStage('s2', 'Stage 2')];
    const result = computeStageBudgets({ budgetItems: budget, wbsItems: wbs, stages });
    expect(result.rows[0].total).toBe(100_000);
    expect(result.rows[1].total).toBe(100_000);
    expect(result.unassignedTotal).toBe(0);
  });

  test('unassigned budget', () => {
    const wbs = [makeWbs('l1', 1, null, null), makeWbs('act1', 2, 'l1')];
    const budget = [makeBudgetItem('b1', 'act1', 1, 75_000)];
    const stages: StageBudgetInput[] = [];
    const result = computeStageBudgets({ budgetItems: budget, wbsItems: wbs, stages });
    expect(result.rows).toHaveLength(0);
    expect(result.unassignedTotal).toBe(75_000);
  });

  test('no double counting', () => {
    const wbs = [makeWbs('l1', 1, null, 's1'), makeWbs('act1', 2, 'l1')];
    const budget = [makeBudgetItem('b1', 'act1', 1, 50_000)];
    const stages = [makeStage('s1', 'S1')];
    const result = computeStageBudgets({ budgetItems: budget, wbsItems: wbs, stages });
    expect(result.rows[0].total).toBe(50_000);
    expect(result.unassignedTotal).toBe(0);
  });

  test('archived stages excluded', () => {
    const stages = [makeStage('s1', 'Active'), makeStage('s2', 'Archived', true)];
    const result = computeStageBudgets({ budgetItems: [], wbsItems: [], stages });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].title).toBe('Active');
  });

  test('moving Activity only changes Stage grouping', () => {
    // Original: l1a -> stage s1
    const wbs1 = [makeWbs('l1a', 1, null, 's1'), makeWbs('act1', 2, 'l1a')];
    const budget = [makeBudgetItem('b1', 'act1', 1, 50_000)];
    const stages = [makeStage('s1', 'S1'), makeStage('s2', 'S2')];
    const r1 = computeStageBudgets({ budgetItems: budget, wbsItems: wbs1, stages });
    expect(r1.rows[0].total).toBe(50_000);
    expect(r1.rows[1].total).toBe(0);

    // Moved: l1a -> stage s2
    const wbs2 = [makeWbs('l1a', 1, null, 's2'), makeWbs('act1', 2, 'l1a')];
    const r2 = computeStageBudgets({ budgetItems: budget, wbsItems: wbs2, stages });
    expect(r2.rows[0].total).toBe(0);
    expect(r2.rows[1].total).toBe(50_000);
  });
});

describe('computeActivityBudgets', () => {
  test('multiple items per Activity', () => {
    const wbs = [makeWbs('act1', 2, null)];
    const budget = [
      makeBudgetItem('b1', 'act1', 1, 10000),
      makeBudgetItem('b2', 'act1', 3, 20000),
    ];
    const result = computeActivityBudgets({ budgetItems: budget, wbsItems: wbs });
    expect(result[0].total).toBe(70_000);
    expect(result[0].budgetItemCount).toBe(2);
  });

  test('links to Activity via ancestor walk', () => {
    const wbs = [makeWbs('act1', 2, null), makeWbs('task1', 3, 'act1')];
    const budget = [makeBudgetItem('b1', 'task1', 5, 200)];
    const result = computeActivityBudgets({ budgetItems: budget, wbsItems: wbs });
    expect(result[0].total).toBe(1_000);
  });
});
