export type MirrorBudgetState = 'STATE_UNKNOWN' | 'STATE_A' | 'STATE_B' | 'STATE_C' | 'STATE_D';

export interface MirrorBudgetEvaluation {
  hasTargetBudget: boolean;
  targetBudget: number | null;
  detailedBudget: number;
  coveragePct: number;
  gapBudget: number | null;
  hasBudgetRows: boolean;
  unpricedRowsOnly: boolean;
  state: MirrorBudgetState;
  statusLabel: string;
  showDraftActions: boolean;
  showContinueAction: boolean;
}

export function evaluateMirrorBudgetModel(params: {
  targetBudget: number | null;
  detailedBudget: number;
  budgetRowCount: number;
}): MirrorBudgetEvaluation {
  const { targetBudget, detailedBudget, budgetRowCount } = params;

  const hasTargetBudget = targetBudget !== null && targetBudget > 0;
  const hasBudgetRows = budgetRowCount > 0;
  const unpricedRowsOnly = hasBudgetRows && detailedBudget === 0;
  const coveragePct = hasTargetBudget ? (detailedBudget / (targetBudget as number)) * 100 : 0;
  const gapBudget = hasTargetBudget ? (targetBudget as number) - detailedBudget : null;

  const state: MirrorBudgetState = !hasTargetBudget
    ? 'STATE_UNKNOWN'
    : !hasBudgetRows
      ? 'STATE_A'
      : unpricedRowsOnly
        ? 'STATE_B'
        : coveragePct < 100
          ? 'STATE_C'
          : 'STATE_D';

  const statusLabel = state === 'STATE_A'
    ? 'Detail anggaran belum dibuat'
    : state === 'STATE_B'
      ? 'Belum diberi harga'
      : state === 'STATE_C'
        ? 'Sebagian anggaran terisi'
        : state === 'STATE_D'
          ? 'Lengkap'
          : 'Target budget belum tersedia';

  const showDraftActions = hasTargetBudget && coveragePct === 0;
  const showContinueAction = hasTargetBudget && coveragePct > 0 && coveragePct < 100;

  return {
    hasTargetBudget,
    targetBudget,
    detailedBudget,
    coveragePct,
    gapBudget,
    hasBudgetRows,
    unpricedRowsOnly,
    state,
    statusLabel,
    showDraftActions,
    showContinueAction,
  };
}
