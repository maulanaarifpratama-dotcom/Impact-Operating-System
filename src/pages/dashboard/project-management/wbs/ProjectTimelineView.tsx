import { useMemo, useRef, useLayoutEffect, useState, useCallback } from 'react';
import { Calendar, Loader2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { updateProjectStageMetadata } from '@/lib/project-management/stageRpc';

// ── Types ──

interface WbsItem {
  id: string; level: number; parent_id: string | null; stage_id: string | null;
  name: string; status: string; duration_weeks?: number; progress_percent?: number;
}

interface DBStage {
  id: string; title: string; archived_at: string | null;
  planned_start_date?: string | null; planned_end_date?: string | null;
  actual_start_date?: string | null; actual_end_date?: string | null;
}

type ScheduleMode = 'plan' | 'actual';

interface Props {
  wbsItems: WbsItem[];
  stages: DBStage[];
  isOwner: boolean;
  scheduleMode: ScheduleMode;
  onScheduleModeChange?: (mode: ScheduleMode) => void;
  onStagesRefresh?: () => void;
  onDurationChange?: (wbsId: string, weeks: number) => void;
  onAddActivity?: (stageId: string) => void;
  onOpenActivity?: (activityId: string) => void;
}

// ── Constants ──

const MW = 76;
const LH = 38;
const LW = 360;

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

// ── Helpers ──

function sl(s: string) {
  const m: Record<string, string> = { not_started: 'Belum Mulai', in_progress: 'Berjalan', completed: 'Selesai', blocked: 'Terhambat' };
  return m[s] || s;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtShort(d: string | null | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function stageStartDate(s: DBStage, mode: ScheduleMode): string | null {
  return mode === 'plan' ? s.planned_start_date ?? null : s.actual_start_date ?? null;
}
function stageEndDate(s: DBStage, mode: ScheduleMode): string | null {
  return mode === 'plan' ? s.planned_end_date ?? null : s.actual_end_date ?? null;
}
function hasDates(s: DBStage, mode: ScheduleMode): boolean {
  return !!(stageStartDate(s, mode) && stageEndDate(s, mode));
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
}

interface PhaseMeta {
  stage: DBStage;
  startDate: string | null;
  endDate: string | null;
  calStart: Date | null;
  calEnd: Date | null;
  totalActivityWeeks: number;
  activities: WbsItem[];
}

// ── Component ──

export default function ProjectTimelineView({
  wbsItems, stages, isOwner, scheduleMode,
  onScheduleModeChange, onStagesRefresh, onDurationChange,
  onAddActivity, onOpenActivity,
}: Props) {
  const { toast } = useToast();
  const [rh, setRh] = useState<Record<string, number>>({});
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const lp = useRef<HTMLDivElement>(null);
  const rp = useRef<HTMLDivElement>(null);

  // Schedule dialog
  const [dlg, setDlg] = useState(false);
  const [ds, setDs] = useState<DBStage | null>(null);
  const [d1, setD1] = useState(''); const [d2, setD2] = useState('');
  const [d3, setD3] = useState(''); const [d4, setD4] = useState('');
  const [sv, setSv] = useState(false);

  // ── Compute rows, calendar range, months ──

  const { rows, monthLabels, empty } = useMemo(() => {
    const activeStages = stages.filter((s) => !s.archived_at);
    const stageMap = new Map(activeStages.map((s) => [s.id, s]));

    // Group Activities by stage
    const phaseActs = new Map<string, WbsItem[]>();
    for (const s of activeStages) phaseActs.set(s.id, []);
    for (const w of wbsItems) {
      if (w.level !== 2) continue;
      const sid = w.stage_id && stageMap.has(w.stage_id) ? w.stage_id : null;
      if (sid) phaseActs.get(sid)!.push(w);
    }

    // Build Phase metadata
    const phases: PhaseMeta[] = [];
    let calMin: Date | null = null;
    let calMax: Date | null = null;

    for (const stage of activeStages) {
      const activities = phaseActs.get(stage.id) || [];
      if (activities.length === 0) continue;

      const startStr = stageStartDate(stage, scheduleMode);
      const endStr = stageEndDate(stage, scheduleMode);
      const calStart = startStr ? new Date(startStr) : null;
      const calEnd = endStr ? new Date(endStr) : null;

      let totalWeeks = 0;
      for (const a of activities) {
        totalWeeks += a.duration_weeks && a.duration_weeks > 0 ? a.duration_weeks : 0;
      }

      phases.push({ stage, startDate: startStr, endDate: endStr, calStart, calEnd, totalActivityWeeks: totalWeeks, activities });

      if (calStart && (!calMin || calStart < calMin)) calMin = calStart;
      if (calEnd && (!calMax || calEnd > calMax)) calMax = calEnd;
    }

    // If no phases with dates, show empty
    if (!calMin || !calMax) {
      const schedPhases = activeStages.filter((s) => phaseActs.get(s.id)?.length);
      return { rows: [], monthLabels: [], empty: schedPhases.length > 0 };
    }

    // Extend by one month on each side for visual padding
    calMin = new Date(calMin.getFullYear(), calMin.getMonth(), 1);
    calMax = new Date(calMax.getFullYear(), calMax.getMonth() + 2, 0);

    const totalDays = Math.max(1, Math.round((calMax.getTime() - calMin.getTime()) / 86400000));
    const totalMonths = (calMax.getFullYear() - calMin.getFullYear()) * 12 + (calMax.getMonth() - calMin.getMonth()) + 1;
    const ganttPx = totalMonths * MW;
    const pxPerDay = ganttPx / totalDays;

    function dateToPx(d: Date): number {
      const offset = Math.round((d.getTime() - calMin!.getTime()) / 86400000);
      return offset * pxPerDay;
    }

    // Generate month labels
    const labels: string[] = [];
    const c = new Date(calMin);
    while (c <= calMax) {
      labels.push(`${MONTHS[c.getMonth()]} ${c.getFullYear()}`);
      c.setMonth(c.getMonth() + 1);
    }

    // Build rows
    const result: FlatRow[] = [];

    for (const ph of phases) {
      if (!ph.calStart || !ph.calEnd) continue;

      const phasePxStart = dateToPx(ph.calStart);
      const phasePxEnd = dateToPx(ph.calEnd);
      const phasePxWidth = Math.max(16, phasePxEnd - phasePxStart);
      const phaseWeeks = weeksBetween(ph.calStart, ph.calEnd);
      const scaleWeeks = Math.max(ph.totalActivityWeeks, phaseWeeks);
      const pxPerWeek = phasePxWidth / scaleWeeks;

      result.push({
        key: `p-${ph.stage.id}`, type: 'phase', item: null, stage: ph.stage,
        depth: 0, barLeft: phasePxStart, barWidth: phasePxWidth, hasOverflow: ph.totalActivityWeeks > phaseWeeks,
      });

      let cumWeeks = 0;
      for (const act of ph.activities) {
        const dw = act.duration_weeks && act.duration_weeks > 0 ? act.duration_weeks : 0;
        const actPxStart = phasePxStart + cumWeeks * pxPerWeek;
        const actPxWidth = Math.max(8, dw * pxPerWeek);
        // Clamp to phase boundary
        const clampedEnd = Math.min(actPxStart + actPxWidth, phasePxEnd);
        const clampedWidth = Math.max(4, clampedEnd - actPxStart);

        result.push({
          key: `a-${act.id}`, type: 'activity', item: act, stage: ph.stage,
          depth: 2, barLeft: actPxStart, barWidth: clampedWidth, hasOverflow: false,
        });
        cumWeeks += dw;

        // Tasks under this activity
        const tasks = wbsItems.filter((w) => w.parent_id === act.id);
        for (const t of tasks) {
          const tDw = t.duration_weeks && t.duration_weeks > 0 ? t.duration_weeks : 0;
          const tStart = phasePxStart + cumWeeks * pxPerWeek;
          const tWidth = Math.max(4, tDw * pxPerWeek);
          const tEnd = Math.min(tStart + tWidth, phasePxEnd);
          result.push({
            key: `t-${t.id}`, type: 'task', item: t, stage: ph.stage,
            depth: 3, barLeft: tStart, barWidth: Math.max(4, tEnd - tStart), hasOverflow: false,
          });
          cumWeeks += tDw;
        }
      }
    }

    return { rows: result, monthLabels: labels, empty: false };
  }, [wbsItems, stages, scheduleMode]);

  // ── Scroll sync ──

  useLayoutEffect(() => {
    const l = lp.current; const r = rp.current; if (!l || !r) return;
    const s = () => { r.scrollTop = l.scrollTop; };
    l.addEventListener('scroll', s, { passive: true });
    return () => l.removeEventListener('scroll', s);
  }, []);
  useLayoutEffect(() => {
    const r = rp.current;
    const mh = document.getElementById('pm-month-header');
    if (!r || !mh) return;
    const s = () => { mh.scrollLeft = r.scrollLeft; };
    r.addEventListener('scroll', s, { passive: true });
    return () => r.removeEventListener('scroll', s);
  }, []);
  useLayoutEffect(() => {
    const nh: Record<string, number> = {}; let ch = false;
    Object.entries(refs.current).forEach(([k, e]) => {
      if (e) { const h = e.offsetHeight; if (h && rh[k] !== h) { nh[k] = h; ch = true; } }
    });
    if (ch) setRh((p) => ({ ...p, ...nh }));
  });

  // ── Schedule dialog handlers ──

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

  // ── Empty state ──

  const activeStages = stages.filter((s) => !s.archived_at);
  const stagesWithActivities = activeStages.filter((s) =>
    wbsItems.some((w) => w.level === 2 && w.stage_id === s.id)
  );

  if (empty) {
    return (
      <div className="border rounded-lg bg-white dark:bg-slate-900 p-8 space-y-4">
        <div className="text-center">
          <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <h3 className="text-lg font-bold">Jadwal proyek belum diatur</h3>
          <p className="text-sm text-muted-foreground">Atur tanggal mulai dan selesai setiap Phase.</p>
        </div>
        {stagesWithActivities.map((s) => (
          <div key={s.id} className="flex items-center justify-between p-3 border rounded bg-slate-50 max-w-lg mx-auto">
            <span className="text-sm font-medium">{s.title}</span>
            {isOwner && <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => openDlg(s)}>Atur Jadwal</Button>}
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="border rounded-lg bg-white dark:bg-slate-900 p-8 text-center">
        <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
        <h3 className="text-lg font-bold">Belum ada Activity</h3>
        <p className="text-sm text-muted-foreground">Tambahkan Activity pada Phase melalui tombol + di header Phase.</p>
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="border rounded-lg bg-white dark:bg-slate-900 flex flex-col" style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>
      {/* Controls */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border-b shrink-0">
        <span className="text-[10px] font-bold uppercase text-slate-500">Schedule</span>
        <div className="flex bg-slate-200 dark:bg-slate-700 rounded p-0.5">
          {(['plan', 'actual'] as ScheduleMode[]).map((m) => (
            <button key={m} onClick={() => onScheduleModeChange?.(m)}
              className={`px-2.5 py-0.5 text-[10px] font-bold rounded ${scheduleMode === m ? 'bg-white dark:bg-slate-950 text-primary shadow-sm' : 'text-muted-foreground'}`}>
              {m === 'plan' ? 'Plan' : 'Actual'}
            </button>
          ))}
        </div>
      </div>

      {/* Month header */}
      <div className="flex border-b bg-slate-50 shrink-0">
        <div className="py-2 px-3 text-[10px] font-bold uppercase text-slate-500 border-r flex items-center shrink-0" style={{ width: LW }}>Work Plan</div>
        <div id="pm-month-header" className="flex-1 overflow-hidden">
          <div className="flex" style={{ minWidth: monthLabels.length * MW }}>
            {monthLabels.map((m, i) => (
              <div key={i} className="shrink-0 text-center py-2 text-[10px] font-bold text-slate-500 border-r" style={{ width: MW }}>{m}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Work Plan hierarchy */}
        <div className="overflow-y-auto overflow-x-hidden border-r shrink-0" ref={lp} style={{ width: LW }}>
          {rows.map((row) => {
            const dw = row.item?.duration_weeks;
            return (
              <div key={row.key} ref={(el) => { refs.current[row.key] = el; }}
                className={`flex items-center gap-1 px-2 py-1 border-b ${row.type === 'phase' ? 'bg-slate-50 font-bold' : row.depth === 2 ? 'pl-6' : 'pl-10'}`}
                style={{ minHeight: LH }}>
                <div className="flex-1 min-w-0">
                  {/* Phase row */}
                  {row.type === 'phase' && row.stage && (
                    <div className="flex items-center justify-between w-full gap-1">
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold uppercase truncate block">{row.stage.title}</span>
                        {(stageStartDate(row.stage, scheduleMode)) && (
                          <span className="text-[9px] text-muted-foreground">
                            {fmtShort(stageStartDate(row.stage, scheduleMode))} — {fmtShort(stageEndDate(row.stage, scheduleMode))}
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

                  {/* Activity / Task row */}
                  {(row.type === 'activity' || row.type === 'task') && row.item && (
                    <div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className={`text-[7px] py-0 h-4 shrink-0 ${row.type === 'activity' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
                          {row.type === 'activity' ? 'A' : 'T'}
                        </Badge>
                        <button
                          className="text-[11px] font-medium truncate text-left hover:text-primary transition-colors"
                          onClick={() => onOpenActivity?.(row.item!.id)}
                          title="Buka Rincian">
                          {row.item.name}
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground">
                        {isOwner ? (
                          <span className="flex items-center gap-0.5">
                            <Input type="number" min={0} max={52} value={dw ?? ''} placeholder="0"
                              onChange={(e) => {
                                const v = parseInt(e.target.value);
                                if (!isNaN(v) && v >= 0 && onDurationChange) onDurationChange(row.item!.id, v);
                              }}
                              className="w-12 h-5 text-[9px] px-1 text-center" />
                            <span>Minggu</span>
                          </span>
                        ) : (
                          <span>{dw && dw > 0 ? `${dw} Minggu` : '—'}</span>
                        )}
                        <span className={row.item.status === 'completed' ? 'text-emerald-700' : row.item.status === 'blocked' ? 'text-red-700' : ''}>
                          {sl(row.item.status)}
                        </span>
                        <span className="font-semibold">{row.item.progress_percent ?? 0}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Gantt */}
        <div className="flex-1 overflow-y-auto overflow-x-auto" ref={rp}>
          <div style={{ minWidth: monthLabels.length * MW }}>
            {rows.map((row) => {
              const h = rh[row.key] || LH;
              return (
                <div key={`g-${row.key}`} className="border-b relative flex items-center" style={{ height: h }}>
                  {monthLabels.map((_, i) => (
                    <div key={i} className="shrink-0 h-full border-r border-slate-50" style={{ width: MW }} />
                  ))}

                  {/* Phase bar */}
                  {row.type === 'phase' && row.barWidth > 0 && (
                    <div className={`absolute top-1.5 h-5 rounded border flex items-center px-2 ${row.hasOverflow ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30' : 'border-slate-200 bg-slate-100 dark:bg-slate-800'}`}
                      style={{ left: row.barLeft, width: Math.max(row.barWidth, 16) }}>
                      <span className={`text-[9px] font-bold uppercase truncate ${row.hasOverflow ? 'text-amber-600' : 'text-slate-400 dark:text-slate-500'}`}>
                        {row.stage?.title || '—'}
                      </span>
                    </div>
                  )}

                  {/* Activity / Task bar */}
                  {row.barWidth > 0 && row.type !== 'phase' && row.item && (
                    <div
                      className={`absolute ${row.type === 'activity' ? 'top-2.5 h-4 rounded bg-emerald-500/70 border border-emerald-600 shadow-sm' : 'top-3 h-3 rounded bg-indigo-400/60 border border-indigo-500'}`}
                      style={{ left: row.barLeft, width: row.barWidth }}>
                      {row.item.progress_percent ? row.item.progress_percent > 0 && (
                        <div className="absolute inset-y-0 left-0 bg-white/40 rounded-l" style={{ width: `${Math.min(row.item.progress_percent, 100)}%` }} />
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
