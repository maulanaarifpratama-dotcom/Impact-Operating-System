import { useMemo, useRef, useLayoutEffect, useState, useCallback, Fragment } from 'react';
import { AlertTriangle, Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  buildVisibleRows,
  computeItemProgress,
  type VisibleRow,
  type StageScheduleInput,
  type WbsScheduleInput,
} from '@/lib/project-management/scheduleModel';

interface WbsItem {
  id: string;
  level: number;
  parent_id: string | null;
  stage_id: string | null;
  name: string;
  status: string;
  progress_percent?: number | null;
  start_month?: number;
  duration_weeks?: number;
  blocked_reason?: string | null;
  owner_id?: string | null;
}

interface Stage {
  id: string;
  title: string;
  archived_at: string | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
}

interface OrgMember {
  user_id: string;
  full_name: string;
  job_title: string | null;
}

interface Props {
  wbsItems: WbsItem[];
  stages: Stage[];
  orgMembers: OrgMember[];
  orgMemberLookup: Map<string, OrgMember>;
  isOwner: boolean;
  onScheduleChange?: (wbsId: string, field: 'start_month' | 'duration_weeks', value: number) => void;
}

const MONTH_WIDTH = 80;
const ROW_BASE_HEIGHT = 42;
const STAGE_HEADER_HEIGHT = 45;

function formatDate(d: Date | null, includeYear = false): string {
  if (!d) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const m = months[d.getMonth()];
  const day = d.getDate();
  if (includeYear) return `${day} ${m} ${d.getFullYear()}`;
  return `${day} ${m}`;
}

function getStatusStyle(status: string): string {
  switch (status) {
    case 'completed': return 'text-emerald-700';
    case 'in_progress': return 'text-blue-700';
    case 'blocked': return 'text-red-700';
    case 'in_review': return 'text-purple-700';
    default: return 'text-slate-600';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'not_started': return 'Belum Mulai';
    case 'in_progress': return 'Berjalan';
    case 'blocked': return 'Terhambat';
    case 'in_review': return 'Review';
    case 'completed': return 'Selesai';
    case 'cancelled': return 'Batal';
    default: return status;
  }
}

function getMemberName(id: string | null, lookup: Map<string, OrgMember>): string | null {
  if (!id) return null;
  const m = lookup.get(id);
  return m?.full_name || null;
}

export default function ProjectTimelineView({
  wbsItems, stages, orgMembers, orgMemberLookup, isOwner, onScheduleChange,
}: Props) {
  const today = useMemo(() => new Date(), []);
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const leftRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);

  const stageInputs: StageScheduleInput[] = useMemo(() =>
    stages.filter((s) => !s.archived_at).map((s) => ({
      id: s.id, title: s.title,
      planned_start_date: (s as any).planned_start_date || null,
      planned_end_date: (s as any).planned_end_date || null,
      actual_start_date: (s as any).actual_start_date || null,
      actual_end_date: (s as any).actual_end_date || null,
      status: (s as any).status || 'not_started',
    })), [stages]);

  const wbsInputs: WbsScheduleInput[] = useMemo(() =>
    wbsItems.filter((w) => w.level >= 2).map((w) => ({
      id: w.id, level: w.level, parentId: w.parent_id, stageId: w.stage_id || null,
      name: w.name, status: w.status || 'not_started', progressPercent: w.progress_percent ?? 0,
      startMonth: w.start_month ?? null, durationWeeks: w.duration_weeks ?? null,
      blockedReason: w.blocked_reason || null, ownerId: w.owner_id || null,
    })), [wbsItems]);

  const visibleRows = useMemo(
    () => buildVisibleRows({ stages: stageInputs, wbsItems: wbsInputs, today }),
    [stageInputs, wbsInputs, today],
  );

  // Compute timeline range
  const timelineRange = useMemo(() => {
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    for (const s of stageInputs) {
      if (s.planned_start_date) {
        const d = new Date(s.planned_start_date);
        if (!minDate || d < minDate) minDate = d;
      }
      if (s.planned_end_date) {
        const d = new Date(s.planned_end_date);
        if (!maxDate || d > maxDate) maxDate = d;
      }
    }

    for (const r of visibleRows) {
      if (r.schedule.derivedStartDate) {
        const d = r.schedule.derivedStartDate;
        if (!minDate || d < minDate) minDate = d;
      }
      if (r.schedule.derivedFinishDate) {
        const d = r.schedule.derivedFinishDate;
        if (!maxDate || d > maxDate) maxDate = d;
      }
    }

    if (!minDate || !maxDate) {
      minDate = new Date(today.getFullYear(), today.getMonth(), 1);
      maxDate = new Date(today.getFullYear(), today.getMonth() + 6, 0);
    }

    // Round to month boundaries
    minDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    maxDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);

    const months: { year: number; month: number; label: string }[] = [];
    const cursor = new Date(minDate);
    while (cursor <= maxDate) {
      months.push({
        year: cursor.getFullYear(),
        month: cursor.getMonth(),
        label: formatDate(cursor, true).split(' ').slice(1).join(' '),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return { minDate, maxDate, months, totalMonths: months.length };
  }, [stageInputs, visibleRows, today]);

  const getBarLeft = (date: Date): number => {
    if (!timelineRange.minDate) return 0;
    const monthsDiff = (date.getFullYear() - timelineRange.minDate.getFullYear()) * 12 +
      (date.getMonth() - timelineRange.minDate.getMonth());
    return monthsDiff * MONTH_WIDTH;
  };

  const getBarWidth = (start: Date, finish: Date): number => {
    const daysTotal = (finish.getTime() - start.getTime()) / 86400000;
    if (daysTotal <= 0) return 4;
    const daysInMonth = 30;
    return Math.max(4, (daysTotal / daysInMonth) * MONTH_WIDTH);
  };

  // Sync vertical scroll
  useLayoutEffect(() => {
    const leftEl = leftPaneRef.current;
    const rightEl = rightPaneRef.current;
    if (!leftEl || !rightEl) return;
    const sync = () => { rightEl.scrollTop = leftEl.scrollTop; };
    leftEl.addEventListener('scroll', sync, { passive: true });
    return () => leftEl.removeEventListener('scroll', sync);
  }, []);

  // Measure row heights
  useLayoutEffect(() => {
    const newHeights: Record<string, number> = {};
    let changed = false;
    Object.entries(leftRowRefs.current).forEach(([key, el]) => {
      if (el) {
        const h = el.offsetHeight;
        if (h && rowHeights[key] !== h) {
          newHeights[key] = h;
          changed = true;
        }
      }
    });
    if (changed) setRowHeights((prev) => ({ ...prev, ...newHeights }));
  });

  const handleScheduleInput = (wbsId: string, field: 'start_month' | 'duration_weeks', value: number) => {
    if (onScheduleChange) onScheduleChange(wbsId, field, value);
  };

  if (visibleRows.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground">
        Buat Stage terlebih dahulu, lalu tambahkan Activity di dalamnya.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-900" style={{ maxHeight: '600px' }}>
      {/* Month header — sticky in right pane only */}
      <div className="flex border-b bg-slate-50 dark:bg-slate-900">
        {/* Left header */}
        <div className="w-[380px] shrink-0 px-4 py-2 text-[10px] font-bold uppercase text-slate-500 border-r">
          Timeline
        </div>
        {/* Right header */}
        <div className="flex-1 overflow-x-auto" ref={rightPaneRef}>
          <div className="flex" style={{ minWidth: timelineRange.totalMonths * MONTH_WIDTH }}>
            {timelineRange.months.map((m, i) => (
              <div key={i} className="shrink-0 text-center py-2 text-[10px] font-bold text-slate-500 border-r dark:border-slate-800"
                style={{ width: MONTH_WIDTH }}>
                {m.label} {m.year}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Body — single vertical scroll */}
      <div className="flex" style={{ height: 'calc(600px - 40px)' }} ref={containerRef}>
        {/* Left pane */}
        <div className="w-[380px] shrink-0 border-r overflow-y-auto overflow-x-hidden" ref={leftPaneRef}>
          {visibleRows.map((row) => (
            <div
              key={row.key}
              ref={(el) => (leftRowRefs.current[row.key] = el)}
              className={`flex items-center gap-1 px-2 py-1.5 border-b dark:border-slate-800 ${
                row.type === 'stage-header' ? 'bg-slate-100 dark:bg-slate-800/60 font-bold' :
                row.type === 'empty-stage' ? 'pl-6 text-[11px] text-muted-foreground italic' :
                row.depth === 2 ? 'pl-6' : row.depth === 3 ? 'pl-12' : 'pl-20'
              } ${row.isOverdue ? 'border-l-2 border-l-red-500' : ''}`}
              style={{ minHeight: row.type === 'stage-header' ? STAGE_HEADER_HEIGHT : ROW_BASE_HEIGHT }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {row.type === 'stage-header' && (
                    <span className="text-xs font-bold uppercase truncate">{row.title}</span>
                  )}
                  {row.type === 'activity' && (
                    <>
                      <Badge variant="outline" className="text-[8px] py-0 h-4 bg-emerald-50 text-emerald-700 shrink-0">Activity</Badge>
                      <span className="text-xs font-medium truncate">{row.title}</span>
                    </>
                  )}
                  {row.type === 'task' && (
                    <>
                      <Badge variant="outline" className="text-[8px] py-0 h-4 bg-indigo-50 text-indigo-700 shrink-0">Task</Badge>
                      <span className="text-xs truncate">{row.title}</span>
                    </>
                  )}
                  {row.type === 'subtask' && (
                    <>
                      <Badge variant="outline" className="text-[8px] py-0 h-4 bg-slate-100 text-slate-600 shrink-0">Subtask</Badge>
                      <span className="text-[10px] truncate">{row.title}</span>
                    </>
                  )}
                  {row.type === 'empty-stage' && <span>{row.title}</span>}
                </div>

                {/* Schedule info */}
                {(row.type === 'activity' || row.type === 'task') && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[9px] ${row.isOverdue ? 'text-red-600 font-semibold' : row.isMissingSchedule ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      {row.isMissingSchedule ? (
                        <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" />Tenggat Belum Diatur</span>
                      ) : row.isOverdue ? (
                        <span className="flex items-center gap-0.5"><AlertTriangle className="h-2.5 w-2.5" />{row.schedule.label}</span>
                      ) : (
                        <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{row.schedule.label}</span>
                      )}
                    </span>
                    {isOwner && row.wbsId && (
                      <div className="flex items-center gap-1 ml-auto">
                        <Input
                          type="number" min={1} max={36}
                          value={row.startMonth ?? ''}
                          placeholder="Bulan"
                          onChange={(e) => {
                            const v = parseInt(e.target.value);
                            if (v >= 1) handleScheduleInput(row.wbsId!, 'start_month', v);
                          }}
                          className="w-12 h-5 text-[9px] px-1"
                          title="Mulai Bulan"
                        />
                        <span className="text-[8px] text-muted-foreground">bln</span>
                        <Input
                          type="number" min={1} max={52}
                          value={row.durationWeeks ?? ''}
                          placeholder="Mgg"
                          onChange={(e) => {
                            const v = parseInt(e.target.value);
                            if (v >= 1) handleScheduleInput(row.wbsId!, 'duration_weeks', v);
                          }}
                          className="w-10 h-5 text-[9px] px-1"
                          title="Durasi Minggu"
                        />
                        <span className="text-[8px] text-muted-foreground">mgg</span>
                      </div>
                    )}
                  </div>
                )}

                {/* PIC, status, progress */}
                {(row.type === 'activity' || row.type === 'task') && (
                  <div className="flex items-center gap-2 mt-0.5 text-[9px]">
                    {row.ownerId && (
                      <span className="text-muted-foreground truncate max-w-[100px]">
                        {getMemberName(row.ownerId, orgMemberLookup)}
                      </span>
                    )}
                    <span className={getStatusStyle(row.status)}>{getStatusLabel(row.status)}</span>
                    <span className="font-semibold">{row.progress}%</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right pane — Gantt */}
        <div className="flex-1 overflow-y-auto overflow-x-auto" ref={rightPaneRef}>
          <div style={{ minWidth: timelineRange.totalMonths * MONTH_WIDTH, minHeight: visibleRows.length * ROW_BASE_HEIGHT }}>
            {visibleRows.map((row) => {
              const height = rowHeights[row.key] || (row.type === 'stage-header' ? STAGE_HEADER_HEIGHT : ROW_BASE_HEIGHT);
              const barColor =
                row.type === 'stage-header' ? 'bg-blue-500/40 border-blue-500' :
                row.type === 'activity' ? 'bg-emerald-500/80 border-emerald-600' :
                row.type === 'task' ? 'bg-indigo-400/70 border-indigo-500' :
                'bg-slate-200/50';

              return (
                <div key={`gantt-${row.key}`} className="border-b border-slate-100 dark:border-slate-800 relative flex items-center"
                  style={{ height }}>
                  {/* Grid lines */}
                  {timelineRange.months.map((_, i) => (
                    <div key={i} className="shrink-0 h-full border-r border-slate-50 dark:border-slate-800/30"
                      style={{ width: MONTH_WIDTH }} />
                  ))}

                  {/* Stage bar */}
                  {row.type === 'stage-header' && row.schedule.derivedStartDate && row.schedule.derivedFinishDate && (
                    <div
                      className="absolute top-2 h-4 rounded border opacity-60"
                      style={{
                        left: getBarLeft(row.schedule.derivedStartDate),
                        width: getBarWidth(row.schedule.derivedStartDate, row.schedule.derivedFinishDate),
                      }}
                      title={`${row.title}: ${formatDate(row.schedule.derivedStartDate)} → ${formatDate(row.schedule.derivedFinishDate)}`}
                    />
                  )}

                  {/* Activity/Task bar */}
                  {(row.type === 'activity' || row.type === 'task') && row.schedule.derivedStartDate && row.schedule.derivedFinishDate && (
                    <>
                      <div
                        className={`absolute top-2 h-5 rounded border shadow-sm ${barColor} ${
                          row.isOverdue ? 'border-red-500 ring-1 ring-red-300' : ''
                        }`}
                        style={{
                          left: getBarLeft(row.schedule.derivedStartDate),
                          width: getBarWidth(row.schedule.derivedStartDate, row.schedule.derivedFinishDate),
                        }}
                        title={`${row.title}: ${formatDate(row.schedule.derivedStartDate)} → ${formatDate(row.schedule.derivedFinishDate)}`}
                      >
                        {/* Progress overlay */}
                        {row.progress > 0 && (
                          <div
                            className="absolute inset-y-0 left-0 bg-white/40 rounded-l"
                            style={{ width: `${row.progress}%` }}
                          />
                        )}
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-semibold text-white drop-shadow-sm">
                          {row.progress}%
                        </span>
                      </div>
                      {row.isBlocked && (
                        <div className="absolute top-1 right-1" title="Terblokir">
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                        </div>
                      )}
                    </>
                  )}

                  {/* Subtask context row */}
                  {row.type === 'subtask' && (
                    <div className="absolute top-2 left-2 h-4 bg-slate-200/40 rounded border border-dashed border-slate-300"
                      style={{ width: MONTH_WIDTH * 0.5 }}
                      title="Jadwal mengikuti Task parent" />
                  )}

                  {/* Missing schedule indicator */}
                  {(row.type === 'activity' || row.type === 'task') && row.isMissingSchedule && (
                    <div className="absolute top-2 left-2 text-[9px] text-amber-600 italic bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200">
                      <Calendar className="h-2.5 w-2.5 inline mr-0.5" />
                      Tenggat Belum Diatur
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
