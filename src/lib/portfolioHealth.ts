/**
 * Portfolio Health Engine — pure aggregate computations for organization-wide metrics.
 *
 * Consumes per-project data (already fetched by the component) and produces
 * portfolio-level health scores, rankings, and risk indicators.
 *
 * All pure functions. No database access. No side effects.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface ProjectSnapshot {
  id: string;
  name: string;
  status: string;
  updatedAt: string | null;

  // MEAL
  mealScore: number;        // 0-100, from mealReadiness
  totalIndicators: number;
  missingPic: number;
  missingMov: number;

  // Execution
  totalActivities: number;
  completedActivities: number;
  overdueActivities: number;

  // Evidence
  totalClaims: number;
  verifiedClaims: number;
  pendingClaims: number;

  // Evaluation
  totalFindings: number;
  criticalFindings: number;

  // Learning
  totalLearning: number;
  publishedLearning: number;
  draftLearning: number;

  // Budget
  budgetComplianceScore: number | null;

  // SROI
  hasSroi: boolean;
  sroiRatio: number | null;
}

export type PortfolioRisk = 'healthy' | 'attention' | 'at_risk';

export interface PortfolioMetric {
  label: string;
  value: number | string;
  sublabel: string;
  trend: 'up' | 'down' | 'neutral';
  risk: PortfolioRisk;
  linkTo: string;
}

export interface PortfolioSummary {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  healthyProjects: number;
  attentionProjects: number;
  atRiskProjects: number;
  avgLifecycleScore: number;
  avgMealScore: number;
  avgBudgetScore: number;
  projectsWithoutSroi: number;
  projectsWithCriticalFindings: number;
  projectsMissingEvidence: number;
  projectsWithDraftLearning: number;
}

export interface ProjectRank {
  id: string;
  name: string;
  score: number;
  status: string;
  risk: PortfolioRisk;
  alerts: string[];
}

// ── Constants ───────────────────────────────────────────────────────────────

const LIFECYCLE_WEIGHTS = {
  meal: 0.25,
  execution: 0.25,
  evidence: 0.20,
  evaluation: 0.10,
  learning: 0.10,
  budget: 0.05,
  sroi: 0.05,
} as const;

// ── Per-project Lifecycle Score ─────────────────────────────────────────────

function clamp(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

export function computeProjectScore(snap: ProjectSnapshot): number {
  const mealScore = snap.mealScore;
  const execScore = snap.totalActivities > 0
    ? clamp((snap.completedActivities / snap.totalActivities) * 100 - Math.min(20, snap.overdueActivities * 3))
    : 50;
  const evidenceScore = snap.totalClaims > 0
    ? clamp((snap.verifiedClaims / snap.totalClaims) * 100)
    : 50;
  const evalScore = snap.totalFindings > 0
    ? clamp(70 - Math.min(50, (snap.criticalFindings / snap.totalFindings) * 60))
    : 50;
  const learningScore = snap.totalLearning > 0
    ? clamp((snap.publishedLearning / snap.totalLearning) * 100)
    : 50;
  const budgetScore = snap.budgetComplianceScore ?? 50;
  const sroiScore = snap.hasSroi ? 80 : 30;

  return clamp(
    mealScore * LIFECYCLE_WEIGHTS.meal +
    execScore * LIFECYCLE_WEIGHTS.execution +
    evidenceScore * LIFECYCLE_WEIGHTS.evidence +
    evalScore * LIFECYCLE_WEIGHTS.evaluation +
    learningScore * LIFECYCLE_WEIGHTS.learning +
    budgetScore * LIFECYCLE_WEIGHTS.budget +
    sroiScore * LIFECYCLE_WEIGHTS.sroi,
  );
}

export function projectRisk(score: number): PortfolioRisk {
  if (score >= 80) return 'healthy';
  if (score >= 60) return 'attention';
  return 'at_risk';
}

// ── Alerts from snapshot ────────────────────────────────────────────────────

export function projectAlerts(snap: ProjectSnapshot): string[] {
  const alerts: string[] = [];
  if (snap.missingPic > 0) alerts.push(`${snap.missingPic} PIC belum ditentukan`);
  if (snap.missingMov > 0) alerts.push(`${snap.missingMov} MoV belum diisi`);
  if (snap.overdueActivities > 0) alerts.push(`${snap.overdueActivities} aktivitas terlambat`);
  if (snap.pendingClaims > 0) alerts.push(`${snap.pendingClaims} klaim menunggu verifikasi`);
  if (snap.criticalFindings > 0) alerts.push(`${snap.criticalFindings} temuan kritis`);
  if (snap.draftLearning > 0) alerts.push(`${snap.draftLearning} pembelajaran draft`);
  if (!snap.hasSroi) alerts.push('Belum ada kalkulasi SROI');
  return alerts;
}

// ── Portfolio Aggregation ───────────────────────────────────────────────────

export function computePortfolioSummary(snapshots: ProjectSnapshot[]): PortfolioSummary {
  const scores = snapshots.map(s => computeProjectScore(s));
  const risks = scores.map(s => projectRisk(s));

  return {
    totalProjects: snapshots.length,
    activeProjects: snapshots.filter(s => s.status === 'active' || s.status === 'Aktif').length,
    completedProjects: snapshots.filter(s => s.status === 'completed' || s.status === 'Selesai').length,
    healthyProjects: risks.filter(r => r === 'healthy').length,
    attentionProjects: risks.filter(r => r === 'attention').length,
    atRiskProjects: risks.filter(r => r === 'at_risk').length,
    avgLifecycleScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    avgMealScore: snapshots.length > 0 ? Math.round(snapshots.reduce((a, s) => a + s.mealScore, 0) / snapshots.length) : 0,
    avgBudgetScore: snapshots.length > 0
      ? Math.round(snapshots.reduce((a, s) => a + (s.budgetComplianceScore ?? 50), 0) / snapshots.length)
      : 0,
    projectsWithoutSroi: snapshots.filter(s => !s.hasSroi).length,
    projectsWithCriticalFindings: snapshots.filter(s => s.criticalFindings > 0).length,
    projectsMissingEvidence: snapshots.filter(s => s.totalClaims > 0 && s.verifiedClaims < s.totalClaims).length,
    projectsWithDraftLearning: snapshots.filter(s => s.draftLearning > 0).length,
  };
}

export function rankProjects(snapshots: ProjectSnapshot[]): ProjectRank[] {
  return snapshots
    .map(s => {
      const score = computeProjectScore(s);
      return {
        id: s.id,
        name: s.name,
        score,
        status: s.status || 'unknown',
        risk: projectRisk(score),
        alerts: projectAlerts(s).slice(0, 3),
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ── Risk Metrics ────────────────────────────────────────────────────────────

export function computeRiskMetrics(snapshots: ProjectSnapshot[]): PortfolioMetric[] {
  const summary = computePortfolioSummary(snapshots);
  const ranks = rankProjects(snapshots);

  return [
    {
      label: 'Portfolio Health',
      value: `${summary.avgLifecycleScore}%`,
      sublabel: `${summary.healthyProjects} sehat, ${summary.atRiskProjects} berisiko`,
      trend: summary.avgLifecycleScore >= 70 ? 'up' : 'down',
      risk: summary.avgLifecycleScore >= 80 ? 'healthy' : summary.avgLifecycleScore >= 60 ? 'attention' : 'at_risk',
      linkTo: '/dashboard/portfolio',
    },
    {
      label: 'Proyek Aktif',
      value: summary.totalProjects,
      sublabel: `${summary.activeProjects} aktif, ${summary.completedProjects} selesai`,
      trend: 'neutral',
      risk: 'healthy',
      linkTo: '/dashboard/portfolio',
    },
    {
      label: 'Proyek Berisiko',
      value: summary.atRiskProjects,
      sublabel: ranks.length > 0 ? `${ranks.slice(0, 3).map(r => r.name).join(', ')}` : '—',
      trend: summary.atRiskProjects > 0 ? 'down' : 'up',
      risk: summary.atRiskProjects > 2 ? 'at_risk' : summary.atRiskProjects > 0 ? 'attention' : 'healthy',
      linkTo: '/dashboard/portfolio',
    },
    {
      label: 'Tanpa SROI',
      value: summary.projectsWithoutSroi,
      sublabel: summary.projectsWithoutSroi > 0 ? 'SROI memperkuat kelayakan program' : 'Semua proyek sudah terukur SROI',
      trend: summary.projectsWithoutSroi > 0 ? 'down' : 'up',
      risk: summary.projectsWithoutSroi > Math.ceil(summary.totalProjects * 0.3) ? 'at_risk' : summary.projectsWithoutSroi > 0 ? 'attention' : 'healthy',
      linkTo: '/dashboard/sroi-workspace',
    },
    {
      label: 'Temuan Kritis',
      value: summary.projectsWithCriticalFindings,
      sublabel: 'Proyek dengan temuan evaluasi kritis',
      trend: summary.projectsWithCriticalFindings > 0 ? 'down' : 'up',
      risk: summary.projectsWithCriticalFindings > 2 ? 'at_risk' : summary.projectsWithCriticalFindings > 0 ? 'attention' : 'healthy',
      linkTo: '/dashboard/project-management',
    },
    {
      label: 'Evidence Tertunda',
      value: summary.projectsMissingEvidence,
      sublabel: 'Proyek dengan klaim belum terverifikasi',
      trend: summary.projectsMissingEvidence > 0 ? 'down' : 'up',
      risk: summary.projectsMissingEvidence > 3 ? 'at_risk' : summary.projectsMissingEvidence > 0 ? 'attention' : 'healthy',
      linkTo: '/dashboard/project-management',
    },
    {
      label: 'MEAL Readiness',
      value: `${summary.avgMealScore}%`,
      sublabel: snapshots.filter(s => s.mealScore >= 80).length > 0
        ? `${snapshots.filter(s => s.mealScore >= 80).length} proyek siap monitoring`
        : 'Perlu peningkatan kesiapan MEAL',
      trend: summary.avgMealScore >= 70 ? 'up' : 'down',
      risk: summary.avgMealScore >= 80 ? 'healthy' : summary.avgMealScore >= 60 ? 'attention' : 'at_risk',
      linkTo: '/dashboard/lfa-builder',
    },
    {
      label: 'Draft Pembelajaran',
      value: summary.projectsWithDraftLearning,
      sublabel: 'Proyek dengan pembelajaran belum dipublikasi',
      trend: summary.projectsWithDraftLearning > 0 ? 'down' : 'up',
      risk: summary.projectsWithDraftLearning > 3 ? 'attention' : 'healthy',
      linkTo: '/dashboard/learning',
    },
  ];
}
