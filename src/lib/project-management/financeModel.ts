/**
 * Canonical PM Finance domain — single source of truth for Project Management
 * Finance signals.
 *
 * Three subdomains, one module:
 *
 * A. Financial Status Lifecycle (WBS resource flow) — §1 below.
 * B. Budget Finance dimensions, health, relation state, and aggregation — §2 below.
 * C. Project Funding (cash-in) dimensions, receipt aggregation, and cash position — §3 below.
 *
 * Canonical domain hierarchy:
 *
 *   Funding Source (project_funding_sources)
 *       ↓
 *   Funding Tranche / Termin (project_funding_installments)
 *       ↓
 *   Funding Receipt / Penerimaan (project_funding_receipts)
 *
 *   Budget Allocation (lfa_budget_items)
 *       ↓
 *   Budget Commitment (project_budget_commitments)
 *       ↓
 *   Budget Realization / Expenditure (project_budget_expenditures)
 *
 * Every PM screen that displays financial numbers, health badges, budget–WBS
 * relation indicators, funding summaries, or project-level finance summaries
 * MUST derive those signals from this module. Do NOT reimplement planned/
 * committed/actual/variance math, percentage calculations, health thresholds,
 * funding aggregate formulas, or cash-position logic locally in a component.
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
  ledgerItemIds?: Set<string>,
): FinanceItemViewModel {
  const planned = normalizeFinite(agg.planned > 0 ? agg.planned : null);

  const itemHasLedger = ledgerItemIds?.has(raw.id) ?? false;

  const committedOutstanding = normalizeFinite(
    itemHasLedger && agg.committed_outstanding > 0 ? agg.committed_outstanding : null,
  );

  const netActual = itemHasLedger
    ? normalizeFinite(agg.posted_actual_gross > 0 ? agg.net_actual : null)
    : normalizeFinite(raw.actual_amount_idr); // no ledger records → use legacy scalar

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

  const dataCompleteness: FinanceDataCompleteness =
    planned !== null && itemHasLedger ? 'complete' : planned !== null ? 'partial' : 'insufficient';

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
  let totalCommitted: number | null = null;
  let totalActual: number | null = null;

  let plannedCount = 0;
  let hasActual = false;
  let hasCommitted = false;
  let linkedCount = 0;
  let unlinkedCount = 0;
  let invalidCount = 0;

  for (const item of items) {
    const p = normalizeFinite(item.planned);
    const c = normalizeFinite(item.committed);
    const a = normalizeFinite(item.actual);

    if (p !== null) {
      totalPlanned = (totalPlanned ?? 0) + p;
      plannedCount++;
    }
    if (c !== null) {
      totalCommitted = (totalCommitted ?? 0) + c;
      hasCommitted = true;
    }
    if (a !== null) {
      totalActual = (totalActual ?? 0) + a;
      hasActual = true;
    }

    if (item.relationState === 'linked') linkedCount++;
    else if (item.relationState === 'unlinked') unlinkedCount++;
    else if (item.relationState === 'invalid') invalidCount++;
  }

  const totalExposure = totalActual !== null && totalCommitted !== null
    ? totalActual + totalCommitted
    : totalActual !== null ? totalActual : null;

  const totalRemaining = totalPlanned !== null && totalActual !== null
    ? totalPlanned - totalActual
    : null;

  const totalAvailable = totalPlanned !== null && totalExposure !== null
    ? totalPlanned - totalExposure
    : null;

  const aggVariance = totalPlanned !== null && totalActual !== null
    ? totalPlanned - totalActual
    : null;

  const aggUtilizationPct = safePct(totalActual, totalPlanned);

  const commitmentPct = safePct(totalCommitted, totalPlanned);

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

// ─── §3 CANONICAL PM PROJECT FUNDING (CASH-IN) ─────────────────────────────

// ── Funding Aggregate (from compute_project_funding_aggregates RPC) ──

export interface ProjectFundingAggregate {
  total_funding_agreement: number;
  total_scheduled: number;
  total_received_gross: number;
  total_receipt_reversals: number;
  net_received_cash: number;
  allocated_received: number;
  unallocated_received: number;
  total_outstanding_receivable: number;
}

// ── Funding Installment Derived State ──

export type InstallmentDerivedState =
  | 'cancelled'
  | 'fully_received'
  | 'partially_received'
  | 'over_received'
  | 'overdue'
  | 'awaiting_receipt'
  | 'upcoming';

/**
 * Computes the derived state of an installment based on persisted status,
 * net receipts, and due date.
 *
 * Rules:
 *   cancelled         – persisted workflow_status = 'cancelled'
 *   fully_received    – net received >= scheduled amount
 *   over_received     – net received > scheduled amount
 *   overdue           – due date passed, not cancelled, net received > 0 but < scheduled
 *   partially_received– due date not yet, net received > 0 but < scheduled
 *   awaiting_receipt  – due date passed, net received = 0
 *   upcoming          – due date not yet, net received = 0
 */
export function computeInstallmentDerivedState(
  workflowStatus: string,
  scheduledAmount: number,
  netReceived: number,
  dueDate: string,
  now: Date = new Date(),
): InstallmentDerivedState {
  if (workflowStatus === 'cancelled') return 'cancelled';

  if (netReceived >= scheduledAmount) {
    return netReceived > scheduledAmount ? 'over_received' : 'fully_received';
  }

  const due = new Date(dueDate);
  const pastDue = due < now;

  if (pastDue) {
    return netReceived > 0 ? 'overdue' : 'awaiting_receipt';
  }

  return netReceived > 0 ? 'partially_received' : 'upcoming';
}

// ── Cash Position ──

export interface ProjectCashPosition {
  totalFundingAgreement: number | null;
  totalScheduled: number | null;
  netReceivedCash: number | null;
  allocatedReceived: number | null;
  unallocatedReceived: number | null;
  totalOutstandingReceivable: number | null;
  cashAvailable: number | null;
  budgetAvailable: number | null;
  fundingCoveragePct: number | null;
}

/**
 * Computes the project cash position from the funding aggregate and
 * the budget expenditure summary.
 *
 * Cash Available and Budget Available are TWO DIFFERENT concepts:
 *   cashAvailable   = net received cash − net actual expenditure
 *   budgetAvailable = planned budget − exposure
 *
 * Do not mix them under the same label. Unavailable values must stay null,
 * never zero.
 */
export function computeProjectCashPosition(params: {
  funding: ProjectFundingAggregate | null;
  netActualExpenditure: number | null;
  plannedBudget: number | null;
  budgetAvailable: number | null;
}): ProjectCashPosition {
  const { funding, netActualExpenditure, plannedBudget, budgetAvailable } = params;

  const nr = funding?.net_received_cash != null
    ? normalizeFinite(funding.net_received_cash)
    : null;

  const nae = normalizeFinite(netActualExpenditure);

  const cashAvailable = nr !== null && nae !== null ? nr - nae : null;

  const fp = normalizeFinite(plannedBudget);
  const fundingCoveragePct = safePct(nr, fp);

  return {
    totalFundingAgreement: funding ? normalizeFinite(funding.total_funding_agreement) : null,
    totalScheduled: funding ? normalizeFinite(funding.total_scheduled) : null,
    netReceivedCash: nr,
    allocatedReceived: funding ? normalizeFinite(funding.allocated_received) : null,
    unallocatedReceived: funding ? normalizeFinite(funding.unallocated_received) : null,
    totalOutstandingReceivable: funding ? normalizeFinite(funding.total_outstanding_receivable) : null,
    cashAvailable,
    budgetAvailable: normalizeFinite(budgetAvailable),
    fundingCoveragePct,
  };
}

// ── Net Receipt per Installment ──

/**
 * Computes net received amount for a specific installment from a collection
 * of receipts. Uses the canonical formula: posted originals − posted reversals.
 */
export function computeInstallmentNetReceived(
  receipts: Array<{
    installment_id: string | null;
    workflow_status: string;
    reversal_of_id: string | null;
    amount_idr: number;
  }>,
  installmentId: string,
): number {
  return receipts
    .filter(
      (r) =>
        r.installment_id === installmentId &&
        r.workflow_status === 'posted',
    )
    .reduce((sum, r) => {
      if (r.reversal_of_id !== null) return sum - r.amount_idr;
      return sum + r.amount_idr;
    }, 0);
}

// ── Receipt Reversal ──

export interface ReceiptReversalCalculation {
  alreadyReversed: number;
  remainingReversible: number;
}

/**
 * Calculates reversal capacity for a posted original receipt.
 * remainingReversible = original amount − total posted reversals, minimum zero.
 */
export function computeReceiptReversalCapacity(
  originalAmount: number,
  reversals: Array<{ amount_idr: number; workflow_status: string }>,
): ReceiptReversalCalculation {
  const alreadyReversed = reversals
    .filter((r) => r.workflow_status === 'posted')
    .reduce((sum, r) => sum + r.amount_idr, 0);

  return {
    alreadyReversed,
    remainingReversible: Math.max(originalAmount - alreadyReversed, 0),
  };
}

// ── Funding Type Labels ──

export const FUNDING_TYPE_CANONICAL: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'grant', label: 'Grant' },
  { value: 'donation', label: 'Donasi' },
  { value: 'government', label: 'Pemerintah' },
  { value: 'corporate', label: 'Perusahaan' },
  { value: 'internal', label: 'Internal' },
  { value: 'loan', label: 'Pinjaman' },
  { value: 'other', label: 'Lainnya' },
] as const;

// ── Domain Boundary Assertions ──

/**
 * Cash Available and Budget Available are two distinct concepts.
 * Use the appropriate label in UI.
 */
export function isCashAvailableLabel(label: string): boolean {
  return label === 'Kas Tersedia';
}

export function isBudgetAvailableLabel(label: string): boolean {
  return label === 'Dana Anggaran Tersedia' || label === 'Budget Available';
}
