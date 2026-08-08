/**
 * Canonical PM Finance domain (resource flow lifecycle only).
 *
 * Finance is NOT Budget calculation (that stays in budgetModel.ts /
 * mirrorBudgetModel.ts / targetBudget.ts — this module never reimplements
 * planned/actual/variance math, it only consumes those numbers to validate
 * lifecycle transitions). Finance is NOT MEAL, NOT Bottleneck, NOT Value
 * For Money. A financial obstruction is represented as a Bottleneck
 * (category = financial), never as a FinancialStatus value — see
 * PM-P5 §9.
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
