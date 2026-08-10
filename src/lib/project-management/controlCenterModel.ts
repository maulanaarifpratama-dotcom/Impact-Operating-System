/**
 * Canonical PM Control Center — read-model aggregation layer.
 *
 * Control Center is NOT a source of truth. It is a READ MODEL that consumes
 * canonical domain models (Work Plan, Timeline, Deliverables, Bottleneck,
 * Completion Claim, Finance) and presents aggregated project health signals.
 *
 * Rules:
 * - Control Center MUST NOT store its own status that contradicts domain sources.
 * - Control Center MUST NOT compute progress using a different formula.
 * - Control Center MUST NOT have its own lifecycle.
 * - Control Center MUST NOT duplicate domain business rules.
 *
 * Canonical architecture:
 *
 *   Work Plan ──────────────┐
 *   Timeline ───────────────┤
 *   Deliverables ───────────┤
 *   Bottleneck ─────────────┤
 *   Completion Claim ───────┤
 *   Finance (PM-F2, PM-F3) ─┤
 *                           ▼
 *                    Control Center
 *                    (read-model aggregator)
 */

// ── Overall Project Health ──────────────────────────────────────────────────

export type ProjectHealth = 'healthy' | 'at_risk' | 'critical' | 'unknown';

export function getProjectHealthLabel(health: ProjectHealth): string {
  switch (health) {
    case 'healthy': return 'Sehat';
    case 'at_risk': return 'Berisiko';
    case 'critical': return 'Kritis';
    default: return 'Tidak Diketahui';
  }
}

// ── Execution Health Layer ──────────────────────────────────────────────────
//
// Source domains: Work Plan (workPlan.ts, executionModel.ts), Completion Claim
// (executionModel.ts)
//
// Consumed signals:
//   getExecutionBucket()        → not_started / in_progress / completed
//   isOverdue()                 → boolean from executionModel
//   getClosureStatus()          → open / documented / closed
//   computeItemProgress()       → 0–100 progress percent
//
// Derivation rules:
//   healthy   – all activities completed or in_progress, no overdue
//   at_risk   – any activity overdue but execution still in_progress
//   critical  – any activity overdue AND execution stalled (not_started)
//   unknown   – no activity data

export type ExecutionHealth = 'healthy' | 'at_risk' | 'critical' | 'unknown';

export function getExecutionHealthLabel(health: ExecutionHealth): string {
  switch (health) {
    case 'healthy': return 'Tepat Waktu';
    case 'at_risk': return 'Terlambat';
    case 'critical': return 'Tertunda';
    default: return 'Tidak Diketahui';
  }
}

export interface ExecutionHealthInput {
  /** Number of activities that are overdue (end_date passed, not completed). */
  overdueCount: number;
  /** Number of overdue activities with execution status = not_started. */
  overdueStalledCount: number;
  /** Total number of activities. */
  totalCount: number;
}

export function computeExecutionHealth(input: ExecutionHealthInput): ExecutionHealth {
  if (input.totalCount === 0) return 'unknown';
  if (input.overdueStalledCount > 0) return 'critical';
  if (input.overdueCount > 0) return 'at_risk';
  return 'healthy';
}

// ── Delivery Health Layer ───────────────────────────────────────────────────
//
// Source domains: Timeline (project_stages), Deliverables (programme_deliverables)
//
// Consumed signals:
//   Stage planned vs actual dates
//   Deliverable completion status
//   Milestone completion
//
// Derivation rules:
//   healthy   – deliverables on track, no overdue milestones
//   at_risk   – any deliverable overdue
//   critical  – any milestone missed
//   unknown   – no deliverable data

export type DeliveryHealth = 'healthy' | 'at_risk' | 'critical' | 'unknown';

export function getDeliveryHealthLabel(health: DeliveryHealth): string {
  switch (health) {
    case 'healthy': return 'Tepat Waktu';
    case 'at_risk': return 'Terlambat';
    case 'critical': return 'Melampaui Tenggat';
    default: return 'Tidak Diketahui';
  }
}

export interface DeliveryHealthInput {
  overdueDeliverableCount: number;
  missedMilestoneCount: number;
  totalDeliverableCount: number;
}

export function computeDeliveryHealth(input: DeliveryHealthInput): DeliveryHealth {
  if (input.totalDeliverableCount === 0) return 'unknown';
  if (input.missedMilestoneCount > 0) return 'critical';
  if (input.overdueDeliverableCount > 0) return 'at_risk';
  return 'healthy';
}

// ── Constraint Health Layer ─────────────────────────────────────────────────
//
// Source domain: Bottleneck (bottleneckModel.ts)
//
// Consumed signals:
//   isBottleneckActive()              → open or in_progress
//   isBottleneckPendingVerification()  → resolved, not yet verified
//   computeBottleneckCounts()          → BottleneckCounts
//
// Derivation rules:
//   healthy   – no active bottlenecks
//   watch     – any bottleneck open or in_progress
//   blocked   – more than N active bottlenecks (N configurable per project)
//   unknown   – no bottleneck data available

export type ConstraintHealth = 'healthy' | 'watch' | 'blocked' | 'unknown';

export function getConstraintHealthLabel(health: ConstraintHealth): string {
  switch (health) {
    case 'healthy': return 'Lancar';
    case 'watch': return 'Ada Hambatan';
    case 'blocked': return 'Terhambat Parah';
    default: return 'Tidak Diketahui';
  }
}

export interface ConstraintHealthInput {
  activeBottleneckCount: number;
  pendingVerificationCount: number;
  /** The threshold above which the project is considered blocked. Default 3. */
  blockedThreshold?: number;
}

export function computeConstraintHealth(input: ConstraintHealthInput): ConstraintHealth {
  const threshold = input.blockedThreshold ?? 3;
  if (input.activeBottleneckCount === 0 && input.pendingVerificationCount === 0) return 'healthy';
  if (input.activeBottleneckCount >= threshold) return 'blocked';
  if (input.activeBottleneckCount > 0) return 'watch';
  // pending verification only — still healthy (resolved)
  return 'healthy';
}

// ── Financial Health Layer ──────────────────────────────────────────────────
//
// Source domain: Finance (financeModel.ts — §2 Budget, §3 Funding)
//
// Consumed signals:
//   classifyFinanceHealth()          → healthy / watch / critical / overspent
//   ProjectCashPosition              → cashAvailable, fundingCoveragePct
//   computeProjectCashPosition()     → canonical cash position
//
// Derivation rules:
//   healthy   – utilization ≤ 80%, cash positive or nil
//   watch     – utilization 80-95% or negative cash
//   critical  – utilization 95-100%
//   overspent – actual > planned
//   unknown   – no financial data

export type FinancialHealth = 'healthy' | 'watch' | 'critical' | 'overspent' | 'unknown';

export function getFinancialHealthLabel(health: FinancialHealth): string {
  switch (health) {
    case 'healthy': return 'Sehat';
    case 'watch': return 'Perlu Perhatian';
    case 'critical': return 'Kritis';
    case 'overspent': return 'Melebihi Anggaran';
    default: return 'Tidak Diketahui';
  }
}

// ── Overall Project Health Aggregation ──────────────────────────────────────

/**
 * Aggregates the four health layers into a single Overall Project Health.
 *
 * Priority (worst wins):
 *   1. critical → overall is critical
 *   2. at_risk/watch → overall is at_risk
 *   3. healthy → overall is healthy
 *   4. unknown everywhere → overall is unknown
 */
export function computeOverallProjectHealth(healths: {
  execution: ExecutionHealth;
  delivery: DeliveryHealth;
  constraint: ConstraintHealth;
  financial: FinancialHealth;
}): ProjectHealth {
  const layers: string[] = [
    healths.execution,
    healths.delivery,
    healths.constraint,
    healths.financial,
  ];

  if (layers.some((h) => h === 'critical' || h === 'overspent')) return 'critical';
  if (layers.some((h) => h === 'at_risk' || h === 'watch' || h === 'blocked' || h === 'debilitating')) return 'at_risk';
  if (layers.some((h) => h === 'healthy')) return 'healthy';
  return 'unknown';
}

// ── Control Center Aggregate ────────────────────────────────────────────────

/**
 * Complete Control Center aggregate for one project.
 *
 * All values are derived from canonical domain models. None are stored
 * or computed independently. This is a read-model aggregation only.
 */
export interface ControlCenterProjectSnapshot {
  projectId: string;
  projectName: string;

  execution: ExecutionHealth;
  executionOverdueCount: number;
  executionOverdueStalledCount: number;
  executionTotalCount: number;

  delivery: DeliveryHealth;
  deliveryOverdueCount: number;
  deliveryMissedMilestoneCount: number;
  deliveryTotalCount: number;

  constraint: ConstraintHealth;
  constraintActiveCount: number;
  constraintPendingVerificationCount: number;

  financial: FinancialHealth;
  financialUtilizationPct: number | null;
  financialCashAvailable: number | null;

  overall: ProjectHealth;
}

// ── Domain Source Attribution ───────────────────────────────────────────────

/**
 * Each derived signal in the Control Center must be attributable to its
 * source domain. This allows traceability from the dashboard back to the
 * canonical source of truth.
 */
export const CONTROL_CENTER_SOURCE_MAP: Record<string, string> = {
  execution: 'workPlan.ts / executionModel.ts',
  delivery: 'project_stages / programme_deliverables',
  constraint: 'bottleneckModel.ts',
  financial: 'financeModel.ts §2 Budget / §3 Funding',
  overall: 'controlCenterModel.ts (aggregation of the above four layers)',
};
