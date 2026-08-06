import { useMemo, useRef, useLayoutEffect, useState, useCallback } from 'react';
import { Calendar, Clock, AlertTriangle, Loader2, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import {
  buildVisibleRows, computeWbsSchedule, computeStageSchedule,
  type StageScheduleInput, type WbsScheduleInput,
} from '@/lib/project-management/scheduleModel';

interface WbsItem {
  id: string; level: number; parent_id: string | null; stage_id: string | null;
  name: string; status: string;
  start_month?: number; duration_weeks?: number;
  planned_start_date?: string | null; planned_end_date?: string | null;
  actual_start_date?: string | null; actual_end_date?: string | null;
  blocked_reason?: string | null; owner_id?: string | null;
}

interface DBStage {
  id: string; title: string; archived_at: string | null;
  planned_start_date?: string | null; planned_end_date?: string | null;
  status?: string;
}

interface OrgMember { user_id: string; full_name: string; job_title: string | null; }

interface Props {
  wbsItems: WbsItem[];
  stages: DBStage[];
  orgMembers: OrgMember[];
  orgMemberLookup: Map<string, OrgMember>;
  isOwner: boolean;
  onScheduleSave?: (wbsId: string, plannedStart: string, plannedEnd: string) => void;
}

const MONTH_WIDTH = 80;
const ROW_BASE = 42;
const STAGE_H = 45;
const LW = 440;

function fmt(d: Date | null): string {
  if (!d) return '—';
  const m = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()];
  return `${d.getDate()} ${m} ${d.getFullYear()}`;
}
function nm(id: string | null, lm: Map<string, OrgMember>): string | null {
  if (!id) return null; return lm.get(id)?.full_name || null;
}

export default function ProjectTimelineView({ wbsItems, stages: dbStages, orgMemberLookup, isOwner, onScheduleSave }: Props) {
  const { toast } = useToast();
  const today = useMemo(() => new Date(), []);
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const leftRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lpRef = useRef<HTMLDivElement>(null); const rpRef = useRef<HTMLDivElement>(null);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgWbsId, setDlgWbsId] = useState<string | null>(null);
  const [dlgTitle, setDlgTitle] = useState('');
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
      actualStartDate: w.actual_start_date || null, actualEndDate: w.actual_end_date || null,
      blockedReason: w.blocked_reason || null, ownerId: w.owner_id || null,
    })), [wbsItems]);

  const visibleRows = useMemo(() => buildVisibleRows({ stages: stageInputs, wbsItems: wbsInputs, today }), [stageInputs, wbsInputs, today]);
  const wbsById = useMemo(() => new Map(wbsInputs.map((w) => [w.id, w])), [wbsInputs]);
  const itemsMissingSchedule = wbsInputs.filter((w) => w.level >= 2 && (!w.plannedStartDate || !w.plannedEndDate));
  const hasAnyDates = wbsInputs.some((w) => w.level >= 2 && w.plannedStartDate);

  // Timeline range from all valid dates
  const range = useMemo(() => {
    if (!hasAnyDates) return null;
    let minD: Date | null = null; let maxD: Date | null = null;
    for (const w of wbsInputs) {
      if (w.plannedStartDate) { const d = new Date(w.plannedStartDate); if (!minD || d < minD) minD = d; }
      if (w.plannedEndDate) { const d = new Date(w.plannedEndDate); if (!maxD || d > maxD) maxD = d; }
    }
    for (const s of stageInputs) {
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
  }, [hasAnyDates, wbsInputs, stageInputs]);

  const barL = (d: Date) => { if (!range?.minD) return 0; return ((d.getFullYear() - range.minD.getFullYear()) * 12 + (d.getMonth() - range.minD.getMonth())) * MONTH_WIDTH; };
  const barW = (s: Date, f: Date) => { const d = (f.getTime() - s.getTime()) / 86400000; return Math.max(4, (d / 30) * MONTH_WIDTH); };

  useLayoutEffect(() => {
    const l = lpRef.current; const r = rpRef.current; if (!l || !r) return;
    const s = () => { r.scrollTop = l.scrollTop; }; l.addEventListener('scroll', s, { passive: true }); return () => l.removeEventListener('scroll', s);
  }, []);
  useLayoutEffect(() => {
    const nh: Record<string, number> = {}; let c = false;
    Object.entries(leftRowRefs.current).forEach(([k, el]) => { if (el) { const h = el.offsetHeight; if (h && rowHeights[k] !== h) { nh[k] = h; c = true; } } });
    if (c) setRowHeights((p) => ({ ...p, ...nh }));
  });

  const openDlg = useCallback((row: { wbsId: string | null }) => {
    if (!row.wbsId) return; const w = wbsById.get(row.wbsId); if (!w) return;
    setDlgWbsId(row.wbsId); setDlgTitle(w.name);
    setDlgStart(w.plannedStartDate || ''); setDlgEnd(w.plannedEndDate || '');
    setDlgOpen(true);
  }, [wbsById]);

  const saveDlg = useCallback(async () => {
    if (!dlgWbsId || !dlgStart || !dlgEnd) { toast({ title: 'Tanggal Wajib', variant: 'destructive' }); return; }
    if (dlgEnd < dlgStart) { toast({ title: 'Tanggal Selesai tidak boleh sebelum Mulai', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      if (onScheduleSave) onScheduleSave(dlgWbsId, dlgStart, dlgEnd);
      toast({ title: 'Jadwal Disimpan' }); setDlgOpen(false); setDlgWbsId(null);
    } catch (err: any) { toast({ title: 'Gagal', description: err?.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  }, [dlgWbsId, dlgStart, dlgEnd, toast, onScheduleSave]);

  // Empty
  if (!hasAnyDates && wbsInputs.filter((w) => w.level >= 2).length > 0) {
    return (
      <div className="border rounded-lg bg-white dark:bg-slate-900 p-8 space-y-6">
        <div className="text-center"><Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><h3 className="text-lg font-bold">Jadwal Activity belum lengkap</h3><p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{itemsMissingSchedule.length} Activity belum memiliki tanggal mulai atau selesai.</p></div>
        <div className="space-y-2 max-w-lg mx-auto">
          <div className="text-xs font-semibold text-muted-foreground uppercase">Activity yang perlu diatur:</div>
          {itemsMissingSchedule.slice(0, 10).map((w) => (
            <div key={w.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
              <span className="text-sm font-medium truncate">{w.name}</span>
              {isOwner && <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => openDlg({ wbsId: w.id })}><Settings className="h-3 w-3 mr-1" /> Atur Jadwal</Button>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white dark:bg-slate-900 flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: 400 }}>
      {itemsMissingSchedule.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b text-xs shrink-0">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-amber-800 flex-1">{itemsMissingSchedule.length} dari {wbsInputs.filter((w) => w.level >= 2).length} Activity belum dijadwalkan.</span>
        </div>
      )}
      <div className="flex border-b bg-slate-50 shrink-0">
        <div className="py-2 px-4 text-[10px] font-bold uppercase text-slate-500 border-r" style={{ width: LW }}>Timeline</div>
        <div className="flex-1 overflow-x-auto">
          {range && <div className="flex" style={{ minWidth: range.total * MONTH_WIDTH }}>{range.months.map((m, i) => (<div key={i} className="shrink-0 text-center py-2 text-[10px] font-bold text-slate-500 border-r" style={{ width: MONTH_WIDTH }}>{m.label}</div>))}</div>}
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="overflow-y-auto overflow-x-hidden border-r shrink-0" ref={lpRef} style={{ width: LW }}>
          {visibleRows.map((row) => (
            <div key={row.key} ref={(el) => (leftRowRefs.current[row.key] = el)}
              className={`flex items-center gap-1 px-2 py-1.5 border-b ${row.type === 'stage-header' ? 'bg-slate-100 font-bold' : row.type === 'empty-stage' ? 'pl-6 text-[11px] text-muted-foreground italic' : row.depth === 2 ? 'pl-6' : row.depth === 3 ? 'pl-12' : 'pl-20'} ${row.isOverdue ? 'border-l-2 border-l-red-500' : ''}`}
              style={{ minHeight: row.type === 'stage-header' ? STAGE_H : ROW_BASE }}>
              <div className="flex-1 min-w-0">
                {row.type === 'stage-header' && (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold uppercase truncate">{row.title}</span>
                    <span className="text-[9px] text-muted-foreground shrink-0">
                      {row.schedule.derivedStartDate ? `${fmt(row.schedule.derivedStartDate)} → ${fmt(row.schedule.derivedFinishDate)}` : row.schedule.label}
                    </span>
                  </div>
                )}
                {(row.type === 'activity' || row.type === 'task') && (
                  <div className="w-full">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`text-[8px] py-0 h-4 shrink-0 ${row.type === 'activity' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>{row.type === 'activity' ? 'Activity' : 'Task'}</Badge>
                      <span className="text-xs font-medium truncate">{row.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {row.isMissingSchedule ? (
                        <span className="text-[8px] text-amber-600 flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" /> Jadwal Belum Diatur</span>
                      ) : (
                        <span className={`text-[8px] flex items-center gap-0.5 ${row.isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}><Clock className="h-2.5 w-2.5" />{row.schedule.derivedStartDate ? fmt(row.schedule.derivedStartDate) : '—'} → {row.schedule.derivedFinishDate ? fmt(row.schedule.derivedFinishDate) : '—'}{row.isOverdue && <span className="ml-1">({row.schedule.label})</span>}</span>
                      )}
                      {isOwner && row.wbsId && (
                        <Button size="sm" variant="outline" className="h-5 text-[8px] px-1.5 ml-auto shrink-0" onClick={() => openDlg(row)}>
                          <Settings className="h-2.5 w-2.5 mr-0.5" />{row.isMissingSchedule ? 'Atur Jadwal' : 'Edit Jadwal'}
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground">
                      {row.ownerId && <span className="truncate max-w-[100px]">{nm(row.ownerId, orgMemberLookup)}</span>}
                      <span className={row.status === 'completed' ? 'text-emerald-700' : row.status === 'blocked' ? 'text-red-700' : ''}>{row.status}</span>
                      <span className="font-semibold">{row.progress}%</span>
                      {row.isBlocked && <AlertTriangle className="h-3 w-3 text-red-500" />}
                    </div>
                  </div>
                )}
                {row.type === 'subtask' && (
                  <div className="w-full"><div className="flex items-center gap-1.5"><Badge variant="outline" className="text-[8px] py-0 h-4 bg-slate-100 text-slate-600 shrink-0">Subtask</Badge><span className="text-[10px] truncate">{row.title}</span></div>{!row.isMissingSchedule && <span className="text-[8px] text-muted-foreground">{fmt(row.schedule.derivedStartDate)} → {fmt(row.schedule.derivedFinishDate)}</span>}</div>
                )}
                {row.type === 'empty-stage' && <span className="text-[11px] text-muted-foreground italic">{row.title}</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-auto" ref={rpRef}>
          {range ? (
            <div style={{ minWidth: range.total * MONTH_WIDTH }}>
              {visibleRows.map((row) => {
                const h = rowHeights[row.key] || (row.type === 'stage-header' ? STAGE_H : ROW_BASE);
                return (
                  <div key={`g-${row.key}`} className="border-b relative flex items-center" style={{ height: h }}>
                    {range.months.map((_, i) => (<div key={i} className="shrink-0 h-full border-r border-slate-50" style={{ width: MONTH_WIDTH }} />))}
                    {row.type === 'stage-header' && row.schedule.derivedStartDate && row.schedule.derivedFinishDate && (
                      <div className="absolute top-2 h-4 rounded border border-blue-400 bg-blue-100/60" style={{ left: barL(row.schedule.derivedStartDate), width: barW(row.schedule.derivedStartDate, row.schedule.derivedFinishDate) }} />
                    )}
                    {row.type === 'activity' && row.schedule.derivedStartDate && row.schedule.derivedFinishDate && (
                      <div className={`absolute top-2 h-5 rounded border shadow-sm bg-emerald-500/80 border-emerald-600 ${row.isOverdue ? 'ring-1 ring-red-400' : ''}`}
                        style={{ left: barL(row.schedule.derivedStartDate), width: barW(row.schedule.derivedStartDate, row.schedule.derivedFinishDate) }}>
                        {row.progress > 0 && <div className="absolute inset-y-0 left-0 bg-white/40 rounded-l" style={{ width: `${row.progress}%` }} />}
                        {row.progress > 0 && row.progress < 100 && <span className="absolute inset-0 flex items-center justify-center text-[8px] font-semibold text-white drop-shadow-sm">{row.progress}%</span>}
                      </div>
                    )}
                    {row.type === 'task' && row.schedule.derivedStartDate && row.schedule.derivedFinishDate && (
                      <div className={`absolute top-2 h-4 rounded border shadow-sm bg-indigo-400/70 border-indigo-500 ${row.isOverdue ? 'ring-1 ring-red-400' : ''}`}
                        style={{ left: barL(row.schedule.derivedStartDate), width: barW(row.schedule.derivedStartDate, row.schedule.derivedFinishDate) }}>
                        {row.progress > 0 && <div className="absolute inset-y-0 left-0 bg-white/40 rounded-l" style={{ width: `${row.progress}%` }} />}
                      </div>
                    )}
                    {row.type === 'subtask' && <div className="absolute top-3 left-2 h-3 bg-slate-200/40 rounded border border-dashed" style={{ width: 40 }} />}
                    {row.isMissingSchedule && (row.type === 'activity' || row.type === 'task') && (
                      <div className="absolute top-2 left-2 text-[8px] text-amber-600 italic bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200">Belum diatur</div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Atur jadwal Activity untuk menampilkan Gantt.</div>}
        </div>
      </div>
      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-sm">Atur Jadwal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Item</Label><Input value={dlgTitle} disabled className="h-8 text-xs bg-slate-50" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Tanggal Mulai</Label><Input type="date" value={dlgStart} onChange={(e) => setDlgStart(e.target.value)} className="h-8 text-xs" /></div>
              <div><Label className="text-xs">Tanggal Selesai</Label><Input type="date" value={dlgEnd} onChange={(e) => setDlgEnd(e.target.value)} className="h-8 text-xs" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setDlgOpen(false)}>Batal</Button>
            <Button size="sm" className="text-xs" onClick={saveDlg} disabled={saving}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Simpan Jadwal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
