export interface StageSnapshot {
  id: string;
  title: string;
  status: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  progress: number;
}

export interface WbsSnapshot {
  id: string;
  level: number;
  parentId: string | null;
  name: string;
  status: string;
  progress: number;
  pic: string | null;
  startMonth: number;
  durationWeeks: number;
  stageId: string | null;
  blockedReason: string | null;
}

export interface BudgetSnapshot {
  targetBudget: number | null;
  detailedBudget: number;
  coveragePercent: number;
  gapAmount: number | null;
  realization: number;
  utilizationPercent: number;
  budgetItemCount: number;
}

export interface DeliverableSnapshot {
  id: string;
  title: string;
  lifecycleStatus: string;
  stageId: string | null;
  targetDate: string | null;
}

export interface ClaimSnapshot {
  id: string;
  wbsItemId: string;
  status: string;
  claimedProgress: number;
}

export interface EvidenceSnapshot {
  id: string;
  claimId: string;
}

export interface ActivityEvent {
  entityType: string;
  entityId: string;
  eventType: string;
  createdAt: string;
}

export interface ProjectIndicator {
  id: string;
  label: string;
  value: string;
}

export interface ScheduleHealth {
  stageOverdue: number;
  activityOverdue: number;
  taskOverdue: number;
  upcomingDeadlines: number;
  blockedWork: number;
}

export interface ExecutionHealth {
  projectProgress: number;
  stageProgress: Record<string, number>;
  completedActivities: number;
  completedTasks: number;
  totalActivities: number;
  totalTasks: number;
  workWithoutPIC: number;
}

export interface BudgetHealth {
  targetBudget: number | null;
  detailedBudget: number;
  coveragePercent: number;
  gapAmount: number | null;
  realization: number;
  utilizationPercent: number;
  stageTotals: Record<string, number>;
  activitiesWithoutBudget: number;
}

export interface DeliverableHealth {
  planned: number;
  inProgress: number;
  submitted: number;
  needsRevision: number;
  accepted: number;
  overdue: number;
  total: number;
}

export interface EvidenceHealth {
  totalClaims: number;
  pendingVerification: number;
  verified: number;
  rejected: number;
  evidenceCount: number;
}

export interface MonitoringOutput {
  schedule: ScheduleHealth;
  execution: ExecutionHealth;
  budget: BudgetHealth;
  deliverables: DeliverableHealth;
  evidence: EvidenceHealth;
  warnings: string[];
  recentEvents: ActivityEvent[];
  projectIndicators: ProjectIndicator[];
}

const today = new Date();

function monthsAgo(months: number): Date {
  const d = new Date(today);
  d.setMonth(d.getMonth() - months);
  return d;
}

function computeScheduleHealth(
  stages: StageSnapshot[],
  wbsItems: WbsSnapshot[],
): ScheduleHealth {
  const now = today;
  const stageOverdue = stages.filter((s) => {
    if (!s.plannedEndDate) return false;
    return new Date(s.plannedEndDate) < now && s.status !== 'completed';
  }).length;

  let activityOverdue = 0;
  let taskOverdue = 0;
  let upcomingDeadlines = 0;
  let blockedWork = 0;

  for (const w of wbsItems) {
    if (w.status === 'blocked') blockedWork++;
    if (w.status === 'cancelled' || w.status === 'completed') continue;

    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + w.startMonth - 1 + Math.ceil(w.durationWeeks / 4));
    if (endDate < now) {
      if (w.level === 2) activityOverdue++;
      else if (w.level >= 3) taskOverdue++;
    }

    const threshold = new Date();
    threshold.setDate(threshold.getDate() + 14);
    if (endDate <= threshold && endDate >= now) {
      upcomingDeadlines++;
    }
  }

  return { stageOverdue, activityOverdue, taskOverdue, upcomingDeadlines, blockedWork };
}

function computeExecutionHealth(
  stages: StageSnapshot[],
  wbsItems: WbsSnapshot[],
): ExecutionHealth {
  const activeStages = stages.filter((s) => s.status !== 'archived');
  const projectProgress = activeStages.length > 0
    ? Math.round(activeStages.reduce((s, st) => s + st.progress, 0) / activeStages.length)
    : 0;

  const stageProgress: Record<string, number> = {};
  for (const s of stages) stageProgress[s.id] = s.progress;

  const level2Items = wbsItems.filter((w) => w.level === 2);
  const level3Items = wbsItems.filter((w) => w.level >= 3);
  const completedActivities = level2Items.filter((w) => w.status === 'completed').length;
  const completedTasks = level3Items.filter((w) => w.status === 'completed').length;

  const workWithoutPIC = wbsItems.filter(
    (w) => w.level >= 2 && !w.pic && w.status !== 'cancelled',
  ).length;

  return {
    projectProgress,
    stageProgress,
    completedActivities,
    completedTasks,
    totalActivities: level2Items.length,
    totalTasks: level3Items.length,
    workWithoutPIC,
  };
}

function computeBudgetHealth(budget: BudgetSnapshot, stageTotals: Record<string, number>): BudgetHealth {
  return {
    targetBudget: budget.targetBudget,
    detailedBudget: budget.detailedBudget,
    coveragePercent: budget.coveragePercent,
    gapAmount: budget.gapAmount,
    realization: budget.realization,
    utilizationPercent: budget.utilizationPercent,
    stageTotals,
    activitiesWithoutBudget: 0,
  };
}

function computeDeliverableHealth(deliverables: DeliverableSnapshot[]): DeliverableHealth {
  let planned = 0, inProgress = 0, submitted = 0, needsRevision = 0, accepted = 0, overdue = 0;

  for (const d of deliverables) {
    switch (d.lifecycleStatus) {
      case 'PLANNED': planned++; break;
      case 'IN_PROGRESS': inProgress++; break;
      case 'SUBMITTED': submitted++; break;
      case 'CHANGES_REQUESTED': needsRevision++; break;
      case 'ACCEPTED': accepted++; break;
    }
    if (d.targetDate && new Date(d.targetDate) < today && d.lifecycleStatus !== 'ACCEPTED' && d.lifecycleStatus !== 'CANCELLED') {
      overdue++;
    }
  }

  return { planned, inProgress, submitted, needsRevision, accepted, overdue, total: deliverables.length };
}

function computeEvidenceHealth(
  claims: ClaimSnapshot[],
  evidence: EvidenceSnapshot[],
): EvidenceHealth {
  const pendingVerification = claims.filter((c) => c.status === 'submitted').length;
  const verified = claims.filter((c) => c.status === 'verified').length;
  const rejected = claims.filter((c) => c.status === 'rejected').length;

  return {
    totalClaims: claims.length,
    pendingVerification,
    verified,
    rejected,
    evidenceCount: evidence.length,
  };
}

function deriveWarnings(
  schedule: ScheduleHealth,
  execution: ExecutionHealth,
  budget: BudgetHealth,
  deliverables: DeliverableHealth,
  evidence: EvidenceHealth,
): string[] {
  const warnings: string[] = [];

  if (schedule.activityOverdue > 0) warnings.push(`${schedule.activityOverdue} Activity melewati tenggat`);
  if (schedule.blockedWork > 0) warnings.push(`${schedule.blockedWork} item terhambat`);
  if (execution.workWithoutPIC > 0) warnings.push(`${execution.workWithoutPIC} item tanpa PIC`);
  if (budget.coveragePercent > 120) warnings.push('Anggaran melebihi 120% target');
  if (budget.coveragePercent < 80) warnings.push('Anggaran di bawah 80% target');
  if (deliverables.overdue > 0) warnings.push(`${deliverables.overdue} Deliverable melewati tenggat`);
  if (evidence.pendingVerification > 0) warnings.push(`${evidence.pendingVerification} klaim menunggu verifikasi`);

  return warnings;
}

export function computeMonitoring(input: {
  stages: StageSnapshot[];
  wbsItems: WbsSnapshot[];
  budget: BudgetSnapshot;
  deliverables: DeliverableSnapshot[];
  claims: ClaimSnapshot[];
  evidence: EvidenceSnapshot[];
  events: ActivityEvent[];
  indicators?: ProjectIndicator[];
  stageTotals?: Record<string, number>;
}): MonitoringOutput {
  const schedule = computeScheduleHealth(input.stages, input.wbsItems);
  const execution = computeExecutionHealth(input.stages, input.wbsItems);
  const budget = computeBudgetHealth(input.budget, input.stageTotals || {});
  const deliverables = computeDeliverableHealth(input.deliverables);
  const evidence = computeEvidenceHealth(input.claims, input.evidence);

  const warnings = deriveWarnings(schedule, execution, budget, deliverables, evidence);

  const recentEvents = input.events
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  return {
    schedule,
    execution,
    budget,
    deliverables,
    evidence,
    warnings,
    recentEvents,
    projectIndicators: input.indicators || [],
  };
}
