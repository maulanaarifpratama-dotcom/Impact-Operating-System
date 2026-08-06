import { useMemo, useRef, useLayoutEffect, useState, useCallback } from 'react';
import { Calendar, AlertTriangle, Loader2, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { updateProjectStageMetadata } from '@/lib/project-management/stageRpc';

interface WbsItem {
  id: string; level: number; parent_id: string | null; stage_id: string | null;
  name: string; status: string;
  start_month?: number; duration_weeks?: number;
  progress_percent?: number;
  blocked_reason?: string | null; owner_id?: string | null;
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
  orgMemberLookup: Map<string, OrgMember>;
  isOwner: boolean;
  onStagesRefresh?: () => void;
  onDurationChange?: (wbsId: string, weeks: number) => void;
}

const MONTH_WIDTH = 80;
const ROW_BASE = 42;
const STAGE_H = 42;
const ROADMAP_H = 52;
const LW = 360;

function fmt(d: Date | null): string { if (!d) return '—'; const m=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()]; return `${d.getDate()} ${m} ${d.getFullYear()}`; }
function nm(id: string | null, lm: Map<string, OrgMember>): string | null { if (!id) return null; return lm.get(id)?.full_name || null; }

function getPhaseProgress(items: WbsItem[], stageId: string): number {
  const act = items.filter((w) => w.level === 2 && w.stage_id === stageId && w.status !== 'cancelled');
  if (act.length === 0) return 0;
  return Math.round(act.reduce((s, a) => s + Math.min(100, Math.max(0, a.progress_percent ?? (a.status === 'completed' ? 100 : 0))), 0) / act.length);
}

function getStatusColor(status: string): string {
  if (status === 'completed') return 'bg-emerald-500';
  if (status === 'in_progress') return 'bg-blue-500';
  if (status === 'blocked') return 'bg-red-500';
  return 'bg-slate-400';
}

function getStLabel(s: string): string {
  if (s === 'not_started') return 'Belum Mulai';
  if (s === 'in_progress') return 'Berjalan';
  if (s === 'completed') return 'Selesai';
  if (s === 'blocked') return 'Terhambat';
  return s;
}

export default function ProjectTimelineView({ wbsItems, stages: dbStages, orgMemberLookup, isOwner, onStagesRefresh, onDurationChange }: Props) {
  const { toast } = useToast();
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const leftRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lpRef = useRef<HTMLDivElement>(null); const rpRef = useRef<HTMLDivElement>(null);
  const roadRef = useRef<HTMLDivElement>(null);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgStage, setDlgStage] = useState<DBStage | null>(null);
  const [dlgStart, setDlgStart] = useState(''); const [dlgEnd, setDlgEnd] = useState('');
  const [saving, setSaving] = useState(false);

  const activeStages = dbStages.filter((s) => !s.archived_at);
  const scheduledPhases = activeStages.filter((s) => s.planned_start_date && s.planned_end_date);
  const unscheduledPhases = activeStages.filter((s) => !s.planned_start_date || !s.planned_end_date);

  const range = useMemo(() => {
    if (scheduledPhases.length === 0) return null;
    let minD: Date | null = null; let maxD: Date | null = null;
    for (const s of scheduledPhases) {
      const sd = new Date(s.planned_start_date!); const ed = new Date(s.planned_end_date!);
      if (!minD || sd < minD) minD = sd;
      if (!maxD || ed > maxD) maxD = ed;
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
  }, [scheduledPhases]);

  const barL = (d: Date) => { if (!range?.minD) return 0; return ((d.getFullYear() - range.minD.getFullYear()) * 12 + (d.getMonth() - range.minD.getMonth())) * MONTH_WIDTH; };
  const barW = (s: Date, f: Date) => Math.max(8, ((f.getTime() - s.getTime()) / 86400000 / 30) * MONTH_WIDTH);

  useLayoutEffect(() => {
    const r = roadRef.current; const b = rpRef.current; if (!r || !b) return;
    const syncX = () => { b.scrollLeft = r.scrollLeft; };
    r.addEventListener('scroll', syncX, { passive: true });
    return () => r.removeEventListener('scroll', syncX);
  }, []);
  useLayoutEffect(() => {
    const l = lpRef.current; const r = rpRef.current; if (!l || !r) return;
    const syncY = () => { r.scrollTop = l.scrollTop; };
    l.addEventListener('scroll', syncY, { passive: true });
    return () => l.removeEventListener('scroll', syncY);
  }, []);
  useLayoutEffect(() => {
    const nh: Record<string, number> = {}; let c = false;
    Object.entries(leftRowRefs.current).forEach(([k, el]) => { if (el) { const h = el.offsetHeight; if (h && rowHeights[k] !== h) { nh[k] = h; c = true; } } });
    if (c) setRowHeights((p) => ({ ...p, ...nh }));
  });

  const openStageDlg = useCallback((s: DBStage) => {
    setDlgStage(s); setDlgStart(s.planned_start_date || ''); setDlgEnd(s.planned_end_date || '');
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

  const phaseActivities = useCallback((sid: string) => wbsItems.filter((w) => w.level === 2 && w.stage_id === sid), [wbsItems]);

  const timelineRows = useMemo(() => {
    const rows: { key: string; stageId: string | null; type: string; item: WbsItem | null; stage: DBStage | null }[] = [];
    for (const s of activeStages) {
      rows.push({ key: `sh-${s.id}`, stageId: s.id, type: 'stage-header', item: null, stage: s });
      const acts = wbsItems.filter((w) => w.level === 2 && w.stage_id === s.id);
      for (const a of acts) {
        rows.push({ key: `a-${a.id}`, stageId: s.id, type: 'activity', item: a, stage: s });
        const tasks = wbsItems.filter((w) => w.parent_id === a.id);
        for (const t of tasks) rows.push({ key: `t-${t.id}`, stageId: s.id, type: 'task', item: t, stage: s });
      }
    }
    const unassigned = wbsItems.filter((w) => w.level === 2 && !w.stage_id);
    if (unassigned.length > 0) {
      rows.push({ key: 'sh-unassigned', stageId: null, type: 'stage-header', item: null, stage: null });
      for (const a of unassigned) { rows.push({ key: `a-${a.id}`, stageId: null, type: 'activity', item: a, stage: null }); }
    }
    return rows;
  }, [activeStages, wbsItems]);

  if (scheduledPhases.length === 0 && activeStages.length > 0) {
    return (
      <div className="border rounded-lg bg-white dark:bg-slate-900 p-8 space-y-6">
        <div className="text-center"><Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><h3 className="text-lg font-bold">Jadwal proyek belum diatur</h3><p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Atur tanggal mulai dan selesai setiap Phase.</p></div>
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
      {/* 1. Phase Roadmap Band */}
      {range && (
        <div className="flex border-b shrink-0 bg-slate-50/30">
          <div className="py-2 px-4 text-[10px] font-bold uppercase text-slate-500 border-r flex items-center shrink-0" style={{ width: LW }}>Fase Proyek</div>
          <div className="flex-1 overflow-x-auto" ref={roadRef}>
            <div className="relative" style={{ minWidth: range.total * MONTH_WIDTH, height: ROADMAP_H }}>
              {scheduledPhases.map((phase) => {
                const p = getPhaseProgress(wbsItems, phase.id);
                const sd = new Date(phase.planned_start_date!); const ed = new Date(phase.planned_end_date!);
                const color = getStatusColor(phase.status || 'not_started');
                const left = barL(sd); const width = Math.max(barW(sd, ed), 80);
                return (
                  <button key={`road-${phase.id}`}
                    className={`absolute top-2 bottom-2 rounded-md border shadow-sm ${color} cursor-pointer hover:brightness-110 transition-all focus:outline-none focus:ring-2 focus:ring-primary flex items-center px-3 min-w-0`}
                    style={{ left, width }}
                    onClick={() => openStageDlg(phase)}
                    aria-label={`${phase.title}, ${fmt(sd)} sampai ${fmt(ed)}, progres ${p}%, ${getStLabel(phase.status || 'not_started')}`}
                    title={`${phase.title}: ${fmt(sd)} → ${fmt(ed)}`}>
                    {p > 0 && <div className="absolute inset-y-0 left-0 bg-black/20 rounded-l-md" style={{ width: `${p}%` }} />}
                    <span className="text-[11px] font-bold text-white truncate relative z-10 drop-shadow-sm">{phase.title}</span>
                    <span className="text-[10px] text-white/90 font-semibold shrink-0 ml-1.5 relative z-10">{p}%</span>
                  </button>
                );
              })}
              {unscheduledPhases.length > 0 && (
                <div className="absolute right-2 top-2 bottom-2 flex items-center gap-1">
                  {unscheduledPhases.map((s) => (
                    <button key={`uns-${s.id}`} className="text-[9px] bg-amber-50 border border-amber-200 rounded px-2 py-1 text-amber-700 cursor-pointer hover:bg-amber-100"
                      onClick={() => openStageDlg(s)}>{s.title} • Atur Jadwal</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Month header */}
      <div className="flex border-b bg-slate-50 shrink-0">
        <div className="py-2 px-4 text-[10px] font-bold uppercase text-slate-500 border-r flex items-center" style={{ width: LW }}>Timeline</div>
        <div className="flex-1 overflow-hidden">
          {range && <div className="flex" style={{ minWidth: range.total * MONTH_WIDTH }}>{range.months.map((m, i) => (<div key={i} className="shrink-0 text-center py-2 text-[10px] font-bold text-slate-500 border-r" style={{ width: MONTH_WIDTH }}>{m.label}</div>))}</div>}
        </div>
      </div>

      {/* 3. Body: left hierarchy + right Gantt */}
      <div className="flex flex-1 overflow-hidden">
        <div className="overflow-y-auto overflow-x-hidden border-r shrink-0" ref={lpRef} style={{ width: LW }}>
          {timelineRows.map((row) => {
            const durationDw = row.item?.duration_weeks;
            return (
              <div key={row.key} ref={row.type !== 'stage-header' ? (el) => (leftRowRefs.current[row.key] = el) : undefined}
                className={`flex items-center gap-1 px-2 py-1.5 border-b ${
                  row.type === 'stage-header' ? 'bg-slate-50 font-bold' :
                  row.type === 'activity' ? 'pl-4' : 'pl-8'
                }`}
                style={{ minHeight: row.type === 'stage-header' ? STAGE_H : ROW_BASE }}>
                <div className="flex-1 min-w-0">
                  {row.type === 'stage-header' && (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold uppercase truncate">{row.stage ? row.stage.title : 'Belum Ditentukan Stage'}</span>
                      {row.stage && (
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9px] text-muted-foreground">{getPhaseProgress(wbsItems, row.stage.id)}%</span>
                          {isOwner && <Button size="sm" variant="ghost" className="h-5 text-[8px] px-1" onClick={() => openStageDlg(row.stage!)}>Edit</Button>}
                        </div>
                      )}
                    </div>
                  )}
                  {(row.type === 'activity' || row.type === 'task') && row.item && (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[8px] py-0 h-4 shrink-0 ${row.type === 'activity' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
                          {row.type === 'activity' ? 'Activity' : 'Task'}
                        </Badge>
                        <span className="text-xs font-medium truncate">{row.item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground">
                        {/* Editable duration */}
                        <span className="flex items-center gap-0.5">
                          {isOwner && row.item ? (
                            <Input type="number" min={1} max={52}
                              value={durationDw ?? ''} placeholder="Mgg"
                              onChange={(e) => { const v = parseInt(e.target.value); if (v >= 1 && onDurationChange) onDurationChange(row.item!.id, v); }}
                              className="w-10 h-5 text-[9px] px-1 text-center" title="Durasi Minggu" />
                          ) : (
                            <span>{durationDw ? `${durationDw} Minggu` : 'Durasi belum diisi'}</span>
                          )}
                          {isOwner && <span className="text-[8px]">Minggu</span>}
                        </span>
                        {row.item.owner_id && <span className="truncate max-w-[80px]">{nm(row.item.owner_id, orgMemberLookup)}</span>}
                        <span className={row.item.status === 'completed' ? 'text-emerald-700' : row.item.status === 'blocked' ? 'text-red-700' : ''}>{getStLabel(row.item.status)}</span>
                        <span className="font-semibold">{row.item.progress_percent ?? (row.item.status === 'completed' ? 100 : 0)}%</span>
                        {row.item.status === 'blocked' && <AlertTriangle className="h-3 w-3 text-red-500" />}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Gantt — bars locked to Phase timeline */}
        <div className="flex-1 overflow-y-auto overflow-x-auto" ref={rpRef}>
          {range ? (
            <div style={{ minWidth: range.total * MONTH_WIDTH }}>
              {timelineRows.map((row) => {
                if (row.type === 'stage-header') {
                  // Find matching Phase start date for this stage
                  const sd = row.stage?.planned_start_date ? new Date(row.stage.planned_start_date) : null;
                  const ed = row.stage?.planned_end_date ? new Date(row.stage.planned_end_date) : null;
                  return (
                    <div key={`g-${row.key}`} className="border-b bg-slate-50/30 relative flex items-center" style={{ height: STAGE_H }}>
                      {range.months.map((_, i) => (<div key={i} className="shrink-0 h-full border-r border-slate-50" style={{ width: MONTH_WIDTH }} />))}
                      {sd && ed && (
                        <div className="absolute top-1.5 h-3.5 rounded border border-blue-300 bg-blue-100/50" style={{ left: barL(sd), width: barW(sd, ed), minWidth: 40 }} />
                      )}
                    </div>
                  );
                }
                const h = rowHeights[row.key] || ROW_BASE;
                const sd = row.stage?.planned_start_date ? new Date(row.stage.planned_start_date) : null;
                return (
                  <div key={`g-${row.key}`} className="border-b relative flex items-center" style={{ height: h }}>
                    {range.months.map((_, i) => (<div key={i} className="shrink-0 h-full border-r border-slate-50" style={{ width: MONTH_WIDTH }} />))}
                    {/* Activity/Task duration bar — anchored to Phase start */}
                    {row.item?.duration_weeks && row.item.duration_weeks > 0 && sd && (
                      <div
                        className={`absolute top-2 ${row.type === 'activity' ? 'h-4 rounded bg-emerald-500/70 border border-emerald-600 shadow-sm' : 'h-3 rounded bg-indigo-400/60 border border-indigo-500'}`}
                        style={{
                          left: barL(sd),
                          width: Math.max(row.item.duration_weeks * MONTH_WIDTH / 4, 20),
                        }}
                        title={`${row.item?.name}: ${row.item?.duration_weeks} minggu`}>
                        {row.item?.progress_percent ? row.item.progress_percent > 0 && (
                          <div className="absolute inset-y-0 left-0 bg-white/40 rounded-l" style={{ width: `${Math.min(row.item.progress_percent, 100)}%` }} />
                        ) : null}
                      </div>
                    )}
                    {row.item && (!row.item.duration_weeks || row.item.duration_weeks <= 0) && (
                      <div className="absolute top-3 left-2 text-[7px] text-amber-600 italic">Durasi belum diisi</div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Atur jadwal Phase untuk menampilkan Gantt.</div>}
        </div>
      </div>

      {/* Phase Detail Dialog */}
      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-sm">{dlgStage?.title || 'Phase Detail'}</DialogTitle></DialogHeader>
          <div className="space-y-4 text-xs">
            {dlgStage && (
              <div className="space-y-2">
                {dlgStage.description && <p className="text-muted-foreground">{dlgStage.description}</p>}
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-[10px] text-muted-foreground">Status</Label><div className="font-medium">{getStLabel(dlgStage.status || 'not_started')}</div></div>
                  <div><Label className="text-[10px] text-muted-foreground">Progress</Label><div className="font-medium">{getPhaseProgress(wbsItems, dlgStage.id)}%</div></div>
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
                  <Label className="text-[10px] text-muted-foreground uppercase">Activity ({phaseActivities(dlgStage.id).length})</Label>
                  {phaseActivities(dlgStage.id).map((a) => (
                    <div key={a.id} className="flex items-center justify-between py-1 border-b text-[11px]">
                      <span className="truncate">{a.name}</span>
                      <span className="text-muted-foreground shrink-0">{a.duration_weeks ? `${a.duration_weeks} Minggu` : '—'}</span>
                    </div>
                  ))}
                  {phaseActivities(dlgStage.id).length === 0 && <span className="text-muted-foreground italic">Belum ada Activity</span>}
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
