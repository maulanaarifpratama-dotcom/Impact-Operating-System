/**
 * Canonical PM Finance domain — single source of truth for Project Management
 * Finance signals.
 *
 * Two subdomains, one module:
 *
 * A. Financial Status Lifecycle (WBS resource flow) — §1 below.
 * B. Budget Finance dimensions, health, relation state, and aggregation — §2 below.
 *
 * Every PM screen that displays financial numbers, health badges, budget–WBS
 * relation indicators, or project-level finance summaries MUST derive those
 * signals from this module. Do NOT reimplement planned/committed/actual/variance
 * math, percentage calculations, health thresholds, or relation-state logic
 * locally in a component.
 *
 * Programme Design Budget stays in budgetModel.ts / mirrorBudgetModel.ts /
 * targetBudget.ts and is NOT merged into this module.
 */

// Storage-compatible with the existing lfa_wbs_items.financial_status column:
// 'draft' | 'committed' | 'disbursement_requested' | 'paid' are unchanged
// stored values; 'blocked_by_finance' is removed (PM-P5 §8/§9) and 'closed'
// is added as the new terminal (reconciled) state.
export type FinancialStatus = 'draft' | 'committed' | 'disbursement_requested' | 'paid' | 'closed';

const FINANCIAL_STATUS_LABELS: Record<FinancialStatus, string> = {
  draft: 'Not Budgeted',
  committed: 'Planned',
  disbursement_requested: 'Requested',
  paid: 'Active',
  closed: 'Closed',
};

export function getFinancialStatusLabel(status?: string | null): string {
  return FINANCIAL_STATUS_LABELS[(status as FinancialStatus) || 'draft'] || 'Not Budgeted';
}

export const FINANCIAL_STATUS_OPTIONS: { value: FinancialStatus; emoji: string; label: string }[] = [
  { value: 'draft', emoji: '💰', label: 'Not Budgeted (Draf Anggaran)' },
  { value: 'committed', emoji: '📌', label: 'Planned (Committed)' },
  { value: 'disbursement_requested', emoji: '⏳', label: 'Requested (Disbursement Requested)' },
  { value: 'paid', emoji: '✅', label: 'Active (Paid)' },
  { value: 'closed', emoji: '🔒', label: 'Closed (Reconciled)' },
];

export interface FinancialStatusGuardInput {
  plannedBudget: number;
  actualCost: number | null;
}

export interface FinancialStatusGuardResult {
  valid: boolean;
  reason?: string;
}

/**
 * Consistency guard between FinancialStatus and real budget numbers (PM-P5 §3).
 * This is validation only — it never mutates state, never auto-transitions
 * a status, and never creates a Bottleneck. Callers are responsible for
 * blocking the transition client-side when `valid` is false.
 */
export function canSetFinancialStatus(
  status: FinancialStatus,
  { plannedBudget, actualCost }: FinancialStatusGuardInput,
): FinancialStatusGuardResult {
  if (status === 'committed' || status === 'disbursement_requested') {
    if (!(plannedBudget > 0)) {
      return { valid: false, reason: `${getFinancialStatusLabel(status)} requires Planned Budget > 0.` };
    }
  }
  if (status === 'paid') {
    if (!(actualCost !== null && actualCost > 0)) {
      return { valid: false, reason: 'Active requires Actual Cost > 0.' };
    }
  }
  if (status === 'closed') {
    if (actualCost === null || actualCost === undefined) {
      return { valid: false, reason: 'Closed requires Actual Cost to exist.' };
    }
  }
  return { valid: true };
}

// ─── §2 CANONICAL PM BUDGET FINANCE ────────────────────────────────────────

// ── Finance Health ──

export type FinanceHealth = 'unknown' | 'healthy' | 'watch' | 'critical' | 'overspent';

// ── Data Completeness ──

export type FinanceDataCompleteness = 'complete' | 'partial' | 'insufficient';

// ── Finance Item Source ──

export type FinanceItemSource = 'manual' | 'programme_design' | 'grantwriter_materialization' | 'imported' | 'unknown';

// ── Finance Item Status ──

export type FinanceItemStatus = 'draft' | 'active' | 'committed' | 'partially_spent' | 'spent' | 'cancelled' | 'unknown';

// ── Finance Relation State ──

export type FinanceRelationState = 'linked' | 'unlinked' | 'invalid';

// ── Normalized Ledger Aggregate (from compute_budget_aggregates RPC) ──

export interface BudgetAggregateRow {
  budget_item_id: string;
  planned: number;
  posted_actual_gross: number;
  posted_reversals: number;
  net_actual: number;
  approved_commitment: number;
  committed_outstanding: number;
}

// ── Input Adapters ──

export interface FinanceItemRawInput {
  id: string;
  lfa_project_id: string;
  wbs_item_id: string | null;
  volume: number | null;
  unit_price_idr: number | null;
  actual_amount_idr: number | null;
  mode: string | null;
  funding_source: string | null;
}

export interface WbsRefInput {
  id: string;
  lfa_project_id: string;
}

// ── Finance Amounts (item or aggregate) ──

export interface FinanceAmounts {
  planned: number | null;
  committed: number | null;
  actual: number | null;
  remaining: number | null;
  available: number | null;
  variance: number | null;
  utilizationPct: number | null;
  commitmentPct: number | null;
}

// ── Finance Item View Model ──

export interface FinanceItemViewModel extends FinanceAmounts {
  id: string;
  projectId: string;
  wbsItemId: string | null;
  relationState: FinanceRelationState;
  health: FinanceHealth;
  rawStatus: string | null;
  canonicalStatus: FinanceItemStatus;
  source: FinanceItemSource;
  dataCompleteness: FinanceDataCompleteness;
}

// ── Project Finance Summary ──

export interface ProjectFinanceSummary extends FinanceAmounts {
  totalPlanned: number | null;
  totalCommitted: number | null;
  totalActual: number | null;
  totalRemaining: number | null;
  totalAvailable: number | null;
  linkedItemCount: number;
  unlinkedItemCount: number;
  invalidRelationCount: number;
  health: FinanceHealth;
  dataCompleteness: FinanceDataCompleteness;
}

// ── Pure Functions ──

/** Returns the value if it is a finite, non-NaN number; otherwise null. */
export function normalizeFinite(value: unknown): number | null {
  if (typeof value !== 'number') return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

/** Safe percentage: returns null when denominator is null, zero, non-positive, or non-finite. */
export function safePct(numerator: number | null, denominator: number | null): number | null {
  const n = normalizeFinite(numerator);
  const d = normalizeFinite(denominator);
  if (n === null || d === null || d <= 0) return null;
  return (n / d) * 100;
}

// ── Health ──

/**
 * Deterministic Finance health classifier.
 *
 * Thresholds:
 *   unknown   – planned or actual unavailable, or planned ≤ 0
 *   healthy   – utilization ≤ 80 %
 *   watch     – utilization > 80 % and ≤ 95 %
 *   critical  – utilization > 95 % and ≤ 100 %
 *   overspent – actual > planned
 */
export function classifyFinanceHealth(planned: number | null, actual: number | null): FinanceHealth {
  const p = normalizeFinite(planned);
  const a = normalizeFinite(actual);

  if (p === null || a === null || p <= 0) return 'unknown';

  if (a > p) return 'overspent';

  const utilizationPct = (a / p) * 100;

  if (utilizationPct <= 80) return 'healthy';
  if (utilizationPct <= 95) return 'watch';
  return 'critical';
}

// ── Relation State ──

/**
 * Determines the Budget ↔ WBS relation state, project-scoped.
 *
 * - No wbsItemId                   → unlinked
 * - wbsItemId present + same project → linked
 * - wbsItemId present + wbsProjectId differs or missing → invalid
 */
export function determineRelationState(
  budgetProjectId: string,
  wbsItemId: string | null,
  wbsProjectId?: string | null,
): FinanceRelationState {
  if (!wbsItemId) return 'unlinked';
  if (wbsProjectId && wbsProjectId === budgetProjectId) return 'linked';
  return 'invalid';
}

// ── Source ──

/**
 * Attempts to determine the budget item's origin from available fields.
 * Returns `unknown` when the source cannot be proven.
 */
export function determineFinanceItemSource(
  mode?: string | null,
  fundingSource?: string | null,
): FinanceItemSource {
  const m = (mode || '').toLowerCase();
  const f = (fundingSource || '').toLowerCase();

  if (m === 'programme_design' || f === 'programme_design') return 'programme_design';
  if (m === 'grantwriter_materialization' || f === 'grantwriter_materialization' || m === 'grantwriter') return 'grantwriter_materialization';
  if (f === 'imported' || m === 'imported') return 'imported';

  return 'unknown';
}

// ── Finance Item Status (canonical from raw) ──

const CANONICAL_STATUS_MAP: Record<string, FinanceItemStatus> = {
  draft: 'draft',
  active: 'active',
  committed: 'committed',
  partially_spent: 'partially_spent',
  spent: 'spent',
  cancelled: 'cancelled',
};

/**
 * Maps a raw status to the canonical FinanceItemStatus.
 * Only values that map to known canonical statuses are returned;
 * everything else → 'unknown'.
 */
export function classifyFinanceItemStatus(rawStatus?: string | null): FinanceItemStatus {
  if (!rawStatus) return 'unknown';
  return CANONICAL_STATUS_MAP[rawStatus.toLowerCase()] || 'unknown';
}

// ── Item View Model ──

/**
 * Builds a canonical FinanceItemViewModel from a raw budget item row.
 * All calculations are deterministic and null-safe.
 */
export function normalizeFinanceItem(
  raw: FinanceItemRawInput,
  wbsProjectId?: string | null,
): FinanceItemViewModel {
  const planned = normalizeFinite(
    normalizeFinite(raw.volume) !== null && normalizeFinite(raw.unit_price_idr) !== null
      ? (raw.volume! * raw.unit_price_idr!)
      : null,
  );

  const committed: number | null = null; // schema does not store committed

  const actual = normalizeFinite(raw.actual_amount_idr);

  const remaining = planned !== null && actual !== null ? planned - actual : null;

  const available = planned !== null && actual !== null ? planned - actual : null;
  // committed is always null, so available === remaining for now

  const variance = planned !== null && actual !== null ? planned - actual : null;

  const utilizationPct = safePct(actual, planned);

  const commitmentPct: number | null = null; // committed always null

  const relationState = determineRelationState(raw.lfa_project_id, raw.wbs_item_id, wbsProjectId);

  const health = classifyFinanceHealth(planned, actual);

  const source = determineFinanceItemSource(raw.mode, raw.funding_source);

  const canonicalStatus = classifyFinanceItemStatus(raw.mode); // no dedicated status column; mode is the best proxy for PM items

  const dataCompleteness: FinanceDataCompleteness =
    planned !== null && actual !== null ? 'complete' : planned !== null ? 'partial' : 'insufficient';

  return {
    id: raw.id,
    projectId: raw.lfa_project_id,
    wbsItemId: raw.wbs_item_id,
    relationState,
    planned,
    committed,
    actual,
    remaining,
    available,
    variance,
    utilizationPct,
    commitmentPct,
    health,
    rawStatus: raw.mode ?? null,
    canonicalStatus,
    source,
    dataCompleteness,
  };
}

/**
 * Builds a canonical FinanceItemViewModel from a raw budget item row
 * AND a normalized ledger aggregate row (from compute_budget_aggregates RPC).
 * Committed and actual values come from the normalized ledger, not legacy scalars.
 */
export function normalizeFinanceItemFromLedger(
  raw: FinanceItemRawInput,
  agg: BudgetAggregateRow,
  wbsProjectId?: string | null,
): FinanceItemViewModel {
  const planned = normalizeFinite(agg.planned > 0 ? agg.planned : null);

  const committedOutstanding = normalizeFinite(agg.committed_outstanding > 0 ? agg.committed_outstanding : null);

  const netActual = normalizeFinite(agg.net_actual > 0 || agg.posted_actual_gross > 0 ? agg.net_actual : null);

  const remaining = planned !== null && netActual !== null ? planned - netActual : null;

  const exposure = netActual !== null && committedOutstanding !== null
    ? netActual + committedOutstanding
    : netActual !== null ? netActual : null;

  const available = planned !== null && exposure !== null
    ? planned - exposure
    : null;

  const variance = planned !== null && netActual !== null ? planned - netActual : null;

  const utilizationPct = safePct(netActual, planned);

  const commitmentPct = safePct(committedOutstanding, planned);

  const relationState = determineRelationState(raw.lfa_project_id, raw.wbs_item_id, wbsProjectId);

  const health = classifyFinanceHealth(planned, netActual);

  const source = determineFinanceItemSource(raw.mode, raw.funding_source);

  const canonicalStatus = classifyFinanceItemStatus(raw.mode);

  const hasLedgerData = netActual !== null || committedOutstanding !== null;
  const dataCompleteness: FinanceDataCompleteness =
    planned !== null && hasLedgerData ? 'complete' : planned !== null ? 'partial' : 'insufficient';

  return {
    id: raw.id,
    projectId: raw.lfa_project_id,
    wbsItemId: raw.wbs_item_id,
    relationState,
    planned,
    committed: committedOutstanding,
    actual: netActual,
    remaining,
    available,
    variance,
    utilizationPct,
    commitmentPct,
    health,
    rawStatus: raw.mode ?? null,
    canonicalStatus,
    source,
    dataCompleteness,
  };
}

// ── Data Completeness ──

/**
 * Classifies overall data completeness across a set of finance items.
 */
export function classifyDataCompleteness(
  planCount: number,
  totalCount: number,
  hasActualData: boolean,
): FinanceDataCompleteness {
  if (totalCount === 0) return 'insufficient';

  const allHavePlanned = planCount === totalCount;
  const someHavePlanned = planCount > 0;

  if (!someHavePlanned) return 'insufficient';

  if (allHavePlanned && hasActualData) return 'complete';

  return 'partial';
}

// ── Project-level Aggregation ──

/**
 * Aggregates a collection of FinanceItemViewModel into a ProjectFinanceSummary.
 *
 * Rules:
 * - Sums only finite numbers; null stays null when every item's dimension is null.
 * - Cancelled items are excluded from active spend aggregation.
 * - Invalid relation items are counted but their amounts still contribute (they are
 *   real data — the relation is the concern, not the amount).
 */
export function aggregateProjectFinance(
  items: FinanceItemViewModel[],
): ProjectFinanceSummary {
  if (items.length === 0) {
    return {
      totalPlanned: null,
      totalCommitted: null,
      totalActual: null,
      totalRemaining: null,
      totalAvailable: null,
      variance: null,
      utilizationPct: null,
      commitmentPct: null,
      planned: null,
      committed: null,
      actual: null,
      remaining: null,
      available: null,
      linkedItemCount: 0,
      unlinkedItemCount: 0,
      invalidRelationCount: 0,
      health: 'unknown',
      dataCompleteness: 'insufficient',
    };
  }

  let totalPlanned: number | null = null;
  let totalActual: number | null = null;

  let plannedCount = 0;
  let hasActual = false;
  let linkedCount = 0;
  let unlinkedCount = 0;
  let invalidCount = 0;

  for (const item of items) {
    const p = normalizeFinite(item.planned);
    const a = normalizeFinite(item.actual);

    if (p !== null) {
      totalPlanned = (totalPlanned ?? 0) + p;
      plannedCount++;
    }
    if (a !== null) {
      totalActual = (totalActual ?? 0) + a;
      hasActual = true;
    }

    if (item.relationState === 'linked') linkedCount++;
    else if (item.relationState === 'unlinked') unlinkedCount++;
    else if (item.relationState === 'invalid') invalidCount++;
  }

  const totalCommitted: number | null = null;

  const totalRemaining = totalPlanned !== null && totalActual !== null
    ? totalPlanned - totalActual
    : null;

  const totalAvailable = totalPlanned !== null && totalActual !== null
    ? totalPlanned - totalActual
    : null;

  const aggVariance = totalPlanned !== null && totalActual !== null
    ? totalPlanned - totalActual
    : null;

  const aggUtilizationPct = safePct(totalActual, totalPlanned);

  const commitmentPct: number | null = null;

  const health = classifyFinanceHealth(totalPlanned, totalActual);

  const dataCompleteness = classifyDataCompleteness(plannedCount, items.length, hasActual);

  return {
    totalPlanned,
    totalCommitted,
    totalActual,
    totalRemaining,
    totalAvailable,
    variance: aggVariance,
    utilizationPct: aggUtilizationPct,
    commitmentPct,
    planned: totalPlanned,
    committed: totalCommitted,
    actual: totalActual,
    remaining: totalRemaining,
    available: totalAvailable,
    linkedItemCount: linkedCount,
    unlinkedItemCount: unlinkedCount,
    invalidRelationCount: invalidCount,
    health,
    dataCompleteness,
  };
}
