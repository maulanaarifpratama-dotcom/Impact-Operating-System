/**
 * Canonical PM Bottleneck domain — single source of truth for execution
 * obstructions.
 *
 * Bottleneck is NOT Finance (that stays in financeModel.ts — a financial
 * obstruction is represented here as category = 'financial', never as a
 * FinancialStatus value, per PM-P5 §9 / PM-P5A).
 *
 * Bottleneck is NOT a generic issue tracker, risk register, task, or
 * completion claim. It represents an actual obstruction that is actively
 * disrupting work-plan activity execution.
 *
 * Three subdomains, one module:
 *
 * A. Category Taxonomy (§1) — what kind of obstruction.
 * B. Lifecycle Status (§2) — open → in_progress → resolved → verified → closed.
 * C. Derived Metrics (§3) — open count, pending verification, verification gap.
 */

// ─── §1 CATEGORY TAXONOMY ──────────────────────────────────────────────────

// Storage-compatible with the existing lfa_wbs_items.blocker_category column
// (plain VARCHAR(50)). Legacy values 'donor_disbursement' and 'vendor_delay'
// are retired (PM-P4D) — 'donor_disbursement' was really a financial-flow
// obstruction (-> 'financial'), 'vendor_delay' is generalized to 'vendor'.
export type BlockerCategory =
  | 'field_condition'
  | 'financial'
  | 'procurement'
  | 'vendor'
  | 'human_resources'
  | 'stakeholder'
  | 'internal_approval'
  | 'regulatory'
  | 'security'
  | 'force_majeure'
  | 'other';

const BLOCKER_CATEGORY_LABELS: Record<BlockerCategory, string> = {
  field_condition: 'Kondisi Lapangan',
  financial: 'Kendala Keuangan',
  procurement: 'Pengadaan',
  vendor: 'Vendor',
  human_resources: 'Sumber Daya Manusia',
  stakeholder: 'Pemangku Kepentingan',
  internal_approval: 'Persetujuan Internal',
  regulatory: 'Regulasi/Perizinan',
  security: 'Keamanan',
  force_majeure: 'Force Majeure',
  other: 'Lainnya',
};

export function getBlockerCategoryLabel(category?: string | null): string | null {
  if (!category) return null;
  return BLOCKER_CATEGORY_LABELS[category as BlockerCategory] || category;
}

export const BLOCKER_CATEGORY_OPTIONS: { value: BlockerCategory; emoji: string; label: string }[] = [
  { value: 'field_condition', emoji: '🌧️', label: 'Kondisi Lapangan (Field Condition)' },
  { value: 'financial', emoji: '💰', label: 'Kendala Keuangan (Financial)' },
  { value: 'procurement', emoji: '🛒', label: 'Pengadaan (Procurement)' },
  { value: 'vendor', emoji: '🚚', label: 'Vendor' },
  { value: 'human_resources', emoji: '🧑‍🤝‍🧑', label: 'Sumber Daya Manusia (Human Resources)' },
  { value: 'stakeholder', emoji: '🤝', label: 'Pemangku Kepentingan (Stakeholder)' },
  { value: 'internal_approval', emoji: '📑', label: 'Persetujuan Internal (Internal Approval)' },
  { value: 'regulatory', emoji: '⚖️', label: 'Regulasi/Perizinan (Regulatory)' },
  { value: 'security', emoji: '🛡️', label: 'Keamanan (Security)' },
  { value: 'force_majeure', emoji: '⚠️', label: 'Force Majeure' },
  { value: 'other', emoji: '❓', label: 'Lainnya (Other)' },
];

// ─── §2 LIFECYCLE STATUS ───────────────────────────────────────────────────

/**
 * Canonical Bottleneck lifecycle.
 *
 *   open → in_progress → resolved → verified → closed
 *
 * Optional rollback:
 *   resolved → in_progress
 *   verified → in_progress
 *
 * Forbidden jumps:
 *   open → closed    (must be verified first)
 *   open → verified  (must be resolved first)
 *   in_progress → closed (must be verified first)
 */
export type BottleneckStatus =
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'verified'
  | 'closed';

const BOTTLENECK_STATUS_LABELS: Record<BottleneckStatus, string> = {
  open: 'Terbuka',
  in_progress: 'Dalam Penanganan',
  resolved: 'Terselesaikan',
  verified: 'Terverifikasi',
  closed: 'Ditutup',
};

export function getBottleneckStatusLabel(status?: string | null): string {
  if (!status) return 'Terbuka';
  return BOTTLENECK_STATUS_LABELS[status as BottleneckStatus] || status;
}

/** Allowed forward and rollback transitions. */
export function isValidBottleneckTransition(
  from: BottleneckStatus,
  to: BottleneckStatus,
): boolean {
  switch (from) {
    case 'open':
      return to === 'in_progress';
    case 'in_progress':
      return to === 'resolved';
    case 'resolved':
      return to === 'verified' || to === 'in_progress';
    case 'verified':
      return to === 'closed' || to === 'in_progress';
    case 'closed':
      return false;
    default:
      return false;
  }
}

/**
 * Which lifecycle actions are available from the current status.
 * Actions: start (open→in_progress), resolve, verify, close, reopen.
 */
export function getBottleneckAvailableActions(
  status: BottleneckStatus,
): BottleneckAction[] {
  switch (status) {
    case 'open':
      return ['start'];
    case 'in_progress':
      return ['resolve'];
    case 'resolved':
      return ['verify', 'reopen'];
    case 'verified':
      return ['close', 'reopen'];
    case 'closed':
      return [];
  }
}

export type BottleneckAction = 'start' | 'resolve' | 'verify' | 'close' | 'reopen';

export const BOTTLENECK_ACTION_LABELS: Record<BottleneckAction, string> = {
  start: 'Mulai Penanganan',
  resolve: 'Selesaikan',
  verify: 'Verifikasi',
  close: 'Tutup',
  reopen: 'Buka Kembali',
};

// ── Resolution Contract ────────────────────────────────────────────────────

/**
 * Resolution is a concrete action performed, NOT just a status change.
 *
 * Minimal metadata required when marking a bottleneck as resolved:
 *   - resolution_notes  (what was done)
 *   - resolved_by       (who resolved it)
 *   - resolved_at       (when it was resolved)
 *
 * Status becomes 'resolved' only after resolution is recorded.
 */
export interface BottleneckResolution {
  resolution_notes: string;
  resolved_by: string;
  resolved_at: string;
}

export function validateBottleneckResolution(notes?: string | null): string | null {
  if (!notes || notes.trim().length === 0) {
    return 'Catatan penyelesaian wajib diisi.';
  }
  return null;
}

// ── Verification Contract ──────────────────────────────────────────────────

/**
 * Verification MUST be separate from resolution.
 *
 * The verifier cannot be the same person as the resolver (if Completion
 * Claim review separation patterns are enforced by existing PM contracts).
 *
 * Minimal metadata:
 *   - verified_by          (who verified)
 *   - verified_at          (when verified)
 *   - verification_notes   (confirmation notes)
 *
 * Verification must NOT be performed automatically.
 * Verification must NOT be the same action as resolution.
 */
export interface BottleneckVerification {
  verified_by: string;
  verified_at: string;
  verification_notes?: string;
}

/**
 * Checks whether a bottleneck has been verified (i.e., the verifier has
 * confirmed the obstruction is truly gone).
 */
export function isBottleneckVerified(status?: string | null): boolean {
  return status === 'verified' || status === 'closed';
}

/**
 * Checks whether a bottleneck can be closed. Closure requires verification
 * first — a bottleneck at 'resolved' without verification cannot be closed.
 */
export function canCloseBottleneck(status?: string | null): boolean {
  return status === 'verified';
}

// ── Activity Scope ─────────────────────────────────────────────────────────

/**
 * A Bottleneck must always be scoped to a Work Plan Activity.
 * Orphan bottlenecks (without activity_id) are invalid.
 * Project-level bottlenecks without an Activity reference are NOT bottlenecks
 * — they are project notes or risks.
 */
export function validateBottleneckActivityScope(
  activityId?: string | null,
): string | null {
  if (!activityId) {
    return 'Bottleneck harus terkait dengan Activity. Bottleneck tanpa aktivitas tidak valid.';
  }
  return null;
}

// ─── §3 DERIVED METRICS ────────────────────────────────────────────────────

export interface BottleneckCounts {
  total: number;
  open: number;
  inProgress: number;
  resolvedPendingVerification: number;
  verified: number;
  closed: number;
  /** Bottlenecks that have been resolved but not yet verified — verification gap. */
  verificationGap: number;
}

/**
 * Computes bottleneck counts by status from a collection of bottleneck records.
 */
export function computeBottleneckCounts(
  items: Array<{ status?: string | null }>,
): BottleneckCounts {
  const counts: BottleneckCounts = {
    total: items.length,
    open: 0,
    inProgress: 0,
    resolvedPendingVerification: 0,
    verified: 0,
    closed: 0,
    verificationGap: 0,
  };

  for (const item of items) {
    switch (item.status) {
      case 'open':
        counts.open++;
        break;
      case 'in_progress':
        counts.inProgress++;
        break;
      case 'resolved':
        counts.resolvedPendingVerification++;
        break;
      case 'verified':
        counts.verified++;
        break;
      case 'closed':
        counts.closed++;
        break;
    }
  }

  counts.verificationGap = counts.resolvedPendingVerification;

  return counts;
}

/**
 * Whether a bottleneck is actively blocking (open or in_progress).
 */
export function isBottleneckActive(status?: string | null): boolean {
  return status === 'open' || status === 'in_progress';
}

/**
 * Whether a bottleneck has been resolved but not yet verified.
 * This is the "verification gap" — the bottleneck is claimed fixed but
 * nobody has confirmed.
 */
export function isBottleneckPendingVerification(status?: string | null): boolean {
  return status === 'resolved';
}

// ─── BOTTLENECK × WORK PLAN ALIGNMENT ──────────────────────────────────────

/**
 * A Work Plan Activity may have zero or more Bottlenecks.
 * When computing activity-level bottleneck metrics, aggregate as follows:
 *
 *   Activity Bottleneck Count = count of bottlenecks with matching activity_id
 *   Open Bottleneck Count      = count where status IN ('open', 'in_progress')
 *   Pending Verification Count = count where status = 'resolved'
 *
 * Do NOT change Work Plan progress calculation in this sprint.
 */
export interface ActivityBottleneckSummary {
  activityId: string;
  totalBottlenecks: number;
  openBottlenecks: number;
  pendingVerification: number;
}
