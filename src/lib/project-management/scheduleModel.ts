/**
 * Canonical Project Management schedule adapter.
 * Work items own their calendar dates. Stage range derives from Activities.
 */

export interface StageScheduleInput {
  id: string;
  title: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  status: string;
}

export interface WbsScheduleInput {
  id: string;
  level: number;
  parentId: string | null;
  stageId: string | null;
  name: string;
  status: string;
  progressPercent: number;
  startMonth: number | null;
  durationWeeks: number | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  blockedReason: string | null;
  ownerId: string | null;
}

export type ScheduleState = 'on-time' | 'overdue' | 'completed' | 'blocked' | 'missing-schedule';

export interface ScheduleOutput {
  missingSchedule: boolean;
  state: ScheduleState;
  derivedStartDate: Date | null;
  derivedFinishDate: Date | null;
  daysOverdue: number;
  label: string;
}

export interface VisibleRow {
  key: string;
  type: 'stage-header' | 'activity' | 'task' | 'subtask' | 'empty-stage';
  wbsId: string | null;
  stageId: string | null;
  parentId: string | null;
  depth: number;
  title: string;
  ownerId: string | null;
  status: string;
  progress: number;
  schedule: ScheduleOutput;
  isOverdue: boolean;
  isBlocked: boolean;
  isMissingSchedule: boolean;
  rowHeight: number;
}

function isCancelled(s: string) { return s === 'cancelled'; }
function isCompleted(s: string) { return s === 'completed'; }

export function computeLeafProgress(item: WbsScheduleInput): number {
  return item.progressPercent ?? 0;
}

export function computeParentProgress(parentId: string, allItems: WbsScheduleInput[]): number {
  const children = allItems.filter((w) => w.parentId === parentId && w.level > 0);
  if (children.length === 0) {
    const self = allItems.find((w) => w.id === parentId);
    return self ? (self.progressPercent ?? 0) : 0;
  }
  const grandchildren = allItems.filter((w) => w.parentId && children.some((c) => c.id === w.parentId));
  if (grandchildren.length > 0) {
    const active = grandchildren.filter((g) => !isCancelled(g.status));
    if (active.length === 0) return 0;
    return Math.round(active.reduce((s, g) => s + (g.progressPercent ?? 0), 0) / active.length);
  }
  const active = children.filter((c) => !isCancelled(c.status));
  if (active.length === 0) return 0;
  return Math.round(active.reduce((s, c) => s + (c.progressPercent ?? 0), 0) / active.length);
}

export function computeItemProgress(item: WbsScheduleInput, allItems: WbsScheduleInput[]): number {
  const children = allItems.filter((w) => w.parentId === item.id && w.level > 0);
  if (children.length > 0) return computeParentProgress(item.id, allItems);
  return item.progressPercent ?? 0;
}

function evalDate(
  plannedStart: string | null, plannedEnd: string | null,
  status: string, today: Date,
): ScheduleOutput {
  const missing = !plannedStart || !plannedEnd;
  const start = plannedStart ? new Date(plannedStart) : null;
  const finish = plannedEnd ? new Date(plannedEnd) : null;

  if (missing || !start || !finish || isNaN(start.getTime()) || isNaN(finish.getTime())) {
    return { missingSchedule: true, state: 'missing-schedule', derivedStartDate: start, derivedFinishDate: finish, daysOverdue: 0, label: 'Jadwal Belum Diatur' };
  }

  if (isCompleted(status) || isCancelled(status)) {
    return { missingSchedule: false, state: 'completed', derivedStartDate: start, derivedFinishDate: finish, daysOverdue: 0, label: 'Selesai' };
  }

  if (status === 'blocked') {
    return { missingSchedule: false, state: 'blocked', derivedStartDate: start, derivedFinishDate: finish, daysOverdue: 0, label: 'Terblokir' };
  }

  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const finishDay = new Date(finish.getFullYear(), finish.getMonth(), finish.getDate());
  const diffDays = Math.floor((now.getTime() - finishDay.getTime()) / 86400000);

  if (diffDays > 0) {
    return { missingSchedule: false, state: 'overdue', derivedStartDate: start, derivedFinishDate: finish, daysOverdue: diffDays, label: `Terlambat ${diffDays} Hari` };
  }

  return { missingSchedule: false, state: 'on-time', derivedStartDate: start, derivedFinishDate: finish, daysOverdue: 0, label: 'Sesuai Jadwal' };
}

export function computeWbsSchedule(wbs: WbsScheduleInput, today: Date = new Date()): ScheduleOutput {
  return evalDate(wbs.plannedStartDate, wbs.plannedEndDate, wbs.status, today);
}

export function computeStageSchedule(
  stage: StageScheduleInput,
  stageWbsItems: WbsScheduleInput[],
  today: Date = new Date(),
): ScheduleOutput {
  const itemsInStage = stageWbsItems.filter((w) => w.stageId === stage.id && w.level >= 2 && w.plannedStartDate);
  if (itemsInStage.length > 0) {
    let earliest: Date | null = null;
    let latest: Date | null = null;
    for (const w of itemsInStage) {
      if (w.plannedStartDate) {
        const d = new Date(w.plannedStartDate);
        if (!earliest || d < earliest) earliest = d;
      }
      if (w.plannedEndDate) {
        const d = new Date(w.plannedEndDate);
        if (!latest || d > latest) latest = d;
      }
    }
    if (earliest && latest) {
      const startStr = earliest.toISOString().split('T')[0];
      const endStr = latest.toISOString().split('T')[0];
      return evalDate(startStr, endStr, stage.status, today);
    }
  }
  if (stage.planned_start_date && stage.planned_end_date) {
    return evalDate(stage.planned_start_date, stage.planned_end_date, stage.status, today);
  }
  return { missingSchedule: true, state: 'missing-schedule', derivedStartDate: null, derivedFinishDate: null, daysOverdue: 0, label: 'Jadwal Belum Tersedia' };
}

export function computeProjectRange(stages: StageScheduleInput[], wbsItems: WbsScheduleInput[]): { earliest: Date | null; latest: Date | null } {
  let earliest: Date | null = null;
  let latest: Date | null = null;
  for (const w of wbsItems) {
    if (w.level < 2) continue;
    if (w.plannedStartDate) { const d = new Date(w.plannedStartDate); if (!earliest || d < earliest) earliest = d; }
    if (w.plannedEndDate) { const d = new Date(w.plannedEndDate); if (!latest || d > latest) latest = d; }
  }
  for (const s of stages) {
    if (s.planned_start_date) { const d = new Date(s.planned_start_date); if (!earliest || d < earliest) earliest = d; }
    if (s.planned_end_date) { const d = new Date(s.planned_end_date); if (!latest || d > latest) latest = d; }
  }
  return { earliest, latest };
}

export interface BuildVisibleRowsInput {
  stages: StageScheduleInput[];
  wbsItems: WbsScheduleInput[];
  today?: Date;
}

function sortItemsByHierarchy(items: WbsScheduleInput[], allItems: WbsScheduleInput[]): WbsScheduleInput[] {
  const level2 = items.filter((w) => w.level === 2);
  const result: WbsScheduleInput[] = [];
  for (const l2 of level2) {
    result.push(l2);
    for (const c of allItems) { if (c.parentId === l2.id) { result.push(c); for (const gc of allItems) { if (gc.parentId === c.id) result.push(gc); } } }
  }
  return result;
}

export function buildVisibleRows(input: BuildVisibleRowsInput): VisibleRow[] {
  const { stages, wbsItems, today = new Date() } = input;
  const rows: VisibleRow[] = [];
  const stageById = new Map(stages.map((s) => [s.id, s]));

  const stageItems = new Map<string | null, WbsScheduleInput[]>();
  for (const s of stages) stageItems.set(s.id, []);
  const UNASSIGNED: string | null = null;

  for (const w of wbsItems) {
    if (w.level < 2) continue;
    const sid = w.stageId || UNASSIGNED;
    if (sid && stageItems.has(sid)) stageItems.get(sid)!.push(w);
    else {
      if (!stageItems.has(UNASSIGNED)) stageItems.set(UNASSIGNED, []);
      stageItems.get(UNASSIGNED)!.push(w);
    }
  }
  const unassignedItems = stageItems.get(UNASSIGNED) || [];

  for (const stage of stages) {
    const stageSchedule = computeStageSchedule(stage, wbsItems, today);
    rows.push({ key: `stage-${stage.id}`, type: 'stage-header', wbsId: null, stageId: stage.id, parentId: null, depth: 0, title: stage.title, ownerId: null, status: stage.status, progress: 0, startMonth: null, durationWeeks: null, schedule: stageSchedule, isOverdue: stageSchedule.state === 'overdue', isBlocked: false, isMissingSchedule: stageSchedule.missingSchedule, rowHeight: 45 });

    const items = stageItems.get(stage.id) || [];
    if (items.length === 0) {
      rows.push({ key: `empty-stage-${stage.id}`, type: 'empty-stage', wbsId: null, stageId: stage.id, parentId: null, depth: 1, title: 'Belum ada Activity di Stage ini.', ownerId: null, status: 'not_started', progress: 0, startMonth: null, durationWeeks: null, schedule: { missingSchedule: true, state: 'missing-schedule', derivedStartDate: null, derivedFinishDate: null, daysOverdue: 0, label: '' }, isOverdue: false, isBlocked: false, isMissingSchedule: false, rowHeight: 42 });
    } else {
      for (const w of sortItemsByHierarchy(items, wbsItems)) {
        const schedule = computeWbsSchedule(w, today);
        rows.push({ key: `wbs-${w.id}`, type: w.level === 2 ? 'activity' : w.level === 3 ? 'task' : 'subtask', wbsId: w.id, stageId: w.stageId || null, parentId: w.parentId, depth: w.level, title: w.name, ownerId: w.ownerId, status: w.status, progress: computeItemProgress(w, wbsItems), startMonth: w.startMonth, durationWeeks: w.durationWeeks, schedule, isOverdue: schedule.state === 'overdue', isBlocked: w.status === 'blocked', isMissingSchedule: schedule.missingSchedule, rowHeight: 42 });
      }
    }
  }

  if (unassignedItems.length > 0) {
    rows.push({ key: 'stage-unassigned', type: 'stage-header', wbsId: null, stageId: null, parentId: null, depth: 0, title: 'Belum Ditentukan Stage', ownerId: null, status: 'not_started', progress: 0, startMonth: null, durationWeeks: null, schedule: { missingSchedule: true, state: 'missing-schedule', derivedStartDate: null, derivedFinishDate: null, daysOverdue: 0, label: '' }, isOverdue: false, isBlocked: false, isMissingSchedule: false, rowHeight: 45 });
    for (const w of sortItemsByHierarchy(unassignedItems, wbsItems)) {
      rows.push({ key: `wbs-${w.id}`, type: w.level === 2 ? 'activity' : w.level === 3 ? 'task' : 'subtask', wbsId: w.id, stageId: null, parentId: w.parentId, depth: w.level, title: w.name, ownerId: w.ownerId, status: w.status, progress: computeItemProgress(w, wbsItems), startMonth: w.startMonth, durationWeeks: w.durationWeeks, schedule: { missingSchedule: true, state: 'missing-schedule', derivedStartDate: null, derivedFinishDate: null, daysOverdue: 0, label: 'Jadwal Belum Diatur' }, isOverdue: false, isBlocked: w.status === 'blocked', isMissingSchedule: true, rowHeight: 42 });
    }
  }

  return rows;
}
