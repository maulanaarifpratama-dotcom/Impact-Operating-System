import type { WbsItemInput, StageInput } from './workPlan';

export interface MemberInfo {
  userId: string;
  displayName: string;
  email: string | null;
  jobTitle: string | null;
  accessRole: string | null;
  initials: string;
  avatarUrl: string | null;
}

export type WorkPlanFilter = 'all' | 'my-work' | 'unassigned' | 'overdue' | 'blocked';

export type DeadlineGroup =
  | 'overdue'
  | 'due-today'
  | 'due-7-days'
  | 'blocked'
  | 'in-progress'
  | 'awaiting-verification'
  | 'needs-revision'
  | 'completed'
  | 'no-deadline'
  | 'upcoming';

export interface GroupedItem {
  id: string;
  level: number;
  name: string;
  status: string;
  progress: number;
  pic: MemberInfo | null;
  stageTitle: string | null;
  parentActivityName: string | null;
  deadlineGroup: DeadlineGroup;
  startMonth: number | null;
  durationWeeks: number | null;
  ownerId: string | null;
}

export interface GroupedWorkload {
  group: DeadlineGroup;
  label: string;
  items: GroupedItem[];
}

export interface AssignmentMetrics {
  totalWork: number;
  withoutPIC: number;
  activitiesWithoutPIC: number;
  tasksWithoutPIC: number;
  myOverdue: number;
  projectOverdue: number;
  dueWithin7Days: number;
  dueWithin14Days: number;
  blocked: number;
  evidenceMissing: number;
  submittedForVerification: number;
  needsRevision: number;
}

const GROUP_LABELS: Record<DeadlineGroup, string> = {
  'overdue': 'Terlambat',
  'due-today': 'Jatuh Tempo Hari Ini',
  'due-7-days': 'Jatuh Tempo 7 Hari',
  'blocked': 'Terblokir',
  'in-progress': 'Sedang Dikerjakan',
  'awaiting-verification': 'Menunggu Verifikasi',
  'needs-revision': 'Perlu Revisi',
  'completed': 'Selesai',
  'no-deadline': 'Tenggat Belum Ditetapkan',
  'upcoming': 'Akan Jatuh Tempo',
};

const GROUP_ORDER: DeadlineGroup[] = [
  'overdue',
  'due-today',
  'due-7-days',
  'blocked',
  'in-progress',
  'awaiting-verification',
  'needs-revision',
  'completed',
  'no-deadline',
  'upcoming',
];

export function getGroupLabel(group: DeadlineGroup): string {
  return GROUP_LABELS[group] || group;
}

export function getGroupOrder(): readonly DeadlineGroup[] {
  return GROUP_ORDER;
}

function resolveStageId(item: WbsItemInput, allItems: WbsItemInput[]): string | null {
  let cur: WbsItemInput | undefined = item;
  const seen = new Set<string>();
  for (let guard = 0; guard < 10 && cur; guard++) {
    if (cur.level === 1) return cur.stage_id ?? null;
    if (!cur.parent_id || seen.has(cur.id)) break;
    seen.add(cur.id);
    cur = allItems.find((p) => p.id === cur!.parent_id);
  }
  return null;
}

function findLevel2Ancestor(item: WbsItemInput, allItems: WbsItemInput[]): WbsItemInput | null {
  let cur: WbsItemInput | undefined = item;
  for (let guard = 0; guard < 10 && cur; guard++) {
    if (cur.level === 2) return cur;
    if (!cur.parent_id) break;
    cur = allItems.find((p) => p.id === cur!.parent_id);
  }
  return null;
}

interface ComputeWorkloadInput {
  wbsItems: WbsItemInput[];
  stages: StageInput[];
  members: Map<string, MemberInfo>;
  currentUserId: string | null;
  filter: WorkPlanFilter;
  /** Items with claims that need attention */
  claimsMap?: Map<string, { needsRevision: boolean; submittedForVerification: boolean }>;
}

export function computeAssignmentMetrics(input: {
  wbsItems: WbsItemInput[];
  members: Map<string, MemberInfo>;
  currentUserId: string | null;
  currentDate?: Date;
  claimsMap?: Map<string, { needsRevision: boolean; submittedForVerification: boolean }>;
  evidenceMap?: Map<string, number>;
}): AssignmentMetrics {
  const { wbsItems, members, currentUserId, currentDate = new Date(), claimsMap, evidenceMap } = input;

  const active = wbsItems.filter((w) => w.level >= 2 && w.status !== 'cancelled');
  const withoutPIC = active.filter((w) => !w.pic || !members.has(w.pic)).length;
  const activitiesWithoutPIC = active.filter((w) => w.level === 2 && (!w.pic || !members.has(w.pic))).length;
  const tasksWithoutPIC = active.filter((w) => w.level >= 3 && (!w.pic || !members.has(w.pic))).length;

  let myOverdue = 0;
  let projectOverdue = 0;
  let dueWithin7Days = 0;
  let dueWithin14Days = 0;
  let blocked = 0;

  const sevenDaysFromNow = new Date(currentDate);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const fourteenDaysFromNow = new Date(currentDate);
  fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);

  for (const w of active) {
    if (w.status === 'completed') continue;
    if (w.status === 'blocked') { blocked++; continue; }

    const startMonth = w.start_month ?? 1;
    const durationWeeks = w.duration_weeks ?? 4;
    const endDate = new Date(currentDate);
    endDate.setMonth(endDate.getMonth() + startMonth - 1 + Math.ceil(durationWeeks / 4));

    const isMyItem = currentUserId && w.pic === currentUserId;

    if (endDate < currentDate) {
      projectOverdue++;
      if (isMyItem) myOverdue++;
    } else if (endDate <= fourteenDaysFromNow) {
      dueWithin14Days++;
      if (endDate <= sevenDaysFromNow) dueWithin7Days++;
    }
  }

  let evidenceMissing = 0;
  let submittedForVerification = 0;
  let needsRevision = 0;

  if (claimsMap) {
    for (const w of active) {
      const claim = claimsMap.get(w.id);
      if (claim) {
        if (claim.submittedForVerification) submittedForVerification++;
        if (claim.needsRevision) needsRevision++;
      }
    }
  }

  return {
    totalWork: active.length,
    withoutPIC,
    activitiesWithoutPIC,
    tasksWithoutPIC,
    myOverdue,
    projectOverdue,
    dueWithin7Days,
    dueWithin14Days,
    blocked,
    evidenceMissing,
    submittedForVerification,
    needsRevision,
  };
}

export function computeGroupedWorkload(input: ComputeWorkloadInput): GroupedWorkload[] {
  const { wbsItems, stages, members, currentUserId, filter, claimsMap } = input;

  const active = wbsItems.filter((w) => w.level >= 2 && w.status !== 'cancelled');

  const filtered = active.filter((w) => {
    if (filter === 'my-work') return currentUserId && w.pic === currentUserId;
    if (filter === 'unassigned') return !w.pic || !members.has(w.pic);
    if (filter === 'overdue') {
      if (w.status === 'completed') return false;
      const endDate = computeEndDate(w);
      return endDate < new Date();
    }
    if (filter === 'blocked') return w.status === 'blocked';
    return true;
  });

  const grouped = new Map<DeadlineGroup, GroupedItem[]>();
  for (const g of GROUP_ORDER) grouped.set(g, []);

  const stageById = new Map(stages.map((s) => [s.id, s.title]));

  for (const w of filtered) {
    const sid = resolveStageId(w, wbsItems);
    const stageTitle = sid ? (stageById.get(sid) || null) : null;
    const parent = findLevel2Ancestor(w, wbsItems);
    const parentActivityName = parent && parent.id !== w.id ? parent.name : null;

    const pic = w.pic ? members.get(w.pic) ?? null : null;

    const deadlineGroup = computeDeadlineGroup(w, claimsMap);

    grouped.get(deadlineGroup)!.push({
      id: w.id,
      level: w.level,
      name: w.name,
      status: w.status ?? 'not_started',
      progress: w.progress_percent ?? 0,
      pic,
      stageTitle,
      parentActivityName,
      deadlineGroup,
      startMonth: w.start_month ?? null,
      durationWeeks: w.duration_weeks ?? null,
      ownerId: w.pic ?? null,
    });
  }

  return GROUP_ORDER
    .filter((g) => grouped.get(g)!.length > 0)
    .map((g) => ({
      group: g,
      label: GROUP_LABELS[g],
      items: grouped.get(g)!,
    }));
}

function computeEndDate(w: WbsItemInput): Date {
  const startMonth = w.start_month ?? 1;
  const durationWeeks = w.duration_weeks ?? 4;
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + startMonth - 1 + Math.ceil(durationWeeks / 4));
  return endDate;
}

function computeDeadlineGroup(
  w: WbsItemInput,
  claimsMap?: Map<string, { needsRevision: boolean; submittedForVerification: boolean }>,
): DeadlineGroup {
  if (w.status === 'completed') return 'completed';
  if (w.status === 'blocked') return 'blocked';
  if (w.status === 'in_review') return 'awaiting-verification';

  const claim = claimsMap?.get(w.id);
  if (claim) {
    if (claim.needsRevision) return 'needs-revision';
    if (claim.submittedForVerification) return 'awaiting-verification';
  }

  if (w.status === 'not_started' || w.status === 'in_progress' || !w.status) {
    const endDate = computeEndDate(w);
    const now = new Date();
    const sevenDays = new Date(now);
    sevenDays.setDate(sevenDays.getDate() + 7);

    if (endDate < now) return 'overdue';

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const due = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    if (due.getTime() === today.getTime()) return 'due-today';

    if (endDate <= sevenDays) return 'due-7-days';
    return 'upcoming';
  }

  return 'no-deadline';
}

export function buildMemberLookup(members: MemberInfo[]): Map<string, MemberInfo> {
  const map = new Map<string, MemberInfo>();
  for (const m of members) {
    if (m.userId) map.set(m.userId, m);
  }
  return map;
}
