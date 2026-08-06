/**
 * Canonical Project Management schedule adapter.
 *
 * Pure functions only — no hooks, no Supabase, no mutations, no LFA terms.
 * Used by Timeline, Outline, and Control Center.
 */

export interface StageScheduleInput {
  id: string;
  title: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
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
  blockedReason: string | null;
  ownerId: string | null;
}

export type ScheduleState = 'on-time' | 'overdue' | 'due-soon-7' | 'due-soon-14' | 'completed' | 'blocked' | 'missing-schedule';

export interface ScheduleOutput {
  missingSchedule: boolean;
  state: ScheduleState;
  derivedStartDate: Date | null;
  derivedFinishDate: Date | null;
  daysOverdue: number;
  label: string;
}

export interface StageScheduleOutput extends ScheduleOutput {
  stageId: string;
  stageTitle: string;
}

export interface WbsScheduleOutput extends ScheduleOutput {
  wbsId: string;
  wbsName: string;
  level: number;
  stageTitle: string | null;
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
  startMonth: number | null;
  durationWeeks: number | null;
  schedule: ScheduleOutput;
  isOverdue: boolean;
  isBlocked: boolean;
  isMissingSchedule: boolean;
  rowHeight: number;
}

function isCancelled(status: string): boolean {
  return status === 'cancelled';
}

function isCompleted(status: string): boolean {
  return status === 'completed';
}

/** Compute leaf progress for PM: binary 0% or 100% */
export function computeLeafProgress(status: string): number {
  if (isCancelled(status)) return 0;
  return isCompleted(status) ? 100 : 0;
}

/** Rollup from non-cancelled children */
export function computeParentProgress(
  parentId: string,
  allItems: WbsScheduleInput[],
): number {
  const children = allItems.filter((w) => w.parentId === parentId && w.level > 0);
  if (children.length === 0) {
    const self = allItems.find((w) => w.id === parentId);
    return self ? computeLeafProgress(self.status) : 0;
  }
  const grandchildren = allItems.filter((w) => w.parentId && children.some((c) => c.id === w.parentId));
  if (grandchildren.length > 0) {
    const ownGrandchildren = grandchildren.filter((g) => !isCancelled(g.status));
    if (ownGrandchildren.length === 0) return 0;
    const sum = ownGrandchildren.reduce((s, g) => s + computeLeafProgress(g.status), 0);
    return Math.round(sum / ownGrandchildren.length);
  }
  const active = children.filter((c) => !isCancelled(c.status));
  if (active.length === 0) return 0;
  const sum = active.reduce((s, c) => s + computeLeafProgress(c.status), 0);
  return Math.round(sum / active.length);
}

export function computeItemProgress(
  item: WbsScheduleInput,
  allItems: WbsScheduleInput[],
): number {
  const children = allItems.filter((w) => w.parentId === item.id && w.level > 0);
  if (children.length > 0) return computeParentProgress(item.id, allItems);
  return computeLeafProgress(item.status);
}

/** Resolve the Level-2 ancestor for a WBS item */
function findLevel2Ancestor(item: WbsScheduleInput, allItems: WbsScheduleInput[]): WbsScheduleInput | null {
  let cur: WbsScheduleInput | undefined = item;
  for (let guard = 0; guard < 10 && cur; guard++) {
    if (cur.level === 2) return cur;
    if (!cur.parentId) break;
    cur = allItems.find((w) => w.id === cur!.parentId);
  }
  return null;
}

/** Anchor WBS schedule to Stage calendar date */
function anchorDate(
  startMonth: number | null,
  durationWeeks: number | null,
  stagePlannedStart: string | null,
): { start: Date | null; finish: Date | null; missing: boolean } {
  if (!stagePlannedStart || startMonth == null || durationWeeks == null || durationWeeks <= 0) {
    return { start: null, finish: null, missing: true };
  }
  const anchor = new Date(stagePlannedStart);
  if (isNaN(anchor.getTime())) return { start: null, finish: null, missing: true };

  const start = new Date(anchor);
  start.setMonth(start.getMonth() + (startMonth - 1));
  start.setDate(1); // first of the month

  const finish = new Date(start);
  finish.setDate(finish.getDate() + durationWeeks * 7);

  if (isNaN(start.getTime()) || isNaN(finish.getTime())) {
    return { start: null, finish: null, missing: true };
  }

  return { start, finish, missing: false };
}

export function computeWbsSchedule(
  wbs: WbsScheduleInput,
  stagePlannedStart: string | null,
  today: Date = new Date(),
): ScheduleOutput {
  const { start, finish, missing } = anchorDate(wbs.startMonth, wbs.durationWeeks, stagePlannedStart);

  if (missing || !finish) {
    return {
      missingSchedule: true,
      state: 'missing-schedule',
      derivedStartDate: start,
      derivedFinishDate: finish,
      daysOverdue: 0,
      label: 'Tenggat Belum Diatur',
    };
  }

  if (isCompleted(wbs.status) || isCancelled(wbs.status)) {
    return {
      missingSchedule: false,
      state: 'completed',
      derivedStartDate: start,
      derivedFinishDate: finish,
      daysOverdue: 0,
      label: 'Selesai',
    };
  }

  if (wbs.status === 'blocked') {
    return {
      missingSchedule: false,
      state: 'blocked',
      derivedStartDate: start,
      derivedFinishDate: finish,
      daysOverdue: 0,
      label: 'Terblokir',
    };
  }

  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const finishDay = new Date(finish.getFullYear(), finish.getMonth(), finish.getDate());
  const msPerDay = 86400000;
  const diffDays = Math.floor((now.getTime() - finishDay.getTime()) / msPerDay);

  if (diffDays > 0) {
    return {
      missingSchedule: false,
      state: 'overdue',
      derivedStartDate: start,
      derivedFinishDate: finish,
      daysOverdue: diffDays,
      label: `Terlambat ${diffDays} Hari`,
    };
  }

  const sevenDays = new Date(now);
  sevenDays.setDate(sevenDays.getDate() + 7);
  if (finishDay <= sevenDays && finishDay >= now) {
    const daysAway = Math.floor((finishDay.getTime() - now.getTime()) / msPerDay);
    const label = daysAway === 0 ? 'Jatuh Tempo Hari Ini' : `Jatuh Tempo ${daysAway} Hari`;
    return {
      missingSchedule: false,
      state: 'due-soon-7',
      derivedStartDate: start,
      derivedFinishDate: finish,
      daysOverdue: 0,
      label,
    };
  }

  const fourteenDays = new Date(now);
  fourteenDays.setDate(fourteenDays.getDate() + 14);
  if (finishDay <= fourteenDays) {
    const daysAway = Math.floor((finishDay.getTime() - now.getTime()) / msPerDay);
    return {
      missingSchedule: false,
      state: 'due-soon-14',
      derivedStartDate: start,
      derivedFinishDate: finish,
      daysOverdue: 0,
      label: `Jatuh Tempo ${daysAway} Hari`,
    };
  }

  return {
    missingSchedule: false,
    state: 'on-time',
    derivedStartDate: start,
    derivedFinishDate: finish,
    daysOverdue: 0,
    label: 'Akan Jatuh Tempo',
  };
}

export function computeStageSchedule(
  stage: StageScheduleInput,
  today: Date = new Date(),
): ScheduleOutput {
  if (!stage.planned_end_date) {
    return {
      missingSchedule: true,
      state: 'missing-schedule',
      derivedStartDate: stage.planned_start_date ? new Date(stage.planned_start_date) : null,
      derivedFinishDate: null,
      daysOverdue: 0,
      label: 'Tenggat Belum Diatur',
    };
  }

  const finish = new Date(stage.planned_end_date);
  if (isNaN(finish.getTime())) {
    return {
      missingSchedule: true,
      state: 'missing-schedule',
      derivedStartDate: stage.planned_start_date ? new Date(stage.planned_start_date) : null,
      derivedFinishDate: null,
      daysOverdue: 0,
      label: 'Tenggat Belum Diatur',
    };
  }

  if (isCompleted(stage.status) || stage.status === 'archived') {
    return {
      missingSchedule: false,
      state: 'completed',
      derivedStartDate: stage.planned_start_date ? new Date(stage.planned_start_date) : null,
      derivedFinishDate: finish,
      daysOverdue: 0,
      label: 'Selesai',
    };
  }

  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const finishDay = new Date(finish.getFullYear(), finish.getMonth(), finish.getDate());
  const diffDays = Math.floor((now.getTime() - finishDay.getTime()) / 86400000);

  if (diffDays > 0) {
    return {
      missingSchedule: false,
      state: 'overdue',
      derivedStartDate: stage.planned_start_date ? new Date(stage.planned_start_date) : null,
      derivedFinishDate: finish,
      daysOverdue: diffDays,
      label: `Terlambat ${diffDays} Hari`,
    };
  }

  return {
    missingSchedule: false,
    state: 'on-time',
    derivedStartDate: stage.planned_start_date ? new Date(stage.planned_start_date) : null,
    derivedFinishDate: finish,
    daysOverdue: 0,
    label: 'Sesuai Jadwal',
  };
}

export interface BuildVisibleRowsInput {
  stages: StageScheduleInput[];
  wbsItems: WbsScheduleInput[];
  today?: Date;
}

export function buildVisibleRows(input: BuildVisibleRowsInput): VisibleRow[] {
  const { stages, wbsItems, today = new Date() } = input;
  const rows: VisibleRow[] = [];
  const stageById = new Map(stages.map((s) => [s.id, s]));

  // Build Stage → items map
  const stageItems = new Map<string | null, WbsScheduleInput[]>();
  for (const s of stages) stageItems.set(s.id, []);
  const UNASSIGNED: string | null = null;

  for (const w of wbsItems) {
    if (w.level < 2) continue;
    const sid = w.stageId || UNASSIGNED;
    if (sid && stageItems.has(sid)) {
      stageItems.get(sid)!.push(w);
    } else {
      if (!stageItems.has(UNASSIGNED)) stageItems.set(UNASSIGNED, []);
      stageItems.get(UNASSIGNED)!.push(w);
    }
  }

  const unassignedItems = stageItems.get(UNASSIGNED) || [];

  for (const stage of stages) {
    const stageSchedule = computeStageSchedule(stage, today);
    rows.push({
      key: `stage-${stage.id}`,
      type: 'stage-header',
      wbsId: null,
      stageId: stage.id,
      parentId: null,
      depth: 0,
      title: stage.title,
      ownerId: null,
      status: stage.status,
      progress: 0,
      startMonth: null,
      durationWeeks: null,
      schedule: stageSchedule,
      isOverdue: stageSchedule.state === 'overdue',
      isBlocked: false,
      isMissingSchedule: stageSchedule.missingSchedule,
      rowHeight: 45,
    });

    const items = stageItems.get(stage.id) || [];
    if (items.length === 0) {
      // Sort: Level 2 first, then children follow parent order
      const sorted = sortItemsByHierarchy(items, wbsItems);
      rows.push({
        key: `empty-stage-${stage.id}`,
        type: 'empty-stage',
        wbsId: null,
        stageId: stage.id,
        parentId: null,
        depth: 1,
        title: 'Belum ada Activity di Stage ini.',
        ownerId: null,
        status: 'not_started',
        progress: 0,
        startMonth: null,
        durationWeeks: null,
        schedule: { missingSchedule: true, state: 'missing-schedule', derivedStartDate: null, derivedFinishDate: null, daysOverdue: 0, label: '' },
        isOverdue: false,
        isBlocked: false,
        isMissingSchedule: false,
        rowHeight: 42,
      });
    } else {
      const sorted = sortItemsByHierarchy(items, wbsItems);
      const stageStart = stage.planned_start_date;
      for (const w of sorted) {
        const schedule = computeWbsSchedule(w, stageStart, today);
        const parent = w.parentId ? wbsItems.find((p) => p.id === w.parentId) : null;
        const ancestor = findLevel2Ancestor(w, wbsItems);
        const activitySchedule = ancestor ? computeWbsSchedule(ancestor, stageStart, today) : schedule;

        rows.push({
          key: `wbs-${w.id}`,
          type: w.level === 2 ? 'activity' : w.level === 3 ? 'task' : 'subtask',
          wbsId: w.id,
          stageId: w.stageId || null,
          parentId: w.parentId,
          depth: w.level,
          title: w.name,
          ownerId: w.ownerId,
          status: w.status,
          progress: computeItemProgress(w, wbsItems),
          startMonth: w.startMonth,
          durationWeeks: w.durationWeeks,
          schedule: w.level === 4 ? (ancestor ? computeWbsSchedule(ancestor, stageStart, today) : schedule) : schedule,
          isOverdue: schedule.state === 'overdue',
          isBlocked: w.status === 'blocked',
          isMissingSchedule: schedule.missingSchedule,
          rowHeight: 42,
        });
      }
    }
  }

  // Unassigned heading + items
  if (unassignedItems.length > 0) {
    rows.push({
      key: 'stage-unassigned',
      type: 'stage-header',
      wbsId: null,
      stageId: null,
      parentId: null,
      depth: 0,
      title: 'Belum Ditentukan Stage',
      ownerId: null,
      status: 'not_started',
      progress: 0,
      startMonth: null,
      durationWeeks: null,
      schedule: { missingSchedule: true, state: 'missing-schedule', derivedStartDate: null, derivedFinishDate: null, daysOverdue: 0, label: '' },
      isOverdue: false,
      isBlocked: false,
      isMissingSchedule: false,
      rowHeight: 45,
    });

    const sorted = sortItemsByHierarchy(unassignedItems, wbsItems);
    for (const w of sorted) {
      const schedule: ScheduleOutput = { missingSchedule: true, state: 'missing-schedule', derivedStartDate: null, derivedFinishDate: null, daysOverdue: 0, label: 'Tenggat Belum Diatur' };
      rows.push({
        key: `wbs-${w.id}`,
        type: w.level === 2 ? 'activity' : w.level === 3 ? 'task' : 'subtask',
        wbsId: w.id,
        stageId: null,
        parentId: w.parentId,
        depth: w.level,
        title: w.name,
        ownerId: w.ownerId,
        status: w.status,
        progress: computeItemProgress(w, wbsItems),
        startMonth: w.startMonth,
        durationWeeks: w.durationWeeks,
        schedule,
        isOverdue: false,
        isBlocked: w.status === 'blocked',
        isMissingSchedule: true,
        rowHeight: 42,
      });
    }
  }

  return rows;
}

/** Sort: Level 2 first, then children follow parent order */
function sortItemsByHierarchy(
  items: WbsScheduleInput[],
  allItems: WbsScheduleInput[],
): WbsScheduleInput[] {
  const level2 = items.filter((w) => w.level === 2);
  const result: WbsScheduleInput[] = [];

  for (const l2 of level2) {
    result.push(l2);
    const children = allItems.filter((w) => w.parentId === l2.id);
    for (const c of children) {
      result.push(c);
      const grandchildren = allItems.filter((w) => w.parentId === c.id);
      for (const gc of grandchildren) {
        result.push(gc);
      }
    }
  }

  return result;
}
