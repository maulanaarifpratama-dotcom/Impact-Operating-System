export interface BudgetItemInput {
  id: string;
  wbs_item_id: string | null;
  volume: number | null;
  unit_price_idr: number | null;
  actual_amount_idr?: number | null;
  cost_category?: string | null;
}

export interface WbsBudgetInput {
  id: string;
  level: number;
  parent_id: string | null;
  stage_id?: string | null;
}

export interface StageBudgetInput {
  id: string;
  title: string;
  archived_at?: string | null;
}

export interface BudgetSnapshot {
  targetBudget: number | null;
  detailedBudget: number;
  coveragePercent: number;
  remainingGap: number | null;
  overAllocation: number;
  actualRealization: number;
  utilizationPercent: number;
  plannedBurnRate: number;
  actualBurnRate: number;
  overheadAmount: number;
  overheadPercent: number;
  budgetItemCount: number;
  pricedItemCount: number;
  hasTargetBudget: boolean;
}

export interface StageBudgetRow {
  stageId: string | null;
  title: string;
  total: number;
  activityCount: number;
  percentOfProject: number;
}

export interface ActivityBudgetRow {
  activityId: string;
  activityName: string;
  total: number;
  budgetItemCount: number;
}

function toNumber(v: unknown): number {
  return Number(v) || 0;
}

/** Compute BudgetSnapshot from raw budget data. */
export function computeBudgetSnapshot(params: {
  targetBudget: number | null;
  budgetItems: BudgetItemInput[];
  durationMonths: number;
}): BudgetSnapshot {
  const { targetBudget, budgetItems, durationMonths } = params;

  const detailedBudget = budgetItems.reduce(
    (sum, b) => sum + toNumber(b.volume) * toNumber(b.unit_price_idr),
    0,
  );

  const actualRealization = budgetItems.reduce(
    (sum, b) => sum + toNumber(b.actual_amount_idr),
    0,
  );

  const overheadAmount = budgetItems
    .filter((b) => b.cost_category === 'Indirect Costs/Overhead')
    .reduce((sum, b) => sum + toNumber(b.volume) * toNumber(b.unit_price_idr), 0);

  const hasTargetBudget = targetBudget !== null && targetBudget > 0;
  const coveragePercent = hasTargetBudget ? (detailedBudget / targetBudget!) * 100 : 0;
  const remainingGap = hasTargetBudget ? targetBudget! - detailedBudget : null;
  const overAllocation = hasTargetBudget && targetBudget! < detailedBudget ? detailedBudget - targetBudget! : 0;
  const utilizationPercent = detailedBudget > 0 ? (actualRealization / detailedBudget) * 100 : 0;
  const months = durationMonths > 0 ? durationMonths : 1;
  const plannedBurnRate = detailedBudget / months;
  const actualBurnRate = actualRealization / months;
  const overheadPercent = detailedBudget > 0 ? (overheadAmount / detailedBudget) * 100 : 0;
  const pricedItemCount = budgetItems.filter((b) => toNumber(b.unit_price_idr) > 0).length;

  return {
    targetBudget,
    detailedBudget,
    coveragePercent,
    remainingGap,
    overAllocation,
    actualRealization,
    utilizationPercent,
    plannedBurnRate,
    actualBurnRate,
    overheadAmount,
    overheadPercent,
    budgetItemCount: budgetItems.length,
    pricedItemCount,
    hasTargetBudget,
  };
}

/**
 * Walk a budget item's wbs_item_id up to find its Level-1 ancestor,
 * then return that ancestor's stage_id.
 */
function findLevel1StageId(
  wbsItemId: string | null,
  wbsById: Map<string, WbsBudgetInput>,
): string | null {
  if (!wbsItemId) return null;
  let cur = wbsById.get(wbsItemId);
  for (let guard = 0; guard < 10 && cur; guard++) {
    if (cur.level === 1) return cur.stage_id ?? null;
    if (!cur.parent_id) break;
    cur = wbsById.get(cur.parent_id);
  }
  return null;
}

/**
 * Walk up from a budget item's wbs_item_id to find the Level-2 Activity ancestor.
 */
function findLevel2ActivityId(
  wbsItemId: string | null,
  wbsById: Map<string, WbsBudgetInput>,
): string | null {
  if (!wbsItemId) return null;
  let cur = wbsById.get(wbsItemId);
  for (let guard = 0; guard < 10 && cur; guard++) {
    if (cur.level === 2) return cur.id;
    if (!cur.parent_id) break;
    cur = wbsById.get(cur.parent_id);
  }
  const direct = wbsById.get(wbsItemId);
  return direct?.level === 2 ? direct.id : null;
}

/** Compute per-Stage budget totals. One pass, no double-count. */
export function computeStageBudgets(params: {
  budgetItems: BudgetItemInput[];
  wbsItems: WbsBudgetInput[];
  stages: StageBudgetInput[];
}): { rows: StageBudgetRow[]; unassignedTotal: number } {
  const { budgetItems, wbsItems, stages } = params;
  const wbsById = new Map<string, WbsBudgetInput>(wbsItems.map((w) => [w.id, w]));
  const activeStages = stages.filter((s) => !s.archived_at);

  // Budget item → Level-1 ancestor stage_id
  const stageTotal = new Map<string | null, number>();
  for (const b of budgetItems) {
    const sid = findLevel1StageId(b.wbs_item_id, wbsById);
    const amount = toNumber(b.volume) * toNumber(b.unit_price_idr);
    stageTotal.set(sid, (stageTotal.get(sid) || 0) + amount);
  }

  // count activities per stage
  const stageActivityCount = new Map<string, number>();
  for (const w of wbsItems) {
    if (w.level !== 2) continue;
    const sid = findLevel1StageId(w.id, wbsById);
    const key = sid && activeStages.some((s) => s.id === sid) ? sid : null;
    stageActivityCount.set(key!, (stageActivityCount.get(key!) || 0) + 1);
  }

  const projectTotal = budgetItems.reduce(
    (sum, b) => sum + toNumber(b.volume) * toNumber(b.unit_price_idr),
    0,
  );

  const rows: StageBudgetRow[] = activeStages.map((s) => {
    const total = stageTotal.get(s.id) || 0;
    return {
      stageId: s.id,
      title: s.title,
      total,
      activityCount: stageActivityCount.get(s.id) || 0,
      percentOfProject: projectTotal > 0 ? (total / projectTotal) * 100 : 0,
    };
  });

  return {
    rows,
    unassignedTotal: stageTotal.get(null) || 0,
  };
}

/** Compute per-Activity budget totals. */
export function computeActivityBudgets(params: {
  budgetItems: BudgetItemInput[];
  wbsItems: WbsBudgetInput[];
}): ActivityBudgetRow[] {
  const { budgetItems, wbsItems } = params;
  const wbsById = new Map<string, WbsBudgetInput>(wbsItems.map((w) => [w.id, w]));

  const actTotal = new Map<string, number>();
  const actCount = new Map<string, number>();
  const actName = new Map<string, string>();

  for (const w of wbsItems) {
    if (w.level === 2 && !actName.has(w.id)) {
      actName.set(w.id, `Activity ${w.id.slice(0, 6)}`);
    }
  }

  for (const b of budgetItems) {
    const actId = findLevel2ActivityId(b.wbs_item_id, wbsById);
    if (actId) {
      const amount = toNumber(b.volume) * toNumber(b.unit_price_idr);
      actTotal.set(actId, (actTotal.get(actId) || 0) + amount);
      actCount.set(actId, (actCount.get(actId) || 0) + 1);
    }
  }

  return Array.from(actTotal.entries()).map(([id, total]) => ({
    activityId: id,
    activityName: actName.get(id) || id,
    total,
    budgetItemCount: actCount.get(id) || 0,
  }));
}

/** Format IDR for display. */
export function formatBudgetBadge(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1).replace('.0', '')} M`;
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1).replace('.0', '')} jt`;
  }
  if (amount >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(1).replace('.0', '')} rb`;
  }
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

export function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}
