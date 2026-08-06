import { useMemo, useRef, useLayoutEffect, useState, useCallback } from 'react';
import { Calendar, Clock, AlertTriangle, Loader2, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { updateProjectStageMetadata } from '@/lib/project-management/stageRpc';
import {
  buildVisibleRows,
  type StageScheduleInput,
  type WbsScheduleInput,
} from '@/lib/project-management/scheduleModel';

interface WbsItem {
  id: string; level: number; parent_id: string | null; stage_id: string | null;
  name: string; status: string; progress_percent?: number | null;
  start_month?: number; duration_weeks?: number;
  blocked_reason?: string | null; owner_id?: string | null;
}

/** Canonical Stage shape with camelCase for Timeline consumption */
interface StageAdapter {
  id: string; title: string; isArchived: boolean;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  status: string;
}

interface DBStage {
  id: string; title: string; archived_at: string | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  status?: string;
}

interface OrgMember {
  user_id: string; full_name: string; job_title: string | null;
}

interface Props {
  wbsItems: WbsItem[];
  stages: DBStage[];
  orgMembers: OrgMember[];
  orgMemberLookup: Map<string, OrgMember>;
  isOwner: boolean;
  onScheduleChange?: (wbsId: string, field: 'start_month' | 'duration_weeks', value: number) => void;
  onStagesRefresh?: () => void;
}

const MONTH_WIDTH = 80;
const ROW_BASE_HEIGHT = 42;
const STAGE_HEADER_HEIGHT = 45;
const LEFT_WIDTH = 440;

function formatDate(d: Date | null): string {
  if (!d) return '—';
  const m = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()];
  return `${d.getDate()} ${m} ${d.getFullYear()}`;
}

function getMemberName(id: string | null, lookup: Map<string, OrgMember>): string | null {
  if (!id) return null;
  return lookup.get(id)?.full_name || null;
}

/** Normalize snake_case DB stages to camelCase Timeline adapters */
function adaptStages(dbStages: DBStage[]): StageAdapter[] {
  return dbStages
    .filter((s) => !s.archived_at)
    .map((s) => ({
      id: s.id,
      title: s.title,
      isArchived: false,
      plannedStartDate: s.planned_start_date?.trim() || null,
      plannedEndDate: s.planned_end_date?.trim() || null,
      status: s.status || 'not_started',
    }));
}

export default function ProjectTimelineView({
  wbsItems, stages: dbStages, orgMembers, orgMemberLookup, isOwner, onScheduleChange, onStagesRefresh,
}: Props) {
  const { toast } = useToast();
  const today = useMemo(() => new Date(), []);
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const leftRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);

  // Stage schedule dialog
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageTitle, setEditingStageTitle] = useState('');
  const [stageStart, setStageStart] = useState('');
  const [stageFinish, setStageFinish] = useState('');
  const [savingStage, setSavingStage] = useState(false);

  // Activity/Task schedule popover
  const [schedulePopoverId, setSchedulePopoverId] = useState<string | null>(null);
  const [popoverSm, setPopoverSm] = useState('1');
  const [popoverDw, setPopoverDw] = useState('1');

  const adaptedStages = useMemo(() => adaptStages(dbStages), [dbStages]);
  const stagesMap = useMemo(() => new Map(adaptedStages.map((s) => [s.id, s])), [adaptedStages]);

  const stagesMissingSchedule = adaptedStages.filter(
    (s) => !s.plannedStartDate || !s.plannedEndDate,
  );
  const stagesMissingCount = stagesMissingSchedule.length;
  const totalActiveStages = adaptedStages.length;

  const stageInputs: StageScheduleInput[] = useMemo(() =>
    adaptedStages.map((s) => ({
      id: s.id, title: s.title,
      planned_start_date: s.plannedStartDate,
      planned_end_date: s.plannedEndDate,
      actual_start_date: null, actual_end_date: null,
      status: s.status,
    })), [adaptedStages]);

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

  const hasAnyStageDates = useMemo(
    () => adaptedStages.some((s) => s.plannedStartDate),
    [adaptedStages],
  );

  // Timeline range
  const timelineRange = useMemo(() => {
    if (!hasAnyStageDates) return null;
    let minDate: Date | null = null;
    let maxDate: Date | null = null;
    for (const s of adaptedStages) {
      if (s.plannedStartDate) { const d = new Date(s.plannedStartDate); if (!minDate || d < minDate) minDate = d; }
      if (s.plannedEndDate) { const d = new Date(s.plannedEndDate); if (!maxDate || d > maxDate) maxDate = d; }
    }
    for (const r of visibleRows) {
      if (r.schedule.derivedStartDate) { const d = r.schedule.derivedStartDate; if (!minDate || d < minDate) minDate = d; }
      if (r.schedule.derivedFinishDate) { const d = r.schedule.derivedFinishDate; if (!maxDate || d > maxDate) maxDate = d; }
    }
    if (!minDate || !maxDate) return null;
    minDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    maxDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 2, 0);
    const months: { year: number; month: number; label: string }[] = [];
    const cursor = new Date(minDate);
    while (cursor <= maxDate) {
      const ml = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][cursor.getMonth()];
      months.push({ year: cursor.getFullYear(), month: cursor.getMonth(), label: `${ml} ${cursor.getFullYear()}` });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return { minDate, maxDate, months, totalMonths: months.length };
  }, [hasAnyStageDates, adaptedStages, visibleRows]);

  const getBarLeft = (date: Date): number => {
    if (!timelineRange?.minDate) return 0;
    const diff = (date.getFullYear() - timelineRange.minDate.getFullYear()) * 12 + (date.getMonth() - timelineRange.minDate.getMonth());
    return diff * MONTH_WIDTH;
  };

  const getBarWidth = (start: Date, finish: Date): number => {
    const days = (finish.getTime() - start.getTime()) / 86400000;
    if (days <= 0) return 4;
    return Math.max(4, (days / 30) * MONTH_WIDTH);
  };

  // Vertical scroll sync
  useLayoutEffect(() => {
    const left = leftPaneRef.current; const right = rightPaneRef.current;
    if (!left || !right) return;
    const sync = () => { right.scrollTop = left.scrollTop; };
    left.addEventListener('scroll', sync, { passive: true });
    return () => left.removeEventListener('scroll', sync);
  }, []);

  // Row height measurement
  useLayoutEffect(() => {
    const nh: Record<string, number> = {};
    let c = false;
    Object.entries(leftRowRefs.current).forEach(([k, el]) => {
      if (el) { const h = el.offsetHeight; if (h && rowHeights[k] !== h) { nh[k] = h; c = true; } }
    });
    if (c) setRowHeights((p) => ({ ...p, ...nh }));
  });

  // Open stage schedule dialog
  const openStageEdit = useCallback((stageId: string) => {
    const s = stagesMap.get(stageId);
    if (!s) return;
    setEditingStageId(stageId);
    setEditingStageTitle(s.title);
    setStageStart(s.plannedStartDate || '');
    setStageFinish(s.plannedEndDate || '');
    setStageDialogOpen(true);
  }, [stagesMap]);

  const saveStageSchedule = useCallback(async () => {
    if (!editingStageId || !stageStart || !stageFinish) {
      toast({ title: 'Tanggal Wajib', description: 'Tanggal Mulai dan Selesai harus diisi.', variant: 'destructive' });
      return;
    }
    if (stageFinish < stageStart) {
      toast({ title: 'Tanggal Tidak Valid', description: 'Tanggal Selesai tidak boleh sebelum Tanggal Mulai.', variant: 'destructive' });
      return;
    }
    setSavingStage(true);
    try {
      const { error } = await updateProjectStageMetadata({
        stageId: editingStageId,
        title: editingStageTitle,
        plannedStartDate: stageStart,
        plannedEndDate: stageFinish,
      });
      if (error) throw error;
      toast({ title: 'Jadwal Stage Disimpan' });
      setStageDialogOpen(false);
      setEditingStageId(null);
      if (onStagesRefresh) onStagesRefresh();
    } catch (err: any) {
      toast({ title: 'Gagal menyimpan', description: err?.message, variant: 'destructive' });
    } finally { setSavingStage(false); }
  }, [editingStageId, editingStageTitle, stageStart, stageFinish, toast, onStagesRefresh]);

  // Activity/Task schedule
  const openSchedulePopover = useCallback((row: { wbsId: string | null; startMonth: number | null; durationWeeks: number | null }) => {
    if (!row.wbsId) return;
    setSchedulePopoverId(row.wbsId);
    setPopoverSm(String(row.startMonth ?? 1));
    setPopoverDw(String(row.durationWeeks ?? 1));
  }, []);

  const saveActivitySchedule = useCallback((wbsId: string) => {
    const sm = parseInt(popoverSm); const dw = parseInt(popoverDw);
    if (sm < 1 || dw < 1) return;
    if (onScheduleChange) { onScheduleChange(wbsId, 'start_month', sm); onScheduleChange(wbsId, 'duration_weeks', dw); }
    setSchedulePopoverId(null);
  }, [popoverSm, popoverDw, onScheduleChange]);

  // Empty state
  if (!hasAnyStageDates && totalActiveStages > 0) {
    return (
      <div className="border rounded-lg bg-white dark:bg-slate-900 p-8 space-y-6">
        <div className="text-center">
          <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-bold">Jadwal proyek belum diatur</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Atur tanggal mulai dan selesai setiap Stage agar Activity dan Task dapat ditampilkan pada Gantt.
          </p>
        </div>
        <div className="space-y-2 max-w-lg mx-auto">
          <div className="text-xs font-semibold text-muted-foreground uppercase">Stage yang perlu diatur:</div>
          {stagesMissingSchedule.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-sm font-medium truncate">{s.title}</span>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[9px] text-amber-600">Belum diatur</Badge>
                {isOwner && (
                  <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => openStageEdit(s.id)}>
                    <Settings className="h-3 w-3 mr-1" /> Atur Jadwal
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        {totalActiveStages === 0 && (
          <p className="text-center text-xs text-muted-foreground">Buat Stage terlebih dahulu, lalu atur jadwalnya.</p>
        )}
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white dark:bg-slate-900 flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: 400 }}>
      {/* Setup banner */}
      {stagesMissingCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-b text-xs shrink-0">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span className="text-amber-800 dark:text-amber-300 flex-1">
            Jadwal Stage belum lengkap — {stagesMissingCount} dari {totalActiveStages} Stage belum memiliki jadwal.
          </span>
          {isOwner && (
            <Button size="sm" variant="outline" className="h-6 text-[9px] shrink-0" onClick={() => {
              const first = stagesMissingSchedule[0];
              if (first) openStageEdit(first.id);
            }}>
              Atur Stage Pertama
            </Button>
          )}
        </div>
      )}

      {/* Sticky headers */}
      <div className="flex border-b bg-slate-50 dark:bg-slate-900 shrink-0">
        <div className="py-2 px-4 text-[10px] font-bold uppercase text-slate-500 border-r" style={{ width: LEFT_WIDTH }}>Timeline</div>
        <div className="flex-1 overflow-x-auto">
          {timelineRange && (
            <div className="flex" style={{ minWidth: timelineRange.totalMonths * MONTH_WIDTH }}>
              {timelineRange.months.map((m, i) => (
                <div key={i} className="shrink-0 text-center py-2 text-[10px] font-bold text-slate-500 border-r dark:border-slate-800"
                  style={{ width: MONTH_WIDTH }}>{m.label}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left */}
        <div className="overflow-y-auto overflow-x-hidden border-r shrink-0" ref={leftPaneRef} style={{ width: LEFT_WIDTH }}>
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
                {row.type === 'stage-header' && (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold uppercase truncate">{row.title}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {row.schedule.missingSchedule ? (
                        isOwner && (
                          <Button size="sm" variant="outline" className="h-6 text-[8px] px-2" onClick={() => {
                            if (row.stageId) openStageEdit(row.stageId);
                          }}>
                            <Settings className="h-2.5 w-2.5 mr-0.5" /> Atur Jadwal
                          </Button>
                        )
                      ) : (
                        <>
                          <span className="text-[9px] text-muted-foreground font-normal">{row.schedule.derivedStartDate ? formatDate(row.schedule.derivedStartDate) : '—'} → {row.schedule.derivedFinishDate ? formatDate(row.schedule.derivedFinishDate) : '—'}</span>
                          {isOwner && (
                            <Button size="sm" variant="outline" className="h-6 text-[8px] px-2" onClick={() => {
                              if (row.stageId) openStageEdit(row.stageId);
                            }}>
                              Edit Jadwal
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
                {(row.type === 'activity' || row.type === 'task') && (
                  <div className="w-full">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`text-[8px] py-0 h-4 shrink-0 ${row.type === 'activity' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
                        {row.type === 'activity' ? 'Activity' : 'Task'}
                      </Badge>
                      <span className="text-xs font-medium truncate">{row.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {row.isMissingSchedule ? (
                        <span className="text-[8px] text-amber-600 flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" /> Tenggat Belum Diatur</span>
                      ) : (
                        <span className={`text-[8px] flex items-center gap-0.5 ${row.isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                          <Clock className="h-2.5 w-2.5" />
                          {row.schedule.derivedStartDate ? formatDate(row.schedule.derivedStartDate) : '—'} → {row.schedule.derivedFinishDate ? formatDate(row.schedule.derivedFinishDate) : '—'}
                          {row.isOverdue && <span className="ml-1">({row.schedule.label})</span>}
                        </span>
                      )}
                      {isOwner && row.wbsId && (
                        <Popover open={schedulePopoverId === row.wbsId} onOpenChange={(o) => { if (!o) setSchedulePopoverId(null); }}>
                          <PopoverTrigger asChild>
                            <Button size="sm" variant="outline" className="h-5 text-[8px] px-1.5 ml-auto shrink-0" onClick={() => openSchedulePopover(row)}>
                              <Settings className="h-2.5 w-2.5 mr-0.5" />
                              {row.isMissingSchedule ? 'Atur Jadwal' : 'Edit'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-60 text-xs" align="start">
                            <div className="space-y-2">
                              <div><Label className="text-[9px]">Mulai Bulan</Label>
                                <Input type="number" min={1} max={36} value={popoverSm} onChange={(e) => setPopoverSm(e.target.value)} className="h-7 text-xs" /></div>
                              <div><Label className="text-[9px]">Durasi Minggu</Label>
                                <Input type="number" min={1} max={52} value={popoverDw} onChange={(e) => setPopoverDw(e.target.value)} className="h-7 text-xs" /></div>
                              {(() => {
                                const sm = parseInt(popoverSm); const dw = parseInt(popoverDw);
                                if (sm >= 1 && dw >= 1 && row.stageId) {
                                  const sa = stagesMap.get(row.stageId);
                                  if (sa?.plannedStartDate) {
                                    const start = new Date(sa.plannedStartDate); start.setMonth(start.getMonth() + sm - 1);
                                    const finish = new Date(start.getTime() + dw * 7 * 86400000);
                                    return (<div className="text-[9px] text-muted-foreground space-y-0.5"><div>Perkiraan Mulai: {formatDate(start)}</div><div>Perkiraan Tenggat: {formatDate(finish)}</div></div>);
                                  }
                                }
                                return null;
                              })()}
                              <Button size="sm" className="w-full text-xs h-7" onClick={() => saveActivitySchedule(row.wbsId!)}>Simpan Jadwal</Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground">
                      {row.ownerId && <span className="truncate max-w-[100px]">{getMemberName(row.ownerId, orgMemberLookup)}</span>}
                      <span className={row.status === 'completed' ? 'text-emerald-700' : row.status === 'blocked' ? 'text-red-700' : ''}>{row.status}</span>
                      <span className="font-semibold">{row.progress}%</span>
                      {row.isBlocked && <AlertTriangle className="h-3 w-3 text-red-500" />}
                    </div>
                  </div>
                )}
                {row.type === 'subtask' && (
                  <div className="w-full">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[8px] py-0 h-4 bg-slate-100 text-slate-600 shrink-0">Subtask</Badge>
                      <span className="text-[10px] truncate">{row.title}</span>
                    </div>
                    <span className="text-[8px] text-muted-foreground">Jadwal mengikuti Task parent</span>
                  </div>
                )}
                {row.type === 'empty-stage' && <span className="text-[11px] text-muted-foreground italic">{row.title}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Right Gantt */}
        <div className="flex-1 overflow-y-auto overflow-x-auto" ref={rightPaneRef}>
          {timelineRange ? (
            <div style={{ minWidth: timelineRange.totalMonths * MONTH_WIDTH }}>
              {visibleRows.map((row) => {
                const h = rowHeights[row.key] || (row.type === 'stage-header' ? STAGE_HEADER_HEIGHT : ROW_BASE_HEIGHT);
                return (
                  <div key={`g-${row.key}`} className="border-b border-slate-100 dark:border-slate-800 relative flex items-center" style={{ height: h }}>
                    {timelineRange.months.map((_, i) => (
                      <div key={i} className="shrink-0 h-full border-r border-slate-50 dark:border-slate-800/30" style={{ width: MONTH_WIDTH }} />
                    ))}
                    {row.type === 'stage-header' && row.schedule.derivedStartDate && row.schedule.derivedFinishDate && (
                      <div className="absolute top-2 h-4 rounded border border-blue-400 bg-blue-100/60 dark:bg-blue-900/30"
                        style={{ left: getBarLeft(row.schedule.derivedStartDate), width: getBarWidth(row.schedule.derivedStartDate, row.schedule.derivedFinishDate) }} />
                    )}
                    {row.type === 'activity' && row.schedule.derivedStartDate && row.schedule.derivedFinishDate && (
                      <div className={`absolute top-2 h-5 rounded border shadow-sm bg-emerald-500/80 border-emerald-600 ${row.isOverdue ? 'ring-1 ring-red-400' : ''}`}
                        style={{ left: getBarLeft(row.schedule.derivedStartDate), width: getBarWidth(row.schedule.derivedStartDate, row.schedule.derivedFinishDate) }}>
                        {row.progress > 0 && <div className="absolute inset-y-0 left-0 bg-white/40 rounded-l" style={{ width: `${row.progress}%` }} />}
                        {row.progress > 0 && row.progress < 100 && (
                          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-semibold text-white drop-shadow-sm">{row.progress}%</span>
                        )}
                      </div>
                    )}
                    {row.type === 'task' && row.schedule.derivedStartDate && row.schedule.derivedFinishDate && (
                      <div className={`absolute top-2 h-4 rounded border shadow-sm bg-indigo-400/70 border-indigo-500 ${row.isOverdue ? 'ring-1 ring-red-400' : ''}`}
                        style={{ left: getBarLeft(row.schedule.derivedStartDate), width: getBarWidth(row.schedule.derivedStartDate, row.schedule.derivedFinishDate) }}>
                        {row.progress > 0 && <div className="absolute inset-y-0 left-0 bg-white/40 rounded-l" style={{ width: `${row.progress}%` }} />}
                      </div>
                    )}
                    {row.type === 'subtask' && (
                      <div className="absolute top-3 left-2 h-3 bg-slate-200/40 rounded border border-dashed border-slate-300" style={{ width: 40 }} />
                    )}
                    {(row.isMissingSchedule || row.type === 'empty-stage') && (row.type === 'activity' || row.type === 'task') && (
                      <div className="absolute top-2 left-2 text-[8px] text-amber-600 italic bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200">Belum diatur</div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Atur Stage dates untuk menampilkan Gantt.</div>
          )}
        </div>
      </div>

      {/* Stage Schedule Dialog */}
      <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-sm">Atur Jadwal Stage</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Stage</Label><Input value={editingStageTitle} disabled className="h-8 text-xs bg-slate-50" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Tanggal Mulai</Label><Input type="date" value={stageStart} onChange={(e) => setStageStart(e.target.value)} className="h-8 text-xs" /></div>
              <div><Label className="text-xs">Tanggal Selesai</Label><Input type="date" value={stageFinish} onChange={(e) => setStageFinish(e.target.value)} className="h-8 text-xs" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setStageDialogOpen(false)}>Batal</Button>
            <Button size="sm" className="text-xs" onClick={saveStageSchedule} disabled={savingStage}>
              {savingStage ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null} Simpan Jadwal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
