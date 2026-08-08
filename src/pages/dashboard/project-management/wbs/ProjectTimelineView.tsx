import { useMemo, useRef, useLayoutEffect, useState, useCallback } from 'react';
import { Calendar, Loader2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { updateProjectStageMetadata } from '@/lib/project-management/stageRpc';
import { isBlocked, getExecutionStatusLabel } from '@/lib/project-management/executionModel';

// ── Types ──

interface WbsItem {
  id: string; level: number; parent_id: string | null; stage_id: string | null;
  name: string; status: string; duration_weeks?: number; progress_percent?: number;
  blocker_category?: string | null;
}

interface DBStage {
  id: string; title: string; archived_at: string | null;
  planned_start_date?: string | null; planned_end_date?: string | null;
  actual_start_date?: string | null; actual_end_date?: string | null;
}

type ScheduleMode = 'plan' | 'actual' | 'overlay';

interface Props {
  wbsItems: WbsItem[];
  stages: DBStage[];
  isOwner: boolean;
  onStagesRefresh?: () => void;
  onDurationChange?: (wbsId: string, weeks: number) => void;
  onAddActivity?: (stageId: string) => void;
}

// ── Constants ──

const MONTH_W = 200;
const ROW_H = 40;
const LEFT_W = 420;

const MONTHS_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

// ── Helpers ──

function fmtShort(d: string | null | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function stageStart(s: DBStage, mode: ScheduleMode): string | null {
  return mode === 'plan' ? s.planned_start_date ?? null : s.actual_start_date ?? null;
}
function stageEnd(s: DBStage, mode: ScheduleMode): string | null {
  return mode === 'plan' ? s.planned_end_date ?? null : s.actual_end_date ?? null;
}
function hasDates(s: DBStage, mode: ScheduleMode): boolean {
  return !!(stageStart(s, mode) && stageEnd(s, mode));
}

function weeksBetween(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / (7 * 86400000)));
}

// ── Row types ──

interface FlatRow {
  key: string;
  type: 'phase' | 'activity' | 'task';
  item: WbsItem | null;
  stage: DBStage | null;
  depth: number;
  barLeft: number;
  barWidth: number;
  hasOverflow: boolean;
  actualLeft?: number;
  actualWidth?: number;
  isDelayed?: boolean;
}

// ── Component ──

export default function ProjectTimelineView({
  wbsItems, stages, isOwner,
  onStagesRefresh, onDurationChange, onAddActivity,
}: Props) {
  const { toast } = useToast();
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('plan');
  const bodyRef = useRef<HTMLDivElement>(null);

  const [dlg, setDlg] = useState(false);
  const [ds, setDs] = useState<DBStage | null>(null);
  const [d1, setD1] = useState(''); const [d2, setD2] = useState('');
  const [d3, setD3] = useState(''); const [d4, setD4] = useState('');
  const [sv, setSv] = useState(false);

  // ── Resolve stage_id via Level-1 ancestor ──

  const resolveStageId = useCallback((item: WbsItem): string | null => {
    let cur: WbsItem | undefined = item;
    const seen = new Set<string>();
    while (cur) {
      if (cur.level === 1) return cur.stage_id ?? null;
      if (!cur.parent_id || seen.has(cur.id)) return null;
      seen.add(cur.id);
      cur = wbsItems.find((p) => p.id === cur!.parent_id);
    }
    return null;
  }, [wbsItems]);

  // ── Compute rows, calendar range, months ──

  const { rows, monthLabels, empty } = useMemo(() => {
    const activeStages = stages.filter((s) => !s.archived_at);
    const stageMap = new Map(activeStages.map((s) => [s.id, s]));

    // Group Activities by resolved stage — filter empty names
    const phaseActs = new Map<string, WbsItem[]>();
    for (const s of activeStages) phaseActs.set(s.id, []);

    for (const w of wbsItems) {
      if (w.level !== 2) continue;
      if (!w.name || w.name.trim() === '') continue;
      const sid = resolveStageId(w);
      if (sid && phaseActs.has(sid)) phaseActs.get(sid)!.push(w);
    }

    // Build Phase metadata — sort chronologically by start date
    const phases: { stage: DBStage; startStr: string | null; endStr: string | null; calStart: Date | null; calEnd: Date | null; totalWeeks: number; activities: WbsItem[] }[] = [];

    for (const stage of activeStages) {
      const activities = phaseActs.get(stage.id) || [];
      if (activities.length === 0) continue;

      const startStr = stageStart(stage, scheduleMode);
      const endStr = stageEnd(stage, scheduleMode);
      const calStart = startStr ? new Date(startStr) : null;
      const calEnd = endStr ? new Date(endStr) : null;

      let totalWeeks = 0;
      for (const a of activities) {
        totalWeeks += a.duration_weeks && a.duration_weeks > 0 ? a.duration_weeks : 0;
      }

      phases.push({ stage, startStr, endStr, calStart, calEnd, totalWeeks, activities });
    }

    // Sort phases chronologically by start date
    phases.sort((a, b) => {
      if (a.calStart && b.calStart) return a.calStart.getTime() - b.calStart.getTime();
      if (a.calStart) return -1;
      if (b.calStart) return 1;
      return 0;
    });

    // Calendar range — use plan dates for reference, expand if actual dates extend further
    let calMin: Date | null = null;
    let calMax: Date | null = null;
    for (const ph of phases) {
      if (ph.calStart && (!calMin || ph.calStart < calMin)) calMin = ph.calStart;
      if (ph.calEnd && (!calMax || ph.calEnd > calMax)) calMax = ph.calEnd;
      // In overlay mode, also consider actual dates
      if (scheduleMode === 'overlay') {
        const actualStart = stageStart(ph.stage, 'actual');
        const actualEnd = stageEnd(ph.stage, 'actual');
        if (actualStart) { const d = new Date(actualStart); if (!calMin || d < calMin) calMin = d; }
        if (actualEnd) { const d = new Date(actualEnd); if (!calMax || d > calMax) calMax = d; }
      }
    }

    if (!calMin || !calMax) {
      return { rows: [], monthLabels: [], empty: phases.length > 0 };
    }

    calMin = new Date(calMin.getFullYear(), calMin.getMonth(), 1);
    calMax = new Date(calMax.getFullYear(), calMax.getMonth() + 2, 0);

    const totalDays = Math.max(1, Math.round((calMax.getTime() - calMin.getTime()) / 86400000));
    const totalMonths = (calMax.getFullYear() - calMin.getFullYear()) * 12 + (calMax.getMonth() - calMin.getMonth()) + 1;
    const ganttPx = totalMonths * MONTH_W;
    const pxPerDay = ganttPx / totalDays;

    function dateToPx(d: Date): number {
      return Math.round((d.getTime() - calMin!.getTime()) / 86400000) * pxPerDay;
    }

    const labels: string[] = [];
    const c = new Date(calMin);
    while (c <= calMax) {
      labels.push(`${MONTHS_ID[c.getMonth()]} ${c.getFullYear()}`);
      c.setMonth(c.getMonth() + 1);
    }

    // Build flat rows
    const result: FlatRow[] = [];
    for (const ph of phases) {
      if (!ph.calStart || !ph.calEnd) continue;

      const phasePx = dateToPx(ph.calStart);
      const phaseW = Math.max(16, dateToPx(ph.calEnd) - phasePx);
      const phaseWeeks = weeksBetween(ph.calStart, ph.calEnd);
      const scaleWeeks = Math.max(ph.totalWeeks, phaseWeeks);
      const pxPerWeek = phaseW / scaleWeeks;

      // Compute overlay actual bar for Phase
      let actualLeft: number | undefined;
      let actualWidth: number | undefined;
      let isDelayed: boolean | undefined;
      if (scheduleMode === 'overlay') {
        const actStart = stageStart(ph.stage, 'actual');
        const actEnd = stageEnd(ph.stage, 'actual');
        if (actStart && actEnd) {
          actualLeft = dateToPx(new Date(actStart));
          actualWidth = Math.max(16, dateToPx(new Date(actEnd)) - actualLeft);
          isDelayed = new Date(actEnd) > ph.calEnd!;
        }
      }

      result.push({
        key: `p-${ph.stage.id}`, type: 'phase', item: null, stage: ph.stage,
        depth: 0, barLeft: phasePx, barWidth: phaseW, hasOverflow: ph.totalWeeks > phaseWeeks,
        actualLeft, actualWidth, isDelayed,
      });

      let cumWeeks = 0;
      for (const act of ph.activities) {
        const dw = act.duration_weeks && act.duration_weeks > 0 ? act.duration_weeks : 0;
        const actStart = phasePx + cumWeeks * pxPerWeek;
        const actW = Math.max(8, dw * pxPerWeek);
        const clamped = Math.max(4, Math.min(actStart + actW, phasePx + phaseW) - actStart);

        result.push({
          key: `a-${act.id}`, type: 'activity', item: act, stage: ph.stage,
          depth: 2, barLeft: actStart, barWidth: clamped, hasOverflow: false,
        });
        cumWeeks += dw;

        const tasks = wbsItems.filter((w) => w.parent_id === act.id && w.name?.trim());
        for (const t of tasks) {
          const td = t.duration_weeks && t.duration_weeks > 0 ? t.duration_weeks : 0;
          const tStart = phasePx + cumWeeks * pxPerWeek;
          const tW = Math.max(4, td * pxPerWeek);
          const tEnd = Math.min(tStart + tW, phasePx + phaseW);
          result.push({
            key: `t-${t.id}`, type: 'task', item: t, stage: ph.stage,
            depth: 3, barLeft: tStart, barWidth: Math.max(4, tEnd - tStart), hasOverflow: false,
          });
          cumWeeks += td;
        }
      }
    }

    return { rows: result, monthLabels: labels, empty: false };
  }, [wbsItems, stages, scheduleMode, resolveStageId]);

  // ── Sync month header horizontal scroll with body ──

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const mh = document.getElementById('pm-month-header');
    if (!body || !mh) return;
    const s = () => { mh.scrollLeft = body.scrollLeft; };
    body.addEventListener('scroll', s, { passive: true });
    return () => body.removeEventListener('scroll', s);
  }, []);

  // ── Schedule dialog ──

  const openDlg = useCallback((s: DBStage) => {
    setDs(s);
    setD1(s.planned_start_date || ''); setD2(s.planned_end_date || '');
    setD3(s.actual_start_date || ''); setD4(s.actual_end_date || '');
    setDlg(true);
  }, []);

  const saveDlg = useCallback(async () => {
    if (!ds) return;
    setSv(true);
    try {
      const { error } = await updateProjectStageMetadata({
        stageId: ds.id, title: ds.title,
        plannedStartDate: d1 || null, plannedEndDate: d2 || null,
        actualStartDate: d3 || null, actualEndDate: d4 || null,
      });
      if (error) throw error;
      toast({ title: 'Jadwal Phase disimpan' }); setDlg(false); setDs(null);
      if (onStagesRefresh) onStagesRefresh();
    } catch (e: any) { toast({ title: 'Gagal', description: e?.message, variant: 'destructive' }); }
    finally { setSv(false); }
  }, [ds, d1, d2, d3, d4, toast, onStagesRefresh]);

  // ── Empty states ──

  if (empty) {
    return (
      <div className="border rounded-lg bg-white dark:bg-slate-900 p-8 space-y-4">
        <div className="text-center">
          <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <h3 className="text-lg font-bold">Jadwal proyek belum diatur</h3>
          <p className="text-sm text-muted-foreground">Atur tanggal mulai dan selesai setiap Phase di tab Structure.</p>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="border rounded-lg bg-white dark:bg-slate-900 p-8 text-center">
        <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
        <h3 className="text-lg font-bold">Belum ada Activity</h3>
        <p className="text-sm text-muted-foreground">Tambahkan Activity melalui tab Structure.</p>
      </div>
    );
  }

  const ganttMinWidth = monthLabels.length * MONTH_W;

  // ── Render ──

  return (
    <div className="border rounded-lg bg-white dark:bg-slate-900 flex flex-col" style={{ height: 'calc(100vh - 260px)', minHeight: 500 }}>
      {/* Toggle + Month header */}
      <div className="flex border-b bg-slate-50 dark:bg-slate-800 shrink-0">
        <div className="py-2 px-3 border-r flex items-center gap-2 shrink-0 sticky left-0 z-20 bg-slate-50 dark:bg-slate-800" style={{ width: LEFT_W }}>
          <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Timeline</span>
          <div className="flex bg-slate-200 dark:bg-slate-700 rounded p-0.5">
            {(['plan', 'actual', 'overlay'] as ScheduleMode[]).map((m) => (
              <button key={m} onClick={() => setScheduleMode(m)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded capitalize ${scheduleMode === m ? 'bg-white dark:bg-slate-950 text-primary shadow-sm' : 'text-muted-foreground'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div id="pm-month-header" className="flex-1 overflow-hidden">
          <div className="flex" style={{ minWidth: ganttMinWidth }}>
            {monthLabels.map((m, i) => (
              <div key={i} className="shrink-0 text-center py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700" style={{ width: MONTH_W }}>{m}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Body — unified scroll container for row locking */}
      <div className="flex-1 overflow-auto" ref={bodyRef}>
        <div style={{ minWidth: LEFT_W + ganttMinWidth }}>
          {rows.map((row) => (
            <div key={row.key} className="flex border-b border-slate-100 dark:border-slate-800" style={{ minHeight: ROW_H }}>
              {/* Left column — sticky */}
              <div
                className={`sticky left-0 z-10 shrink-0 flex items-start border-r border-slate-200 dark:border-slate-700 px-2 py-1 ${row.type === 'phase' ? 'bg-slate-50 dark:bg-slate-800 font-bold' : row.depth === 2 ? 'pl-6 bg-white dark:bg-slate-900' : 'pl-10 bg-white dark:bg-slate-900'}`}
                style={{ width: LEFT_W }}>
                <div className="flex-1 min-w-0">
                  {row.type === 'phase' && row.stage && (
                    <div className="flex items-center justify-between w-full gap-1">
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold uppercase truncate block">{row.stage.title}</span>
                        {(stageStart(row.stage, scheduleMode)) && (
                          <span className="text-[9px] text-muted-foreground">
                            {fmtShort(stageStart(row.stage, scheduleMode))} — {fmtShort(stageEnd(row.stage, scheduleMode))}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {row.hasOverflow && (
                          <span className="text-[8px] text-amber-600 bg-amber-50 px-1 rounded font-bold" title="Durasi aktivitas melebihi durasi fase">!</span>
                        )}
                        {isOwner && onAddActivity && (
                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0" title="Tambah Aktivitas"
                            onClick={() => onAddActivity(row.stage!.id)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                        {isOwner && (
                          <Button size="sm" variant="outline" className="text-[8px] h-5 px-1.5"
                            onClick={() => openDlg(row.stage!)}>Jadwal</Button>
                        )}
                      </div>
                    </div>
                  )}

                  {(row.type === 'activity' || row.type === 'task') && row.item && (
                    <div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className={`text-[7px] py-0 h-4 shrink-0 ${row.type === 'activity' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
                          {row.type === 'activity' ? 'A' : 'T'}
                        </Badge>
                        <span className="text-[11px] font-medium truncate">{row.item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground">
                        <span className={row.item.status === 'completed' ? 'text-emerald-700' : isBlocked(row.item) ? 'text-red-700' : ''}>
                          {getExecutionStatusLabel(row.item.status)}
                        </span>
                        <span className="font-semibold">{row.item.progress_percent ?? 0}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right column — gantt bars */}
              <div className="flex-1 relative">
                {/* Month grid lines */}
                {monthLabels.map((_, i) => (
                  <div key={i} className="absolute top-0 h-full border-r border-slate-50 dark:border-slate-800 pointer-events-none" style={{ width: MONTH_W, left: i * MONTH_W }} />
                ))}

                {row.type === 'phase' && row.barWidth > 0 && (
                  <>
                    {/* Plan bar */}
                    <div className={`absolute top-1.5 h-5 rounded border flex items-center px-2 z-[5] ${scheduleMode === 'overlay' ? 'border-slate-300 border-dashed bg-slate-50/50' : row.hasOverflow ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-100'}`}
                      style={{ left: row.barLeft, width: Math.max(row.barWidth, 16) }}>
                      {scheduleMode !== 'overlay' && (
                        <span className={`text-[9px] font-bold uppercase truncate ${row.hasOverflow ? 'text-amber-600' : 'text-slate-400'}`}>
                          {row.stage?.title || '—'}
                        </span>
                      )}
                    </div>
                    {/* Actual bar (overlay mode) */}
                    {scheduleMode === 'overlay' && row.actualLeft != null && row.actualWidth != null && row.actualWidth > 0 && (
                      <div className={`absolute top-1.5 h-5 rounded border flex items-center px-2 z-[5] ${row.isDelayed ? 'border-red-400 bg-red-100' : 'border-emerald-400 bg-emerald-100'}`}
                        style={{ left: row.actualLeft, width: Math.max(row.actualWidth, 16) }}>
                        <span className={`text-[9px] font-bold uppercase truncate ${row.isDelayed ? 'text-red-600' : 'text-emerald-600'}`}>
                          {row.stage?.title || '—'}
                        </span>
                        {row.isDelayed && <span className="text-[7px] text-red-500 ml-1">delay</span>}
                      </div>
                    )}
                  </>
                )}

                {row.barWidth > 0 && row.type !== 'phase' && row.item && (
                  <div
                    className={`absolute z-[5] ${row.type === 'activity' ? 'top-2.5 h-4 rounded bg-emerald-500/70 border border-emerald-600 shadow-sm' : 'top-3 h-3 rounded bg-indigo-400/60 border border-indigo-500'}`}
                    style={{ left: row.barLeft, width: row.barWidth }}>
                    {row.item.progress_percent ? row.item.progress_percent > 0 && (
                      <div className="absolute inset-y-0 left-0 bg-white/40 rounded-l" style={{ width: `${Math.min(row.item.progress_percent, 100)}%` }} />
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Dialog */}
      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-sm">Jadwal — {ds?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4 text-xs">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Planning</Label>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-[10px]">Mulai</Label><Input type="date" value={d1} onChange={(e) => setD1(e.target.value)} className="h-8 text-xs" /></div>
                <div><Label className="text-[10px]">Selesai</Label><Input type="date" value={d2} onChange={(e) => setD2(e.target.value)} className="h-8 text-xs" /></div>
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Realisasi</Label>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-[10px]">Mulai</Label><Input type="date" value={d3} onChange={(e) => setD3(e.target.value)} className="h-8 text-xs" /></div>
                <div><Label className="text-[10px]">Selesai</Label><Input type="date" value={d4} onChange={(e) => setD4(e.target.value)} className="h-8 text-xs" /></div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setDlg(false)}>Tutup</Button>
            {isOwner && <Button size="sm" className="text-xs" onClick={saveDlg} disabled={sv}>{sv ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}Simpan</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
