/**
 * Canonical PM + MEAL execution model.
 *
 * Single source of truth for Overdue, Blocked, Execution Status, and ACR
 * (Closure) Status. Every PM/MEAL screen (Work Plan, Timeline, Control
 * Center, ACR, Deliverables) must derive these signals from here — do not
 * reimplement any of these rules locally.
 */

// ── Overdue ──
// Canonical rule: today > end_date AND execution status != completed.

export interface OverdueInput {
  status?: string | null;
  end_date?: string | null;
}

export function isOverdue(item: OverdueInput, now: Date = new Date()): boolean {
  if (item.status === 'completed') return false;
  if (!item.end_date) return false;
  return new Date(item.end_date) < now;
}

// ── Blocked ──
// Canonical rule: an active Bottleneck exists (blocker_category is set).
// Never derived from a manual status value.

export interface BlockedInput {
  blocker_category?: string | null;
}

export function isBlocked(item: BlockedInput): boolean {
  return !!item.blocker_category;
}

// ── Execution Status (Work Plan) ──
// Canonical allowed values: Belum Mulai / Sedang Berjalan / Selesai.

export type ExecutionBucket = 'not_started' | 'in_progress' | 'completed';

const EXECUTION_STATUS_LABELS: Record<ExecutionBucket, string> = {
  not_started: 'Belum Mulai',
  in_progress: 'Sedang Berjalan',
  completed: 'Selesai',
};

/** Buckets any status value (including legacy ones) into the 3 canonical execution states. */
export function getExecutionBucket(status?: string | null): ExecutionBucket {
  if (status === 'completed') return 'completed';
  if (status === 'in_progress') return 'in_progress';
  return 'not_started';
}

export function getExecutionStatusLabel(status?: string | null): string {
  return EXECUTION_STATUS_LABELS[getExecutionBucket(status)];
}

// ── ACR (Closure) Status ──
// Canonical allowed values: Open / Documented / Closed, derived solely from
// the ACR's Evidence Verification state (wbs_completion_claims.status).
// Never derived from, or used to derive, execution status.

export type ClosureStatus = 'open' | 'documented' | 'closed';

/** The raw claim status that represents "Documented" (submitted, pending Evidence Verification). */
export const DOCUMENTED_CLAIM_STATUS = 'submitted';
/** The raw claim status that represents "Closed" (Evidence Verification sufficient). */
export const CLOSED_CLAIM_STATUS = 'verified';

export interface ClaimClosureInput {
  status?: string | null;
}

export function getClosureStatus(claim: ClaimClosureInput | null | undefined): ClosureStatus {
  if (!claim) return 'open';
  if (claim.status === CLOSED_CLAIM_STATUS) return 'closed';
  if (claim.status === DOCUMENTED_CLAIM_STATUS) return 'documented';
  return 'open'; // draft, needs_revision, rejected, cancelled all revert to Open
}

export function getClosureStatusLabel(status: ClosureStatus): string {
  switch (status) {
    case 'closed': return 'Closed';
    case 'documented': return 'Documented';
    default: return 'Open';
  }
}

export function getClosureStatusBadgeClass(status: ClosureStatus): string {
  switch (status) {
    case 'closed': return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400';
    case 'documented': return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400';
    default: return 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300';
  }
}

/** A Deliverable is an Activity whose ACR reached Closed — nothing else. */
export function isClaimClosed(status?: string | null): boolean {
  return status === CLOSED_CLAIM_STATUS;
}
