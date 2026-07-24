import { describe, it, expect } from 'vitest';

export interface RawBudgetItem {
  id: string;
  wbs_item_id: string | null;
  volume: number | null;
  unit_price_idr: number | null;
  actual_amount_idr: number | null;
}

export interface WbsItemMock {
  id: string;
  parent_id: string | null;
  level: number;
  name: string;
}

export interface WbsBudgetRollup {
  plannedTotal: number;
  realizedTotal: number | null;
  hasRealization: boolean;
  itemCount: number;
  burnPercent: number | null;
  remainingBudget: number | null;
}

// Pure helper function for subtree IDs
export const getSubtreeWbsIds = (itemId: string, allItems: WbsItemMock[]): string[] => {
  const ids: string[] = [itemId];
  const findChildren = (parentId: string) => {
    const children = allItems.filter((i) => i.parent_id === parentId);
    for (const child of children) {
      ids.push(child.id);
      findChildren(child.id);
    }
  };
  findChildren(itemId);
  return ids;
};

// Pure helper function for budget roll-up
export const computeBudgetRollup = (wbsIds: string[], rawBudgetItems: RawBudgetItem[]): WbsBudgetRollup => {
  const linkedItems = rawBudgetItems.filter((b) => b.wbs_item_id && wbsIds.includes(b.wbs_item_id));

  if (linkedItems.length === 0) {
    return {
      plannedTotal: 0,
      realizedTotal: null,
      hasRealization: false,
      itemCount: 0,
      burnPercent: null,
      remainingBudget: null,
    };
  }

  let plannedTotal = 0;
  let realizedTotal = 0;
  let hasRealization = false;

  linkedItems.forEach((b) => {
    const vol = Number(b.volume) || 1;
    const price = Number(b.unit_price_idr) || 0;
    plannedTotal += vol * price;

    if (b.actual_amount_idr !== null && b.actual_amount_idr !== undefined && (b.actual_amount_idr as any) !== '') {
      hasRealization = true;
      realizedTotal += Number(b.actual_amount_idr) || 0;
    }
  });

  const finalRealized = hasRealization ? realizedTotal : null;
  const remaining = hasRealization ? plannedTotal - realizedTotal : null;
  const burn = hasRealization && plannedTotal > 0 ? Math.round((realizedTotal / plannedTotal) * 100) : null;

  return {
    plannedTotal,
    realizedTotal: finalRealized,
    hasRealization,
    itemCount: linkedItems.length,
    burnPercent: burn,
    remainingBudget: remaining,
  };
};

describe('WBS Budget Roll-up Aggregation Logic (WBS-P1A-2)', () => {
  // Setup sample hierarchy:
  // Program
  //  ├── Output 1 (L1)
  //  │    ├── Activity 1.1 (L2)
  //  │    │    └── Task 1.1.1 (L3)
  //  │    └── Activity 1.2 (L2)
  //  └── Output 2 (L1)
  //       └── Activity 2.1 (L2)

  const mockWbsItems: WbsItemMock[] = [
    { id: 'o1', parent_id: null, level: 1, name: 'Output 1: Pelatihan & Pendampingan' },
    { id: 'a1_1', parent_id: 'o1', level: 2, name: 'Aktivitas 1.1: Workshop awal' },
    { id: 't1_1_1', parent_id: 'a1_1', level: 3, name: 'Task 1.1.1: Sewa Ruangan' },
    { id: 'a1_2', parent_id: 'o1', level: 2, name: 'Aktivitas 1.2: Konsumsi & Modul' },
    { id: 'o2', parent_id: null, level: 1, name: 'Output 2: Sertifikasi & Evaluasi' },
    { id: 'a2_1', parent_id: 'o2', level: 2, name: 'Aktivitas 2.1: Uji Kompetensi' },
  ];

  it('correctly aggregates planned totals for Output 1 from descendant items', () => {
    const mockBudgetItems: RawBudgetItem[] = [
      { id: 'b1', wbs_item_id: 'a1_1', volume: 2, unit_price_idr: 5000000, actual_amount_idr: null }, // 10,000,000
      { id: 'b2', wbs_item_id: 't1_1_1', volume: 1, unit_price_idr: 3000000, actual_amount_idr: null }, // 3,000,000
      { id: 'b3', wbs_item_id: 'a1_2', volume: 10, unit_price_idr: 200000, actual_amount_idr: null },   // 2,000,000
      { id: 'b4', wbs_item_id: 'a2_1', volume: 1, unit_price_idr: 15000000, actual_amount_idr: null },  // 15,000,000 (Output 2)
    ];

    const o1SubtreeIds = getSubtreeWbsIds('o1', mockWbsItems);
    expect(o1SubtreeIds).toEqual(['o1', 'a1_1', 't1_1_1', 'a1_2']);

    const o1Rollup = computeBudgetRollup(o1SubtreeIds, mockBudgetItems);
    expect(o1Rollup.plannedTotal).toBe(15000000); // 10m + 3m + 2m
    expect(o1Rollup.itemCount).toBe(3);
    expect(o1Rollup.hasRealization).toBe(false);
    expect(o1Rollup.realizedTotal).toBeNull();
  });

  it('correctly aggregates Program total from all Output subtrees without double counting', () => {
    const mockBudgetItems: RawBudgetItem[] = [
      { id: 'b1', wbs_item_id: 'a1_1', volume: 2, unit_price_idr: 5000000, actual_amount_idr: null }, // 10,000,000
      { id: 'b2', wbs_item_id: 't1_1_1', volume: 1, unit_price_idr: 3000000, actual_amount_idr: null }, // 3,000,000
      { id: 'b3', wbs_item_id: 'a1_2', volume: 10, unit_price_idr: 200000, actual_amount_idr: null },   // 2,000,000
      { id: 'b4', wbs_item_id: 'a2_1', volume: 1, unit_price_idr: 15000000, actual_amount_idr: null },  // 15,000,000
    ];

    const allWbsIds = mockWbsItems.map((i) => i.id);
    const programRollup = computeBudgetRollup(allWbsIds, mockBudgetItems);

    expect(programRollup.plannedTotal).toBe(30000000); // 15m (O1) + 15m (O2)
    expect(programRollup.itemCount).toBe(4);
  });

  it('correctly handles actual expenditure / realization data and calculates burn %', () => {
    const mockBudgetItemsWithRealisasi: RawBudgetItem[] = [
      { id: 'b1', wbs_item_id: 'a1_1', volume: 2, unit_price_idr: 5000000, actual_amount_idr: 4000000 }, // Planned 10m, Real 4m
      { id: 'b2', wbs_item_id: 't1_1_1', volume: 1, unit_price_idr: 3000000, actual_amount_idr: 2000000 }, // Planned 3m, Real 2m
    ];

    const a1_1SubtreeIds = getSubtreeWbsIds('a1_1', mockWbsItems);
    const a1_1Rollup = computeBudgetRollup(a1_1SubtreeIds, mockBudgetItemsWithRealisasi);

    expect(a1_1Rollup.plannedTotal).toBe(13000000);
    expect(a1_1Rollup.hasRealization).toBe(true);
    expect(a1_1Rollup.realizedTotal).toBe(6000000);
    expect(a1_1Rollup.remainingBudget).toBe(7000000);
    expect(a1_1Rollup.burnPercent).toBe(46); // Math.round((6m / 13m) * 100) = 46%
  });

  it('returns hasRealization = false when actual_amount_idr is null for all items', () => {
    const mockBudgetItemsNoRealisasi: RawBudgetItem[] = [
      { id: 'b1', wbs_item_id: 'a1_1', volume: 1, unit_price_idr: 1000000, actual_amount_idr: null },
    ];

    const rollup = computeBudgetRollup(['a1_1'], mockBudgetItemsNoRealisasi);
    expect(rollup.hasRealization).toBe(false);
    expect(rollup.realizedTotal).toBeNull();
    expect(rollup.remainingBudget).toBeNull();
    expect(rollup.burnPercent).toBeNull();
  });

  it('safely handles zero planned budget with positive realization (division by zero guard)', () => {
    const mockBudgetItemsZeroPlanned: RawBudgetItem[] = [
      { id: 'b1', wbs_item_id: 'a1_1', volume: 0, unit_price_idr: 0, actual_amount_idr: 500000 },
    ];

    const rollup = computeBudgetRollup(['a1_1'], mockBudgetItemsZeroPlanned);
    expect(rollup.plannedTotal).toBe(0);
    expect(rollup.hasRealization).toBe(true);
    expect(rollup.realizedTotal).toBe(500000);
    expect(rollup.burnPercent).toBeNull(); // Guard prevents NaN / Infinity
    expect(rollup.remainingBudget).toBe(-500000);
  });
});
