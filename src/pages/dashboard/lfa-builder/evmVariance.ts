export interface EvmVarianceFlag {
  type: 'high_physical' | 'high_financial';
  physicalPercent: number;
  financialPercent: number;
  diff: number; // physical - financial
  message: string;
  badgeLabel: string;
}

/**
 * Computes a simplified EVM (Earned Value Management) variance flag
 * comparing physical % completion against financial % spent for a WBS Activity.
 */
export function computeEvmVarianceFlag(
  physicalPercent: number, // 0 - 100
  plannedBudgetTotal: number, // IDR
  realizedBudgetTotal: number, // IDR
  itemCount: number
): EvmVarianceFlag | null {
  // Exclude if no budget items or no planned budget allocation
  if (itemCount === 0 || plannedBudgetTotal <= 0) {
    return null;
  }

  const financialPercent = Math.round((realizedBudgetTotal / plannedBudgetTotal) * 100);

  // Exclude if both physical progress and realization are 0 (not started / inactive)
  if (physicalPercent === 0 && financialPercent === 0) {
    return null;
  }

  const diff = physicalPercent - financialPercent;

  // Threshold: > 30 percentage points variance
  if (diff > 30) {
    return {
      type: 'high_physical',
      physicalPercent,
      financialPercent,
      diff,
      message: '⚠️ Progress tercatat tapi anggaran belum banyak terpakai — cek apakah realisasi belum diinput',
      badgeLabel: `⚠️ Progress > Realisasi (+${diff}%)`,
    };
  }

  if (diff < -30) {
    return {
      type: 'high_financial',
      physicalPercent,
      financialPercent,
      diff,
      message: '⚠️ Anggaran terpakai signifikan tapi progress kerja masih rendah — perlu ditinjau',
      badgeLabel: `⚠️ Realisasi > Progress (+${Math.abs(diff)}%)`,
    };
  }

  return null; // Synced / Normal
}
