/**
 * Lifecycle Health Engine — pure derived computations for programme lifecycle health.
 *
 * Aggregates budget, MEAL, execution, evidence, evaluation, and learning
 * dimensions into a single 0-100 Lifecycle Health Score. All computations
 * are pure — no database access, no side effects.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface LifecycleAggregate {
  budget: {
    complianceScore: number | null;
    utilizationPct: number | null;
  };
  meal: {
    readinessScore: number;
    totalIndicators: number;
    readyIndicators: number;
    missingPic: number;
    missingMov: number;
    missingTarget: number;
    missingMethod: number;
    missingFrequency: number;
    incomplete: number;
  };
  execution: {
    totalActivities: number;
    completedActivities: number;
    inProgressActivities: number;
    overdueActivities: number;
    progressPct: number | null;
  };
  evidence: {
    totalClaims: number;
    verifiedClaims: number;
    pendingClaims: number;
  };
  evaluation: {
    totalFindings: number;
    criticalFindings: number;
    openFindings: number;
  };
  learning: {
    totalEntries: number;
    publishedEntries: number;
    draftEntries: number;
  };
}

export interface HealthDimension {
  key: string;
  label: string;
  score: number;
  weight: number;
  status: 'healthy' | 'attention' | 'at_risk';
  detail: string;
}

export interface LifecycleAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  count: number;
  dimension: string;
  linkTo: string;
}

export type LifecycleHealthStatus = 'healthy' | 'attention' | 'at_risk';

export interface LifecycleHealthResult {
  score: number;
  status: LifecycleHealthStatus;
  statusLabel: string;
  dimensions: HealthDimension[];
  alerts: LifecycleAlert[];
}

// ── Constants ───────────────────────────────────────────────────────────────

const WEIGHTS: Record<string, number> = {
  budget: 0.20,
  meal: 0.20,
  execution: 0.25,
  evidence: 0.15,
  evaluation: 0.10,
  learning: 0.10,
};

const DIMENSION_LABELS: Record<string, string> = {
  budget: 'Kesehatan Anggaran',
  meal: 'Kesiapan MEAL',
  execution: 'Eksekusi Program',
  evidence: 'Kematangan Bukti',
  evaluation: 'Cakupan Evaluasi',
  learning: 'Kematangan Pembelajaran',
};

// ── Engine ──────────────────────────────────────────────────────────────────

function clamp(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

function healthStatus(score: number): LifecycleHealthStatus {
  if (score >= 80) return 'healthy';
  if (score >= 60) return 'attention';
  return 'at_risk';
}

function statusLabel(status: LifecycleHealthStatus): string {
  switch (status) {
    case 'healthy': return 'Sehat';
    case 'attention': return 'Perlu Perhatian';
    case 'at_risk': return 'Berisiko';
  }
}

function computeBudgetHealth(a: LifecycleAggregate['budget']): number {
  if (a.complianceScore != null) return clamp(a.complianceScore);
  if (a.utilizationPct != null) return clamp(a.utilizationPct);
  return 4; // No data — return low default
}

function computeMealHealth(a: LifecycleAggregate['meal']): number {
  return a.readinessScore; // Already 0-100 from mealReadiness.ts
}

function computeExecutionHealth(a: LifecycleAggregate['execution']): number {
  if (a.totalActivities === 0) return 4; // No activities — not measurable
  const completion = clamp((a.completedActivities / a.totalActivities) * 100);
  const overduePenalty = Math.min(20, a.overdueActivities * 3);
  return clamp(completion - overduePenalty);
}

function computeEvidenceHealth(a: LifecycleAggregate['evidence']): number {
  if (a.totalClaims === 0) return 4; // No claims yet — cannot measure
  return clamp((a.verifiedClaims / a.totalClaims) * 100);
}

function computeEvaluationHealth(a: LifecycleAggregate['evaluation']): number {
  if (a.totalFindings === 0) return 5; // No findings — not yet evaluated
  const severeRatio = a.criticalFindings / a.totalFindings;
  const penalty = Math.min(50, Math.round(severeRatio * 60));
  return clamp(70 - penalty);
}

function computeLearningHealth(a: LifecycleAggregate['learning']): number {
  if (a.totalEntries === 0) return 3; // No learning yet
  return clamp((a.publishedEntries / a.totalEntries) * 100);
}

function dimensionDetail(key: string, score: number, agg: LifecycleAggregate): string {
  switch (key) {
    case 'budget':
      if (agg.budget.complianceScore != null) return `Skor Kepatuhan: ${score}%`;
      if (agg.budget.utilizationPct != null) return `Utilisasi: ${score}%`;
      return 'Data anggaran belum tersedia';
    case 'meal':
      return `${agg.meal.readyIndicators}/${agg.meal.totalIndicators} indikator siap`;
    case 'execution':
      return `${agg.execution.completedActivities}/${agg.execution.totalActivities} aktivitas selesai${agg.execution.overdueActivities > 0 ? ` (${agg.execution.overdueActivities} terlambat)` : ''}`;
    case 'evidence':
      return `${agg.evidence.verifiedClaims}/${agg.evidence.totalClaims} klaim terverifikasi`;
    case 'evaluation':
      return `${agg.evaluation.totalFindings} temuan (${agg.evaluation.criticalFindings} kritis)`;
    case 'learning':
      return `${agg.learning.publishedEntries}/${agg.learning.totalEntries} dipublikasikan`;
    default:
      return '';
  }
}

function generateAlerts(agg: LifecycleAggregate): LifecycleAlert[] {
  const alerts: LifecycleAlert[] = [];

  // MEAL alerts
  if (agg.meal.missingPic > 0) {
    alerts.push({ id: 'meal-missing-pic', severity: 'warning', message: 'Indikator tanpa PIC', count: agg.meal.missingPic, dimension: 'meal', linkTo: '/dashboard/lfa-builder?tab=meal&filter=missing_pic' });
  }
  if (agg.meal.missingMov > 0) {
    alerts.push({ id: 'meal-missing-mov', severity: 'warning', message: 'Indikator tanpa MoV', count: agg.meal.missingMov, dimension: 'meal', linkTo: '/dashboard/lfa-builder?tab=meal&filter=missing_mov' });
  }
  if (agg.meal.incomplete > 0) {
    alerts.push({ id: 'meal-incomplete', severity: 'critical', message: 'Indikator belum lengkap', count: agg.meal.incomplete, dimension: 'meal', linkTo: '/dashboard/lfa-builder?tab=meal&filter=incomplete' });
  }
  if (agg.meal.missingTarget > 0) {
    alerts.push({ id: 'meal-missing-target', severity: 'warning', message: 'Indikator tanpa target', count: agg.meal.missingTarget, dimension: 'meal', linkTo: '/dashboard/lfa-builder?tab=meal&filter=missing_target' });
  }
  if (agg.meal.missingMethod > 0) {
    alerts.push({ id: 'meal-missing-method', severity: 'warning', message: 'Indikator tanpa metode', count: agg.meal.missingMethod, dimension: 'meal', linkTo: '/dashboard/lfa-builder?tab=meal&filter=missing_method' });
  }
  if (agg.meal.missingFrequency > 0) {
    alerts.push({ id: 'meal-missing-frequency', severity: 'warning', message: 'Indikator tanpa frekuensi', count: agg.meal.missingFrequency, dimension: 'meal', linkTo: '/dashboard/lfa-builder?tab=meal&filter=missing_frequency' });
  }

  // Execution alerts
  if (agg.execution.overdueActivities > 0) {
    alerts.push({ id: 'exec-overdue', severity: 'critical', message: 'Aktivitas terlambat', count: agg.execution.overdueActivities, dimension: 'execution', linkTo: '/dashboard/project-management' });
  }

  // Evidence alerts
  if (agg.evidence.pendingClaims > 0) {
    alerts.push({ id: 'evidence-pending', severity: 'warning', message: 'Klaim menunggu verifikasi', count: agg.evidence.pendingClaims, dimension: 'evidence', linkTo: '/dashboard/project-management' });
  }

  // Evaluation alerts
  if (agg.evaluation.criticalFindings > 0) {
    alerts.push({ id: 'eval-critical', severity: 'critical', message: 'Temuan kritis', count: agg.evaluation.criticalFindings, dimension: 'evaluation', linkTo: '/dashboard/project-management' });
  }

  // Learning alerts
  if (agg.learning.draftEntries > 0) {
    alerts.push({ id: 'learn-draft', severity: 'info', message: 'Pembelajaran belum dipublikasi', count: agg.learning.draftEntries, dimension: 'learning', linkTo: '/dashboard/learning?status=my_drafts' });
  }
  if (agg.learning.publishedEntries > 0) {
    alerts.push({ id: 'learn-published', severity: 'info', message: 'Pembelajaran dipublikasi', count: agg.learning.publishedEntries, dimension: 'learning', linkTo: '/dashboard/learning?status=published' });
  }

  alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3);
  });

  return alerts;
}

export function computeLifecycleHealth(agg: LifecycleAggregate): LifecycleHealthResult {
  const dimensions: HealthDimension[] = [];
  let weightedSum = 0;
  let activeWeightSum = 0;

  const computeDim = (key: string, fn: (a: any) => number, data: any) => {
    const raw = fn(data);
    const score = raw <= 4 ? 0 : raw; // Scores <=4 are "no data" → considered 0 for aggregate
    const weight = WEIGHTS[key];
    dims.push({ key, score, weight, raw });
    if (raw > 4) {
      weightedSum += score * weight;
      activeWeightSum += weight;
    }
    return score;
  };

  const dims: Array<{ key: string; score: number; weight: number; raw: number }> = [];
  computeDim('budget', computeBudgetHealth, agg.budget);
  computeDim('meal', computeMealHealth, agg.meal);
  computeDim('execution', computeExecutionHealth, agg.execution);
  computeDim('evidence', computeEvidenceHealth, agg.evidence);
  computeDim('evaluation', computeEvaluationHealth, agg.evaluation);
  computeDim('learning', computeLearningHealth, agg.learning);

  // Normalize: if some dimensions have no data, re-weight the rest
  const totalScore = activeWeightSum > 0
    ? clamp((weightedSum / activeWeightSum) * 100)
    : 0;

  const status = healthStatus(totalScore);

  for (const d of dims) {
    dimensions.push({
      key: d.key,
      label: DIMENSION_LABELS[d.key] || d.key,
      score: d.raw <= 4 ? 0 : d.raw,
      weight: d.weight,
      status: healthStatus(d.raw <= 4 ? 50 : d.raw), // "no data" gets neutral status
      detail: dimensionDetail(d.key, d.raw, agg),
    });
  }

  const alerts = generateAlerts(agg);

  return {
    score: totalScore,
    status,
    statusLabel: statusLabel(status),
    dimensions,
    alerts,
  };
}

// Re-export constants for external use
export { WEIGHTS, DIMENSION_LABELS, healthStatus, statusLabel };
