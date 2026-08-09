export interface StageInput {
  id: string;
  title: string;
  archived_at: string | null;
  sort_order?: number;
}

export interface WbsItemInput {
  id: string;
  level: 1 | 2 | 3 | 4;
  parent_id: string | null;
  name: string;
  status?: string | null;
  progress_percent?: number | null;
  pic?: string | null;
  owner_id?: string | null;
  reviewer_id?: string | null;
  start_month?: number;
  duration_weeks?: number;
  stage_id?: string | null;
  dependencies?: string[] | null;
}

export interface BudgetItemInput {
  id: string;
  wbs_item_id: string | null;
  volume: number | null;
  unit_price_idr: number | null;
}

export interface WorkPlanActivity {
  id: string;
  name: string;
  pic: string | null;
  status: string;
  progress: number;
  startMonth: number;
  durationWeeks: number;
  budgetTotal: number;
  stageId: string | null;
  tasks: WorkPlanTask[];
}

export interface WorkPlanTask {
  id: string;
  name: string;
  status: string;
  progress: number;
  startMonth: number;
  durationWeeks: number;
  subtasks: WorkPlanSubtask[];
}

export interface WorkPlanSubtask {
  id: string;
  name: string;
  status: string;
  progress: number;
}

export interface WorkPlanStage {
  id: string;
  title: string;
  activities: WorkPlanActivity[];
  progress: number;
  budgetTotal: number;
}

export interface WorkPlanView {
  stages: WorkPlanStage[];
  unassignedActivities: WorkPlanActivity[];
  projectProgress: number;
  projectBudgetTotal: number;
}

function isCancelled(item: Pick<WbsItemInput, 'status'>): boolean {
  return item.status === 'cancelled';
}

function getLeafDescendants(
  parentId: string,
  allItems: WbsItemInput[],
): WbsItemInput[] {
  const children = allItems.filter((i) => i.parent_id === parentId);
  if (children.length === 0) {
    const self = allItems.find((i) => i.id === parentId);
    return self ? [self] : [];
  }
  return children.flatMap((c) => getLeafDescendants(c.id, allItems));
}

/** Average of non-cancelled leaf descendants. Empty → 0. */
export function computeParentProgress(
  parentId: string,
  allItems: WbsItemInput[],
): number {
  const leaves = getLeafDescendants(parentId, allItems);
  const active = leaves.filter((l) => !isCancelled(l));
  if (active.length === 0) return 0;
  const sum = active.reduce((acc, l) => {
    if (l.status === 'completed') return acc + 100;
    return acc + (l.progress_percent ?? 0);
  }, 0);
  return Math.round(sum / active.length);
}

/** Item-level progress: manual for leaf, rollup for parent. */
export function computeItemProgress(
  item: WbsItemInput,
  allItems: WbsItemInput[],
): number {
  const children = allItems.filter((i) => i.parent_id === item.id);
  if (children.length > 0) {
    return computeParentProgress(item.id, allItems);
  }
  if (item.status === 'completed') return 100;
  return item.progress_percent ?? 0;
}

/**
 * Walk the parent chain from a WBS item up to find the Level-1 ancestor,
 * then return that ancestor's stage_id (or null).
 */
export function resolveStageId(
  item: WbsItemInput,
  allItems: WbsItemInput[],
): string | null {
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

/**
 * Walk up from a budget item's wbs_item_id to find the Level-2 Activity ancestor.
 */
function findLevel2AncestorId(
  wbsItemId: string,
  allItems: WbsItemInput[],
): string | null {
  let cur = allItems.find((i) => i.id === wbsItemId);
  for (let guard = 0; guard < 10 && cur; guard++) {
    if (cur.level === 2) return cur.id;
    if (!cur.parent_id) break;
    cur = allItems.find((i) => i.id === cur!.parent_id);
  }
  // If the budget item links directly to a Level-2, return it.
  const direct = allItems.find((i) => i.id === wbsItemId && i.level === 2);
  return direct?.id ?? null;
}

/** Sum of all budget items linked (through any descendant) to an Activity. */
export function computeActivityBudget(
  activityId: string,
  allWbsItems: WbsItemInput[],
  budgetItems: BudgetItemInput[],
): number {
  const subtreeIds = new Set<string>();

  const collect = (id: string) => {
    subtreeIds.add(id);
    allWbsItems.filter((i) => i.parent_id === id).forEach((c) => collect(c.id));
  };
  collect(activityId);

  let total = 0;
  for (const b of budgetItems) {
    if (b.wbs_item_id && subtreeIds.has(b.wbs_item_id)) {
      total += (Number(b.volume) || 0) * (Number(b.unit_price_idr) || 0);
    }
  }
  return total;
}

/** Sum of all budget items whose Level-2 ancestor belongs to a given Stage. */
export function computeStageBudget(
  stageId: string,
  stages: StageInput[],
  allWbsItems: WbsItemInput[],
  budgetItems: BudgetItemInput[],
): number {
  // Build the Work Plan to find which activities belong to this Stage.
  const view = buildWorkPlan(stages, allWbsItems, budgetItems);
  const stage = view.stages.find((s) => s.id === stageId);
  if (!stage) return 0;
  return stage.activities.reduce((sum, a) => sum + a.budgetTotal, 0);
}

/** Average progress of non-cancelled Activities in a Stage. */
export function computeStageProgress(
  activities: WorkPlanActivity[],
): number {
  const active = activities.filter((a) => a.status !== 'cancelled');
  if (active.length === 0) return 0;
  const sum = active.reduce((acc, a) => acc + a.progress, 0);
  return Math.round(sum / active.length);
}

/** Average progress of all Stages (non-archived). */
export function computeProjectProgress(
  stages: WorkPlanStage[],
): number {
  if (stages.length === 0) return 0;
  const sum = stages.reduce((acc, s) => acc + s.progress, 0);
  return Math.round(sum / stages.length);
}

function buildTask(
  item: WbsItemInput,
  allWbsItems: WbsItemInput[],
  budgetItems: BudgetItemInput[],
): WorkPlanTask {
  const subtaskItems = allWbsItems.filter(
    (i) => i.level === 4 && i.parent_id === item.id,
  );
  const subtasks: WorkPlanSubtask[] = subtaskItems.map((st) => ({
    id: st.id,
    name: st.name,
    status: st.status ?? 'not_started',
    progress: computeItemProgress(st, allWbsItems),
  }));

  return {
    id: item.id,
    name: item.name,
    status: item.status ?? 'not_started',
    progress: computeItemProgress(item, allWbsItems),
    startMonth: item.start_month ?? 1,
    durationWeeks: item.duration_weeks ?? 1,
    subtasks,
  };
}

function buildActivity(
  item: WbsItemInput,
  allWbsItems: WbsItemInput[],
  budgetItems: BudgetItemInput[],
  stageId: string | null,
): WorkPlanActivity {
  const taskItems = allWbsItems.filter(
    (i) => i.level === 3 && i.parent_id === item.id,
  );

  // Sort tasks by their original order (they're in sort_order in the real data,
  // but here we rely on input ordering).
  const tasks = taskItems.map((t) => buildTask(t, allWbsItems, budgetItems));

  return {
    id: item.id,
    name: item.name,
    pic: item.pic ?? null,
    status: item.status ?? 'not_started',
    progress: computeItemProgress(item, allWbsItems),
    startMonth: item.start_month ?? 1,
    durationWeeks: item.duration_weeks ?? 4,
    budgetTotal: computeActivityBudget(item.id, allWbsItems, budgetItems),
    stageId,
    tasks,
  };
}

/**
 * Build the canonical Work Plan view from raw data.
 *
 * Rules:
 * - Level 1 items are technical containers and never appear in the output.
 * - Level 2 = Activity (budget-bearing unit).
 * - Level 3 = Task.
 * - Level 4 = Subtask.
 * - Each Activity is placed under the Stage of its Level-1 ancestor.
 * - Activities whose Level-1 ancestor has no stage_id are "unassigned".
 * - Archived Stages are excluded.
 * - Cancelled items are still included in the tree but excluded from progress.
 */
export function buildWorkPlan(
  stages: StageInput[],
  allWbsItems: WbsItemInput[],
  budgetItems: BudgetItemInput[],
): WorkPlanView {
  const activeStages = stages.filter((s) => !s.archived_at);

  // Only Level 2 items (Activities) and their descendants matter.
  // Level 1 is the technical container.
  const level2Items = allWbsItems.filter((i) => i.level === 2);

  // Group Level 2 items by resolved Stage ID.
  const grouped = new Map<string | null, WbsItemInput[]>();
  for (const s of activeStages) {
    grouped.set(s.id, []);
  }
  const UNASSIGNED: string | null = null;
  grouped.set(UNASSIGNED, []);

  for (const act of level2Items) {
    const sid = resolveStageId(act, allWbsItems);
    const key = sid && grouped.has(sid) ? sid : UNASSIGNED;
    grouped.get(key)!.push(act);
  }

  // Build Stage views.
  const stageViews: WorkPlanStage[] = activeStages.map((s) => {
    const items = grouped.get(s.id) ?? [];
    const activities = items.map((act) =>
      buildActivity(act, allWbsItems, budgetItems, s.id),
    );
    return {
      id: s.id,
      title: s.title,
      activities,
      progress: computeStageProgress(activities),
      budgetTotal: activities.reduce((sum, a) => sum + a.budgetTotal, 0),
    };
  });

  // Build unassigned.
  const unassignedItems = grouped.get(UNASSIGNED) ?? [];
  const unassignedActivities = unassignedItems.map((act) =>
    buildActivity(act, allWbsItems, budgetItems, null),
  );

  // Project-level aggregates.
  const allActivities = [
    ...stageViews.flatMap((s) => s.activities),
    ...unassignedActivities,
  ];
  const projectBudgetTotal = allActivities.reduce(
    (sum, a) => sum + a.budgetTotal,
    0,
  );

  return {
    stages: stageViews,
    unassignedActivities,
    projectProgress: computeProjectProgress(stageViews),
    projectBudgetTotal,
  };
}
