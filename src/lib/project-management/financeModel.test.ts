import { describe, test, expect } from 'vitest';
import {
  normalizeFinite,
  safePct,
  classifyFinanceHealth,
  determineRelationState,
  determineFinanceItemSource,
  classifyFinanceItemStatus,
  normalizeFinanceItem,
  classifyDataCompleteness,
  aggregateProjectFinance,
  type FinanceHealth,
  type FinanceItemRawInput,
  type FinanceItemViewModel,
} from './financeModel';

const makeRawItem = (
  overrides: Partial<FinanceItemRawInput> = {},
): FinanceItemRawInput => ({
  id: 'item-1',
  lfa_project_id: 'project-1',
  wbs_item_id: null,
  volume: 10,
  unit_price_idr: 10000,
  actual_amount_idr: null,
  mode: null,
  funding_source: null,
  ...overrides,
});

// ─── normalizeFinite ────────────────────────────────────────────────────────

describe('normalizeFinite', () => {
  test('returns null for non-number values', () => {
    expect(normalizeFinite(null)).toBeNull();
    expect(normalizeFinite(undefined)).toBeNull();
    expect(normalizeFinite('100')).toBeNull();
    expect(normalizeFinite({})).toBeNull();
  });

  test('returns null for NaN', () => {
    expect(normalizeFinite(NaN)).toBeNull();
  });

  test('returns null for Infinity', () => {
    expect(normalizeFinite(Infinity)).toBeNull();
    expect(normalizeFinite(-Infinity)).toBeNull();
  });

  test('returns the value for finite numbers', () => {
    expect(normalizeFinite(0)).toBe(0);
    expect(normalizeFinite(100)).toBe(100);
    expect(normalizeFinite(-50)).toBe(-50);
  });

  test('null is different from zero', () => {
    expect(normalizeFinite(null)).toBeNull();
    expect(normalizeFinite(0)).toBe(0);
  });
});

// ─── safePct ────────────────────────────────────────────────────────────────

describe('safePct', () => {
  test('returns 50% for 50 / 100', () => {
    expect(safePct(50, 100)).toBe(50);
  });

  test('returns null when numerator is null', () => {
    expect(safePct(null, 100)).toBeNull();
  });

  test('returns null when denominator is null', () => {
    expect(safePct(50, null)).toBeNull();
  });

  test('returns null when denominator is 0', () => {
    expect(safePct(50, 0)).toBeNull();
  });

  test('returns null when denominator is negative', () => {
    expect(safePct(50, -10)).toBeNull();
  });

  test('returns null when numerator is NaN', () => {
    expect(safePct(NaN, 100)).toBeNull();
  });

  test('returns null when denominator is Infinity', () => {
    expect(safePct(50, Infinity)).toBeNull();
  });
});

// ─── classifyFinanceHealth ──────────────────────────────────────────────────

describe('classifyFinanceHealth', () => {
  test('planned 100, actual 50 → healthy (util 50%)', () => {
    expect(classifyFinanceHealth(100, 50)).toBe('healthy');
  });

  test('planned 100, actual 85 → watch (util 85%)', () => {
    expect(classifyFinanceHealth(100, 85)).toBe('watch');
  });

  test('planned 100, actual 97 → critical (util 97%)', () => {
    expect(classifyFinanceHealth(100, 97)).toBe('critical');
  });

  test('planned 100, actual 101 → overspent', () => {
    expect(classifyFinanceHealth(100, 101)).toBe('overspent');
  });

  test('planned null → unknown', () => {
    expect(classifyFinanceHealth(null, 50)).toBe('unknown');
  });

  test('planned 0 → unknown', () => {
    expect(classifyFinanceHealth(0, 50)).toBe('unknown');
  });

  test('actual null → unknown', () => {
    expect(classifyFinanceHealth(100, null)).toBe('unknown');
  });

  test('both null → unknown', () => {
    expect(classifyFinanceHealth(null, null)).toBe('unknown');
  });

  test('planned 100, actual NaN → unknown', () => {
    expect(classifyFinanceHealth(100, NaN)).toBe('unknown');
  });

  test('variance negative when overspent', () => {
    const health = classifyFinanceHealth(100, 101);
    expect(health).toBe('overspent');
    // Verify variance is negative
    const planned = normalizeFinite(100);
    const actual = normalizeFinite(101);
    if (planned !== null && actual !== null) {
      expect(planned - actual).toBe(-1);
    }
  });

  test('at exactly 80% → healthy', () => {
    expect(classifyFinanceHealth(100, 80)).toBe('healthy');
  });

  test('at exactly 95% → watch (boundary)', () => {
    expect(classifyFinanceHealth(100, 95)).toBe('watch');
  });

  test('at exactly 100% → critical', () => {
    expect(classifyFinanceHealth(100, 100)).toBe('critical');
  });
});

// ─── determineRelationState ─────────────────────────────────────────────────

describe('determineRelationState', () => {
  test('no wbsItemId → unlinked', () => {
    expect(determineRelationState('project-1', null)).toBe('unlinked');
  });

  test('wbsItemId with same project → linked', () => {
    expect(determineRelationState('project-1', 'wbs-1', 'project-1')).toBe('linked');
  });

  test('wbsItemId with different project → invalid', () => {
    expect(determineRelationState('project-1', 'wbs-1', 'project-2')).toBe('invalid');
  });

  test('wbsItemId with null wbsProjectId → invalid (dangling)', () => {
    expect(determineRelationState('project-1', 'wbs-1', null)).toBe('invalid');
  });

  test('wbsItemId with undefined wbsProjectId → invalid', () => {
    expect(determineRelationState('project-1', 'wbs-1')).toBe('invalid');
  });
});

// ─── determineFinanceItemSource ─────────────────────────────────────────────

describe('determineFinanceItemSource', () => {
  test('no identifiable source → unknown', () => {
    expect(determineFinanceItemSource(null, null)).toBe('unknown');
    expect(determineFinanceItemSource('other', 'grant')).toBe('unknown');
  });

  test('programme_design mode → programme_design', () => {
    expect(determineFinanceItemSource('programme_design')).toBe('programme_design');
  });

  test('grantwriter mode → grantwriter_materialization', () => {
    expect(determineFinanceItemSource('grantwriter')).toBe('grantwriter_materialization');
  });

  test('grantwriter_materialization mode → grantwriter_materialization', () => {
    expect(determineFinanceItemSource('grantwriter_materialization')).toBe('grantwriter_materialization');
  });

  test('imported in fundingSource → imported', () => {
    expect(determineFinanceItemSource(null, 'imported')).toBe('imported');
  });

  test('programme_design in fundingSource → programme_design', () => {
    expect(determineFinanceItemSource(null, 'programme_design')).toBe('programme_design');
  });
});

// ─── classifyFinanceItemStatus ──────────────────────────────────────────────

describe('classifyFinanceItemStatus', () => {
  test('known statuses map correctly', () => {
    expect(classifyFinanceItemStatus('draft')).toBe('draft');
    expect(classifyFinanceItemStatus('active')).toBe('active');
    expect(classifyFinanceItemStatus('committed')).toBe('committed');
    expect(classifyFinanceItemStatus('partially_spent')).toBe('partially_spent');
    expect(classifyFinanceItemStatus('spent')).toBe('spent');
    expect(classifyFinanceItemStatus('cancelled')).toBe('cancelled');
  });

  test('null → unknown', () => {
    expect(classifyFinanceItemStatus(null)).toBe('unknown');
  });

  test('undefined → unknown', () => {
    expect(classifyFinanceItemStatus(undefined)).toBe('unknown');
  });

  test('unrecognized status → unknown with raw available', () => {
    expect(classifyFinanceItemStatus('some_future_status')).toBe('unknown');
  });
});

// ─── normalizeFinanceItem ───────────────────────────────────────────────────

describe('normalizeFinanceItem', () => {
  test('planned = volume × unit_price_idr', () => {
    const raw = makeRawItem({ volume: 5, unit_price_idr: 20000 });
    const item = normalizeFinanceItem(raw);
    expect(item.planned).toBe(100_000);
  });

  test('actual = actual_amount_idr when set', () => {
    const raw = makeRawItem({ volume: 5, unit_price_idr: 20000, actual_amount_idr: 40000 });
    const item = normalizeFinanceItem(raw);
    expect(item.actual).toBe(40000);
    expect(item.remaining).toBe(60_000);
  });

  test('committed is always null (unavailable)', () => {
    const raw = makeRawItem();
    const item = normalizeFinanceItem(raw);
    expect(item.committed).toBeNull();
    expect(item.commitmentPct).toBeNull();
  });

  test('utilizationPct correct when both available', () => {
    const raw = makeRawItem({ volume: 1, unit_price_idr: 100000, actual_amount_idr: 50000 });
    const item = normalizeFinanceItem(raw);
    expect(item.utilizationPct).toBe(50);
  });

  test('utilizationPct null when planned null (volume null)', () => {
    const raw = makeRawItem({ volume: null, unit_price_idr: 10000, actual_amount_idr: 5000 });
    const item = normalizeFinanceItem(raw);
    expect(item.planned).toBeNull();
    expect(item.utilizationPct).toBeNull();
    expect(item.health).toBe('unknown');
  });

  test('utilizationPct null when actual null', () => {
    const raw = makeRawItem({ volume: 1, unit_price_idr: 100000, actual_amount_idr: null });
    const item = normalizeFinanceItem(raw);
    expect(item.utilizationPct).toBeNull();
    expect(item.health).toBe('unknown');
  });

  test('no NaN or Infinity in output', () => {
    const raw = makeRawItem({ volume: 0, unit_price_idr: 0, actual_amount_idr: 0 });
    const item = normalizeFinanceItem(raw);
    expect(Number.isFinite(item.planned!)).toBe(true);
    expect(item.utilizationPct).toBeNull(); // planned=0 → null
    expect(item.health).toBe('unknown');
  });

  test('item without WBS → unlinked', () => {
    const raw = makeRawItem({ wbs_item_id: null });
    const item = normalizeFinanceItem(raw);
    expect(item.relationState).toBe('unlinked');
  });

  test('item with WBS same project → linked', () => {
    const raw = makeRawItem({ wbs_item_id: 'wbs-1' });
    const item = normalizeFinanceItem(raw, 'project-1');
    expect(item.relationState).toBe('linked');
  });

  test('item with WBS different project → invalid', () => {
    const raw = makeRawItem({ wbs_item_id: 'wbs-2' });
    const item = normalizeFinanceItem(raw, 'project-2');
    expect(item.relationState).toBe('invalid');
  });

  test('dangling WBS (no wbsProjectId) → invalid', () => {
    const raw = makeRawItem({ wbs_item_id: 'wbs-orphan' });
    const item = normalizeFinanceItem(raw, null);
    expect(item.relationState).toBe('invalid');
  });

  test('source unknown when no identifying fields', () => {
    const raw = makeRawItem({ mode: 'simple', funding_source: 'grant' });
    const item = normalizeFinanceItem(raw);
    expect(item.source).toBe('unknown');
  });

  test('null actual ≠ zero actual', () => {
    const rawNull = makeRawItem({ volume: 1, unit_price_idr: 100, actual_amount_idr: null });
    const rawZero = makeRawItem({ volume: 1, unit_price_idr: 100, actual_amount_idr: 0 });
    const itemNull = normalizeFinanceItem(rawNull);
    const itemZero = normalizeFinanceItem(rawZero);
    expect(itemNull.actual).toBeNull();
    expect(itemZero.actual).toBe(0);
  });

  test('data completeness: complete when planned and actual available', () => {
    const raw = makeRawItem({ volume: 1, unit_price_idr: 100, actual_amount_idr: 50 });
    const item = normalizeFinanceItem(raw);
    expect(item.dataCompleteness).toBe('complete');
  });

  test('data completeness: partial when planned available but actual null', () => {
    const raw = makeRawItem({ volume: 1, unit_price_idr: 100, actual_amount_idr: null });
    const item = normalizeFinanceItem(raw);
    expect(item.dataCompleteness).toBe('partial');
  });

  test('data completeness: insufficient when planned null', () => {
    const raw = makeRawItem({ volume: null, unit_price_idr: 10000 });
    const item = normalizeFinanceItem(raw);
    expect(item.dataCompleteness).toBe('insufficient');
  });
});

// ─── classifyDataCompleteness ───────────────────────────────────────────────

describe('classifyDataCompleteness', () => {
  test('all planned + has actual → complete', () => {
    expect(classifyDataCompleteness(3, 3, true)).toBe('complete');
  });

  test('all planned + no actual → partial', () => {
    expect(classifyDataCompleteness(3, 3, false)).toBe('partial');
  });

  test('some planned → partial', () => {
    expect(classifyDataCompleteness(2, 4, false)).toBe('partial');
  });

  test('no planned → insufficient', () => {
    expect(classifyDataCompleteness(0, 4, false)).toBe('insufficient');
  });

  test('zero items → insufficient', () => {
    expect(classifyDataCompleteness(0, 0, false)).toBe('insufficient');
  });
});

// ─── aggregateProjectFinance ────────────────────────────────────────────────

describe('aggregateProjectFinance', () => {
  const makeItem = (overrides: Partial<FinanceItemViewModel> = {}): FinanceItemViewModel => ({
    id: 'item-1',
    projectId: 'project-1',
    wbsItemId: null,
    relationState: 'linked',
    planned: 100,
    committed: null,
    actual: 50,
    remaining: 50,
    available: 50,
    variance: 50,
    utilizationPct: 50,
    commitmentPct: null,
    health: 'healthy' as FinanceHealth,
    rawStatus: null,
    canonicalStatus: 'unknown',
    source: 'unknown',
    dataCompleteness: 'complete',
    ...overrides,
  });

  test('empty items → insufficient, null totals', () => {
    const summary = aggregateProjectFinance([]);
    expect(summary.totalPlanned).toBeNull();
    expect(summary.totalActual).toBeNull();
    expect(summary.dataCompleteness).toBe('insufficient');
    expect(summary.health).toBe('unknown');
  });

  test('sums planned and actual across items', () => {
    const items = [
      makeItem({ id: 'i1', planned: 100, actual: 40 }),
      makeItem({ id: 'i2', planned: 200, actual: 80 }),
    ];
    const summary = aggregateProjectFinance(items);
    expect(summary.totalPlanned).toBe(300);
    expect(summary.totalActual).toBe(120);
    expect(summary.totalRemaining).toBe(180);
    expect(summary.utilizationPct).toBe(40);
  });

  test('all planned unavailable → aggregate planned null', () => {
    const items = [
      makeItem({ id: 'i1', planned: null, actual: 40 }),
      makeItem({ id: 'i2', planned: null, actual: 80 }),
    ];
    const summary = aggregateProjectFinance(items);
    expect(summary.totalPlanned).toBeNull();
    expect(summary.health).toBe('unknown');
  });

  test('partial planned → data completeness partial', () => {
    const items = [
      makeItem({ id: 'i1', planned: 100, actual: null }),
      makeItem({ id: 'i2', planned: null, actual: null }),
    ];
    const summary = aggregateProjectFinance(items);
    expect(summary.dataCompleteness).toBe('partial');
    expect(summary.totalPlanned).toBe(100);
  });

  test('counts relation states', () => {
    const items = [
      makeItem({ id: 'i1', relationState: 'linked' }),
      makeItem({ id: 'i2', relationState: 'unlinked' }),
      makeItem({ id: 'i3', relationState: 'invalid' }),
      makeItem({ id: 'i4', relationState: 'linked' }),
    ];
    const summary = aggregateProjectFinance(items);
    expect(summary.linkedItemCount).toBe(2);
    expect(summary.unlinkedItemCount).toBe(1);
    expect(summary.invalidRelationCount).toBe(1);
  });

  test('committed always null in aggregate', () => {
    const items = [makeItem()];
    const summary = aggregateProjectFinance(items);
    expect(summary.totalCommitted).toBeNull();
    expect(summary.commitmentPct).toBeNull();
  });

  test('no NaN or Infinity produced', () => {
    const items = [
      makeItem({ id: 'i1', planned: 0, actual: 0 }),
      makeItem({ id: 'i2', planned: 0, actual: 0 }),
    ];
    const summary = aggregateProjectFinance(items);
    expect(Number.isFinite(summary.totalPlanned!)).toBe(true);
    expect(summary.utilizationPct).toBeNull();
  });

  test('health from aggregate planned/actual', () => {
    const items = [
      makeItem({ id: 'i1', planned: 100, actual: 90 }),
      makeItem({ id: 'i2', planned: 100, actual: 0 }),
    ];
    const summary = aggregateProjectFinance(items);
    expect(summary.totalPlanned).toBe(200);
    expect(summary.totalActual).toBe(90);
    expect(summary.health).toBe('healthy'); // 90/200 = 45%
  });

  test('overspent project aggregate', () => {
    const items = [
      makeItem({ id: 'i1', planned: 100, actual: 110 }),
    ];
    const summary = aggregateProjectFinance(items);
    expect(summary.health).toBe('overspent');
    expect(summary.variance).toBe(-10);
  });
});
