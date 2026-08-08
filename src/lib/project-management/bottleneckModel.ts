/**
 * Canonical PM Bottleneck domain (risk domain).
 *
 * Bottleneck is NOT Finance (that stays in financeModel.ts — a financial
 * obstruction is represented here as category = 'financial', never as a
 * FinancialStatus value, per PM-P5 §9 / PM-P5A). This module is the single
 * source of truth for the Bottleneck category taxonomy; UI components must
 * import from here rather than keep their own label maps or option lists.
 */

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
