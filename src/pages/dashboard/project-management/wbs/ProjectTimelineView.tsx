import { useMemo, useRef, useLayoutEffect, useState, useCallback } from 'react';
import { Calendar, Clock, AlertTriangle, Loader2, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { updateProjectStageMetadata } from '@/lib/project-management/stageRpc';
import {
  buildVisibleRows, computeStageSchedule,
  type StageScheduleInput, type WbsScheduleInput,
} from '@/lib/project-management/scheduleModel';

interface WbsItem {
  id: string; level: number; parent_id: string | null; stage_id: string | null;
  name: string; status: string;
  start_month?: number; duration_weeks?: number;
  planned_start_date?: string | null; planned_end_date?: string | null;
  blocked_reason?: string | null; owner_id?: string | null; progress_percent?: number;
}

interface DBStage {
  id: string; title: string; archived_at: string | null;
  planned_start_date?: string | null; planned_end_date?: string | null;
  actual_start_date?: string | null; actual_end_date?: string | null;
  status?: string; description?: string | null;
}

interface OrgMember { user_id: string; full_name: string; job_title: string | null; }

interface Props {
  wbsItems: WbsItem[];
  stages: DBStage[];
  orgMembers: OrgMember[];
  orgMemberLookup: Map<string, OrgMember>;
  isOwner: boolean;
  onScheduleSave?: (wbsId: string, plannedStart: string, plannedEnd: string) => void;
  onStagesRefresh?: () => void;
}

const MONTH_WIDTH = 80;
const ROW_BASE = 42;
const STAGE_H = 45;
const PHASE_H = 52;
const LW = 360;

function shortFmt(d: Date | null): string { if (!d) return '—'; const m=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()]; return `${d.getDate()} ${m} ${d.getFullYear()}`; }
function nm(id: string | null, lm: Map<string, OrgMember>): string | null { if (!id) return null; return lm.get(id)?.full_name || null; }
function getProgress(items: WbsItem[], stageId: string): number {
  const act = items.filter((w) => w.level === 2 && w.stage_id === stageId && w.status !== 'cancelled');
  if (act.length === 0) return 0;
  const sum = act.reduce((s, a) => s + (a.progress_percent ?? (a.status === 'completed' ? 100 : 0)), 0);
  return Math.round(sum / act.length);
}

function getStatusColor(status: string): string {
  if (status === 'completed') return 'bg-emerald-500 border-emerald-600';
  if (status === 'in_progress') return 'bg-blue-500 border-blue-600';
  if (status === 'blocked') return 'bg-red-500 border-red-600';
  return 'bg-slate-400 border-slate-500';
}

function getStatusLabel(s: string): string {
  if (s === 'not_started') return 'Belum Mulai';
  if (s === 'in_progress') return 'Berjalan';
  if (s === 'completed') return 'Selesai';
  if (s === 'blocked') return 'Terhambat';
  return s;
}

export default function ProjectTimelineView({ wbsItems, stages: dbStages, orgMemberLookup, isOwner, onScheduleSave, onStagesRefresh }: Props) {
  const { toast } = useToast();
  const today = useMemo(() => new Date(), []);
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const leftRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lpRef = useRef<HTMLDivElement>(null); const rpRef = useRef<HTMLDivElement>(null);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgStage, setDlgStage] = useState<DBStage | null>(null);
  const [dlgStart, setDlgStart] = useState(''); const [dlgEnd, setDlgEnd] = useState('');
  const [saving, setSaving] = useState(false);

  const activeStages = dbStages.filter((s) => !s.archived_at);
  const stageInputs: StageScheduleInput[] = useMemo(() =>
    activeStages.map((s) => ({ id: s.id, title: s.title, planned_start_date: s.planned_start_date || null, planned_end_date: s.planned_end_date || null, status: s.status || 'not_started' })), [activeStages]);

  const wbsInputs: WbsScheduleInput[] = useMemo(() =>
    wbsItems.filter((w) => w.level >= 2).map((w) => ({
      id: w.id, level: w.level, parentId: w.parent_id, stageId: w.stage_id || null,
      name: w.name, status: w.status || 'not_started',
      startMonth: w.start_month ?? null, durationWeeks: w.duration_weeks ?? null,
      plannedStartDate: w.planned_start_date || null, plannedEndDate: w.planned_end_date || null,
      actualStartDate: null, actualEndDate: null,
      blockedReason: w.blocked_reason || null, ownerId: w.owner_id || null,
    })), [wbsItems]);

  const visibleRows = useMemo(() => buildVisibleRows({ stages: stageInputs, wbsItems: wbsInputs, today }), [stageInputs, wbsInputs, today]);

  const hasAnyDates = activeStages.some((s) => s.planned_start_date && s.planned_end_date)
    || wbsInputs.some((w) => w.plannedStartDate);

  const range = useMemo(() => {
    if (!hasAnyDates) return null;
    let minD: Date | null = null; let maxD: Date | null = null;
    for (const s of activeStages) {
      if (s.planned_start_date) { const d = new Date(s.planned_start_date); if (!minD || d < minD) minD = d; }
      if (s.planned_end_date) { const d = new Date(s.planned_end_date); if (!maxD || d > maxD) maxD = d; }
    }
    if (!minD || !maxD) return null;
    minD = new Date(minD.getFullYear(), minD.getMonth(), 1);
    maxD = new Date(maxD.getFullYear(), maxD.getMonth() + 2, 0);
    const months: { y: number; m: number; label: string }[] = [];
    const cur = new Date(minD);
    while (cur <= maxD) {
      const ml = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][cur.getMonth()];
      months.push({ y: cur.getFullYear(), m: cur.getMonth(), label: `${ml} ${cur.getFullYear()}` });
      cur.setMonth(cur.getMonth() + 1);
    }
    return { minD, maxD, months, total: months.length };
  }, [hasAnyDates, activeStages]);

  const barL = (d: Date) => { if (!range?.minD) return 0; return ((d.getFullYear() - range.minD.getFullYear()) * 12 + (d.getMonth() - range.minD.getMonth())) * MONTH_WIDTH; };
  const barW = (s: Date, f: Date) => Math.max(4, ((f.getTime() - s.getTime()) / 86400000 / 30) * MONTH_WIDTH);

  useLayoutEffect(() => {
    const l = lpRef.current; const r = rpRef.current; if (!l || !r) return;
    const s = () => { r.scrollTop = l.scrollTop; }; l.addEventListener('scroll', s, { passive: true }); return () => l.removeEventListener('scroll', s);
  }, []);
  useLayoutEffect(() => {
    const nh: Record<string, number> = {}; let c = false;
    Object.entries(leftRowRefs.current).forEach(([k, el]) => { if (el) { const h = el.offsetHeight; if (h && rowHeights[k] !== h) { nh[k] = h; c = true; } } });
    if (c) setRowHeights((p) => ({ ...p, ...nh }));
  });

  const openStageDlg = useCallback((s: DBStage) => {
    setDlgStage(s);
    setDlgStart(s.planned_start_date || ''); setDlgEnd(s.planned_end_date || '');
    setDlgOpen(true);
  }, []);

  const saveStageDlg = useCallback(async () => {
    if (!dlgStage || !dlgStart || !dlgEnd) { toast({ title: 'Tanggal wajib diisi', variant: 'destructive' }); return; }
    if (dlgEnd < dlgStart) { toast({ title: 'Tanggal selesai tidak boleh sebelum mulai', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const { error } = await updateProjectStageMetadata({ stageId: dlgStage.id, title: dlgStage.title, plannedStartDate: dlgStart, plannedEndDate: dlgEnd });
      if (error) throw error;
      toast({ title: 'Jadwal Phase disimpan' }); setDlgOpen(false); setDlgStage(null);
      if (onStagesRefresh) onStagesRefresh();
    } catch (e: any) { toast({ title: 'Gagal', description: e?.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  }, [dlgStage, dlgStart, dlgEnd, toast, onStagesRefresh]);

  const stageActivities = useCallback((stageId: string) => wbsItems.filter((w) => w.level === 2 && w.stage_id === stageId), [wbsItems]);

  // Empty
  if (!hasAnyDates && activeStages.length > 0) {
    return (
      <div className="border rounded-lg bg-white dark:bg-slate-900 p-8 space-y-6">
        <div className="text-center"><Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><h3 className="text-lg font-bold">Jadwal proyek belum diatur</h3><p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Atur tanggal mulai dan selesai setiap Phase agar Activity dapat ditampilkan pada Gantt.</p></div>
        <div className="space-y-2 max-w-lg mx-auto">
          {activeStages.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
              <span className="text-sm font-medium">{s.title}</span>
              {isOwner && <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => openStageDlg(s)}>Atur Jadwal</Button>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white dark:bg-slate-900 flex flex-col" style={{ height: 'calc(100vh - 260px)', minHeight: 400 }}>
      {/* Phase Layer — between header and body */}
      {range && (
        <div className="flex border-b shrink-0">
          <div className="py-1.5 px-3 text-[10px] font-bold uppercase text-slate-400 border-r bg-slate-50/50 flex items-center" style={{ width: LW }}>Phase Timeline</div>
          <div className="flex-1 overflow-x-auto bg-slate-50/50">
            <div style={{ minWidth: range.total * MONTH_WIDTH }}>
              {activeStages.map((phase) => {
                const p = getProgress(wbsItems, phase.id);
                const sd = phase.planned_start_date ? new Date(phase.planned_start_date) : null;
                const ed = phase.planned_end_date ? new Date(phase.planned_end_date) : null;
                if (!sd || !ed) return null;
                const color = getStatusColor(phase.status || 'not_started');
                return (
                  <div key={`phase-${phase.id}`} className="h-12 relative cursor-pointer hover:brightness-105 transition-all border-b border-slate-100"
                    style={{ height: PHASE_H }}
                    onClick={() => openStageDlg(phase)}
                    title={`${phase.title}: ${shortFmt(sd)} → ${shortFmt(ed)}`}>
                    <div className={`absolute top-1.5 h-9 rounded-md border shadow-sm ${color} flex items-center px-3 gap-2 min-w-0`}
                      style={{ left: barL(sd), width: Math.max(barW(sd, ed), 120) }}>
                      {/* Progress fill */}
                      {p > 0 && <div className="absolute inset-y-0 left-0 bg-white/30 rounded-l-md" style={{ width: `${p}%` }} />}
                      <span className="text-xs font-bold text-white truncate relative z-10 drop-shadow-sm">{phase.title}</span>
                      <span className="text-[10px] text-white/90 shrink-0 relative z-10">{p}%</span>
                      <span className="text-[9px] text-white/70 hidden sm:inline truncate relative z-10">
                        {shortFmt(sd)} → {shortFmt(ed)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Month header */}
      <div className="flex border-b bg-slate-50 shrink-0">
        <div className="py-2 px-4 text-[10px] font-bold uppercase text-slate-500 border-r" style={{ width: LW }}>Timeline</div>
        <div className="flex-1 overflow-x-auto">
          {range && <div className="flex" style={{ minWidth: range.total * MONTH_WIDTH }}>{range.months.map((m, i) => (<div key={i} className="shrink-0 text-center py-2 text-[10px] font-bold text-slate-500 border-r" style={{ width: MONTH_WIDTH }}>{m.label}</div>))}</div>}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <div className="overflow-y-auto overflow-x-hidden border-r shrink-0" ref={lpRef} style={{ width: LW }}>
          {visibleRows.map((row) => (
            <div key={row.key} ref={(el) => (leftRowRefs.current[row.key] = el)}
              className={`flex items-center gap-1 px-2 py-1.5 border-b ${row.type === 'stage-header' ? 'bg-slate-100 font-bold' : row.type === 'empty-stage' ? 'pl-6 text-[11px] text-muted-foreground italic' : row.depth === 2 ? 'pl-4' : row.depth === 3 ? 'pl-8' : 'pl-14'} ${row.isOverdue ? 'border-l-2 border-l-red-500' : ''}`}
              style={{ minHeight: row.type === 'stage-header' ? STAGE_H : ROW_BASE }}>
              <div className="flex-1 min-w-0">
                {row.type === 'stage-header' && (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold uppercase truncate">{row.title}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[9px] text-muted-foreground">{getProgress(wbsItems, row.stageId || '')}%</span>
                      {isOwner && <Button size="sm" variant="ghost" className="h-5 text-[8px] px-1" onClick={() => { const s = activeStages.find(st => st.id === row.stageId); if (s) openStageDlg(s); }}><ChevronRight className="h-3 w-3" /></Button>}
                    </div>
                  </div>
                )}
                {(row.type === 'activity' || row.type === 'task') && (
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`text-[8px] py-0 h-4 shrink-0 ${row.type === 'activity' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>{row.type === 'activity' ? 'Activity' : 'Task'}</Badge>
                      <span className="text-xs font-medium truncate">{row.title}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground">
                      {row.durationWeeks && <span>{row.durationWeeks} minggu</span>}
                      {row.ownerId && <span className="truncate max-w-[80px]">{nm(row.ownerId, orgMemberLookup)}</span>}
                      <span className={row.status === 'completed' ? 'text-emerald-700' : row.status === 'blocked' ? 'text-red-700' : ''}>{getStatusLabel(row.status)}</span>
                      <span className="font-semibold">{row.progress}%</span>
                      {row.isBlocked && <AlertTriangle className="h-3 w-3 text-red-500" />}
                    </div>
                  </div>
                )}
                {row.type === 'subtask' && (
                  <div><div className="flex items-center gap-1.5"><Badge variant="outline" className="text-[8px] py-0 h-4 bg-slate-100 text-slate-600 shrink-0">Subtask</Badge><span className="text-[10px] truncate">{row.title}</span></div></div>
                )}
                {row.type === 'empty-stage' && <span className="text-[11px] text-muted-foreground italic">{row.title}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Gantt */}
        <div className="flex-1 overflow-y-auto overflow-x-auto" ref={rpRef}>
          {range ? (
            <div style={{ minWidth: range.total * MONTH_WIDTH }}>
              {visibleRows.map((row) => {
                const h = rowHeights[row.key] || (row.type === 'stage-header' ? STAGE_H : ROW_BASE);
                return (
                  <div key={`g-${row.key}`} className="border-b relative flex items-center" style={{ height: h }}>
                    {range.months.map((_, i) => (<div key={i} className="shrink-0 h-full border-r border-slate-50" style={{ width: MONTH_WIDTH }} />))}
                    {row.type === 'stage-header' && row.schedule.derivedStartDate && row.schedule.derivedFinishDate && (
                      <div className="absolute top-2 h-3.5 rounded border border-blue-300 bg-blue-100/50" style={{ left: barL(row.schedule.derivedStartDate), width: barW(row.schedule.derivedStartDate, row.schedule.derivedFinishDate), minWidth: 40 }} />
                    )}
                    {row.type === 'activity' && row.schedule.derivedStartDate && row.schedule.derivedFinishDate && (
                      <div className={`absolute top-2 h-4 rounded border shadow-sm bg-emerald-500/70 border-emerald-600 ${row.isOverdue ? 'ring-1 ring-red-400' : ''}`}
                        style={{ left: barL(row.schedule.derivedStartDate), width: barW(row.schedule.derivedStartDate, row.schedule.derivedFinishDate) }}>
                        {row.progress > 0 && <div className="absolute inset-y-0 left-0 bg-white/40 rounded-l" style={{ width: `${row.progress}%` }} />}
                      </div>
                    )}
                    {row.type === 'task' && row.schedule.derivedStartDate && row.schedule.derivedFinishDate && (
                      <div className={`absolute top-2 h-3 rounded border shadow-sm bg-indigo-400/60 border-indigo-500 ${row.isOverdue ? 'ring-1 ring-red-400' : ''}`}
                        style={{ left: barL(row.schedule.derivedStartDate), width: barW(row.schedule.derivedStartDate, row.schedule.derivedFinishDate) }} />
                    )}
                    {row.type === 'subtask' && <div className="absolute top-3 left-2 h-2.5 bg-slate-200/40 rounded border border-dashed" style={{ width: 30 }} />}
                  </div>
                );
              })}
            </div>
          ) : <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Atur jadwal Phase untuk menampilkan Gantt.</div>}
        </div>
      </div>

      {/* Stage Detail Dialog */}
      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-sm">{dlgStage?.title || 'Phase Detail'}</DialogTitle></DialogHeader>
          <div className="space-y-4 text-xs">
            {dlgStage && (
              <div className="space-y-2">
                {dlgStage.description && <p className="text-muted-foreground">{dlgStage.description}</p>}
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-[10px] text-muted-foreground">Status</Label><div className="font-medium">{getStatusLabel(dlgStage.status || 'not_started')}</div></div>
                  <div><Label className="text-[10px] text-muted-foreground">Progress</Label><div className="font-medium">{getProgress(wbsItems, dlgStage.id)}%</div></div>
                </div>
                {isOwner && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs font-bold">Periode</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-[10px]">Tanggal Mulai</Label><Input type="date" value={dlgStart} onChange={(e) => setDlgStart(e.target.value)} className="h-8 text-xs" /></div>
                      <div><Label className="text-[10px]">Tanggal Selesai</Label><Input type="date" value={dlgEnd} onChange={(e) => setDlgEnd(e.target.value)} className="h-8 text-xs" /></div>
                    </div>
                  </div>
                )}
                <div className="space-y-1 pt-2 border-t">
                  <Label className="text-[10px] text-muted-foreground uppercase">Activity ({stageActivities(dlgStage.id).length})</Label>
                  {stageActivities(dlgStage.id).map((a) => (
                    <div key={a.id} className="flex items-center justify-between py-1 border-b text-[11px]">
                      <span className="truncate">{a.name}</span>
                      <span className="text-muted-foreground shrink-0">{a.duration_weeks ?? 1} mgg</span>
                    </div>
                  ))}
                  {stageActivities(dlgStage.id).length === 0 && <span className="text-muted-foreground italic">Belum ada Activity</span>}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setDlgOpen(false)}>Tutup</Button>
            {isOwner && <Button size="sm" className="text-xs" onClick={saveStageDlg} disabled={saving}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Simpan</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
