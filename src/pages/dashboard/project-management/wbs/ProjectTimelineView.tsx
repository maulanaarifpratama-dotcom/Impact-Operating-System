import { useMemo, useRef, useLayoutEffect, useState, useCallback } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { updateProjectStageMetadata } from '@/lib/project-management/stageRpc';

interface WbsItem {
  id: string; level: number; parent_id: string | null; stage_id: string | null;
  name: string; status: string;
  duration_weeks?: number; progress_percent?: number;
  blocked_reason?: string | null; owner_id?: string | null;
}

interface DBStage {
  id: string; title: string; archived_at: string | null;
  planned_start_date?: string | null; planned_end_date?: string | null;
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

const MW = 76; // month width
const LH = 40; // left row height (will be measured)
const LW = 340;

function f(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function phasesProgress(items: WbsItem[], sid: string): number {
  const acts = items.filter((w) => w.level === 2 && w.stage_id === sid && w.status !== 'cancelled');
  if (!acts.length) return 0;
  const sum = acts.reduce((s, a) => s + Math.min(100, Math.max(0, a.progress_percent ?? (a.status === 'completed' ? 100 : 0))), 0);
  return Math.round(sum / acts.length);
}

const statusColors: Record<string, string> = {
  completed: 'bg-emerald-500', in_progress: 'bg-blue-500', blocked: 'bg-red-500',
};

function sc(s: string) { return statusColors[s] || 'bg-slate-400'; }
function sl(s: string) {
  const m: Record<string, string> = { not_started: 'Belum Mulai', in_progress: 'Berjalan', completed: 'Selesai', blocked: 'Terhambat' };
  return m[s] || s;
}

function weeksLabel(w: number | null | undefined): string {
  if (w == null || w <= 0) return '—';
  return `${w} Minggu`;
}

export default function ProjectTimelineView({ wbsItems, stages: dbs, orgMemberLookup, isOwner, onStagesRefresh, onDurationChange }: Props) {
  const { toast } = useToast();
  const [dlg, setDlg] = useState(false);
  const [ds, setDs] = useState<DBStage | null>(null);
  const [d1, setD1] = useState(''); const [d2, setD2] = useState('');
  const [sv, setSv] = useState(false);
  const [rh, setRh] = useState<Record<string, number>>({});
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const lp = useRef<HTMLDivElement>(null);
  const rp = useRef<HTMLDivElement>(null);
  const pr = useRef<HTMLDivElement>(null);

  const acts = dbs.filter((s) => !s.archived_at);
  const sched = acts.filter((s) => s.planned_start_date && s.planned_end_date);

  // Build rows: Stage headers + their Activity/Task children
  const rows = useMemo(() => {
    const r: { key: string; sid: string | null; type: 'stage' | 'activity' | 'task'; item: WbsItem | null; stage: DBStage | null; depth: number }[] = [];
    for (const s of acts) {
      r.push({ key: `s-${s.id}`, sid: s.id, type: 'stage', item: null, stage: s, depth: 0 });
      const aw = wbsItems.filter((w) => w.level === 2 && w.stage_id === s.id);
      for (const a of aw) {
        r.push({ key: `a-${a.id}`, sid: s.id, type: 'activity', item: a, stage: s, depth: 2 });
        const tw = wbsItems.filter((w) => w.parent_id === a.id);
        for (const t of tw) r.push({ key: `t-${t.id}`, sid: s.id, type: 'task', item: t, stage: s, depth: 3 });
      }
    }
    const ua = wbsItems.filter((w) => w.level === 2 && !w.stage_id);
    if (ua.length > 0) {
      r.push({ key: 's-unassigned', sid: null, type: 'stage', item: null, stage: null, depth: 0 });
      for (const a of ua) r.push({ key: `a-${a.id}`, sid: null, type: 'activity', item: a, stage: null, depth: 2 });
    }
    return r;
  }, [acts, wbsItems]);

  // Timeline range from Phase dates
  const range = useMemo(() => {
    if (!sched.length) return null;
    let mn: Date | null = null, mx: Date | null = null;
    for (const s of sched) {
      const sd = new Date(s.planned_start_date!); const ed = new Date(s.planned_end_date!);
      if (!mn || sd < mn) mn = sd;
      if (!mx || ed > mx) mx = ed;
    }
    if (!mn || !mx) return null;
    mn = new Date(mn.getFullYear(), mn.getMonth(), 1);
    mx = new Date(mx.getFullYear(), mx.getMonth() + 2, 0);
    const months: string[] = [];
    const c = new Date(mn);
    const ml = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    while (c <= mx) { months.push(`${ml[c.getMonth()]} ${c.getFullYear()}`); c.setMonth(c.getMonth() + 1); }
    return { min: mn, max: mx, months, total: months.length };
  }, [sched]);

  const x = (d: Date) => { if (!range?.min) return 0; return ((d.getFullYear() - range.min.getFullYear()) * 12 + (d.getMonth() - range.min.getMonth())) * MW; };
  const w = (s: Date, e: Date) => Math.max(8, ((e.getTime() - s.getTime()) / 86400000 / 30) * MW);

  // Sync: roadmap horizontal → month + body horizontal
  useLayoutEffect(() => {
    const p = pr.current; const r = rp.current; if (!p || !r) return;
    const s = () => { r.scrollLeft = p.scrollLeft; };
    p.addEventListener('scroll', s, { passive: true });
    return () => p.removeEventListener('scroll', s);
  }, []);
  // Sync: left vertical → right vertical
  useLayoutEffect(() => {
    const l = lp.current; const r = rp.current; if (!l || !r) return;
    const s = () => { r.scrollTop = l.scrollTop; };
    l.addEventListener('scroll', s, { passive: true });
    return () => l.removeEventListener('scroll', s);
  }, []);
  // Measure row heights
  useLayoutEffect(() => {
    const nh: Record<string, number> = {}; let ch = false;
    Object.entries(refs.current).forEach(([k, e]) => { if (e) { const h = e.offsetHeight; if (h && rh[k] !== h) { nh[k] = h; ch = true; } } });
    if (ch) setRh((p) => ({ ...p, ...nh }));
  });

  const openDlg = useCallback((s: DBStage) => { setDs(s); setD1(s.planned_start_date || ''); setD2(s.planned_end_date || ''); setDlg(true); }, []);
  const saveDlg = useCallback(async () => {
    if (!ds || !d1 || !d2) { toast({ title: 'Tanggal wajib diisi', variant: 'destructive' }); return; }
    if (d2 < d1) { toast({ title: 'Tanggal selesai tidak boleh sebelum mulai', variant: 'destructive' }); return; }
    setSv(true);
    try {
      const { error } = await updateProjectStageMetadata({ stageId: ds.id, title: ds.title, plannedStartDate: d1, plannedEndDate: d2 });
      if (error) throw error;
      toast({ title: 'Jadwal Phase disimpan' }); setDlg(false); setDs(null);
      if (onStagesRefresh) onStagesRefresh();
    } catch (e: any) { toast({ title: 'Gagal', description: e?.message, variant: 'destructive' }); }
    finally { setSv(false); }
  }, [ds, d1, d2, toast, onStagesRefresh]);

  // Empty state
  if (!sched.length && acts.length > 0) {
    return (
      <div className="border rounded-lg bg-white dark:bg-slate-900 p-8 space-y-4">
        <div className="text-center"><Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><h3 className="text-lg font-bold">Jadwal proyek belum diatur</h3><p className="text-sm text-muted-foreground">Atur tanggal mulai dan selesai setiap Phase.</p></div>
        {acts.map((s) => (
          <div key={s.id} className="flex items-center justify-between p-3 border rounded bg-slate-50 max-w-lg mx-auto">
            <span className="text-sm font-medium">{s.title}</span>
            {isOwner && <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => openDlg(s)}>Atur Jadwal</Button>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white dark:bg-slate-900 flex flex-col" style={{ height: 'calc(100vh - 260px)', minHeight: 400 }}>
      {/* Phase Roadmap Band */}
      {range && (
        <TooltipProvider>
        <div className="flex border-b shrink-0 bg-slate-50/30">
          <div className="py-2 px-3 text-[10px] font-bold uppercase text-slate-500 border-r flex items-center shrink-0" style={{ width: LW }}>Fase Proyek</div>
          <div className="flex-1 overflow-x-auto" ref={pr}>
            <div className="relative" style={{ minWidth: range.total * MW, height: 48 }}>
              {sched.map((s) => {
                const sd = new Date(s.planned_start_date!); const ed = new Date(s.planned_end_date!);
                const pg = phasesProgress(wbsItems, s.id);
                return (
                  <Tooltip key={`p-${s.id}`}>
                    <TooltipTrigger asChild>
                      <button className={`absolute top-2 bottom-2 rounded-md border shadow-sm ${sc(s.status || 'not_started')} cursor-pointer hover:brightness-110 transition-all focus:ring-2 focus:ring-primary flex items-center px-3`}
                        style={{ left: x(sd), width: Math.max(w(sd, ed), 60) }}
                        onClick={() => openDlg(s)}
                        aria-label={`${s.title}, ${f(sd)} - ${f(ed)}, ${pg}%`}>
                        {pg > 0 && <div className="absolute inset-y-0 left-0 bg-black/20 rounded-l-md" style={{ width: `${pg}%` }} />}
                        <span className="text-[10px] font-bold text-white truncate relative z-10">{s.title}</span>
                        <span className="text-[9px] text-white/90 font-semibold shrink-0 ml-1.5 relative z-10">{pg}%</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs"><p>{s.title}: {f(sd)} → {f(ed)}</p><p>Progress: {pg}%</p></TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </div>
        </TooltipProvider>
      )}

      {/* Month Header */}
      <div className="flex border-b bg-slate-50 shrink-0">
        <div className="py-2 px-3 text-[10px] font-bold uppercase text-slate-500 border-r flex items-center" style={{ width: LW }}>Timeline</div>
        <div className="flex-1 overflow-hidden">
          {range && <div className="flex" style={{ minWidth: range.total * MW }}>{range.months.map((m, i) => (<div key={i} className="shrink-0 text-center py-2 text-[10px] font-bold text-slate-500 border-r" style={{ width: MW }}>{m}</div>))}</div>}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left hierarchy */}
        <div className="overflow-y-auto overflow-x-hidden border-r shrink-0" ref={lp} style={{ width: LW }}>
          {rows.map((row) => {
            const dw = row.item?.duration_weeks;
            return (
              <div key={row.key} ref={(el) => { refs.current[row.key] = el; }}
                className={`flex items-center gap-1 px-2 py-1 border-b ${row.type === 'stage' ? 'bg-slate-50 font-bold' : row.depth === 2 ? 'pl-4' : 'pl-8'}`}
                style={{ minHeight: LH }}>
                <div className="flex-1 min-w-0">
                  {row.type === 'stage' && (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] font-bold uppercase truncate">{row.stage ? row.stage.title : 'Belum Ditentukan Stage'}</span>
                      {row.stage && <span className="text-[9px] text-muted-foreground shrink-0">{phasesProgress(wbsItems, row.stage.id)}%</span>}
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
                        {isOwner && row.type === 'activity' ? (
                          <span className="flex items-center gap-0.5">
                            <Input type="number" min={1} max={52} value={dw ?? ''} placeholder="0"
                              onChange={(e) => { const v = parseInt(e.target.value); if (v >= 1 && onDurationChange) onDurationChange(row.item!.id, v); }}
                              className="w-12 h-5 text-[9px] px-1 text-center" />
                            <span>Minggu</span>
                          </span>
                        ) : (
                          <span>{weeksLabel(dw)}</span>
                        )}
                        <span className={`${row.item.status === 'completed' ? 'text-emerald-700' : row.item.status === 'blocked' ? 'text-red-700' : ''}`}>{sl(row.item.status)}</span>
                        <span className="font-semibold">{row.item.progress_percent ?? 0}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Gantt */}
        <div className="flex-1 overflow-y-auto overflow-x-auto" ref={rp}>
          {range ? (
            <div style={{ minWidth: range.total * MW }}>
              {rows.map((row) => {
                const h = rh[row.key] || LH;
                const sd = row.stage?.planned_start_date ? new Date(row.stage.planned_start_date) : null;
                const ed = row.stage?.planned_end_date ? new Date(row.stage.planned_end_date) : null;
                return (
                  <div key={`g-${row.key}`} className="border-b relative flex items-center" style={{ height: h }}>
                    {range.months.map((_, i) => (<div key={i} className="shrink-0 h-full border-r border-slate-50" style={{ width: MW }} />))}
                    {/* Stage bar */}
                    {row.type === 'stage' && sd && ed && (
                      <div className="absolute top-1.5 h-3 rounded border border-blue-300 bg-blue-100/50" style={{ left: x(sd), width: w(sd, ed), minWidth: 30 }} />
                    )}
                    {/* Activity/Task bar — locked to Phase start, width from duration_weeks */}
                    {row.item?.duration_weeks && row.item.duration_weeks > 0 && sd && (
                      <div
                        className={`absolute top-2 ${row.type === 'activity' ? 'h-4 rounded bg-emerald-500/70 border border-emerald-600 shadow-sm' : 'h-3 rounded bg-indigo-400/60 border border-indigo-500'}`}
                        style={{ left: x(sd), width: Math.max(row.item.duration_weeks * MW / 4, 16) }}>
                        {row.item.progress_percent ? row.item.progress_percent > 0 && (
                          <div className="absolute inset-y-0 left-0 bg-white/40 rounded-l" style={{ width: `${Math.min(row.item.progress_percent, 100)}%` }} />
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Atur jadwal Phase.</div>
          )}
        </div>
      </div>

      {/* Phase Dialog */}
      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-sm">{ds?.title || 'Phase'}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-xs">
            {ds && isOwner && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-[10px]">Tanggal Mulai</Label><Input type="date" value={d1} onChange={(e) => setD1(e.target.value)} className="h-8 text-xs" /></div>
                <div><Label className="text-[10px]">Tanggal Selesai</Label><Input type="date" value={d2} onChange={(e) => setD2(e.target.value)} className="h-8 text-xs" /></div>
              </div>
            )}
            {ds && (
              <div className="space-y-1 pt-2 border-t">
                <Label className="text-[10px] uppercase text-muted-foreground">Activity</Label>
                {wbsItems.filter((w) => w.level === 2 && w.stage_id === ds.id).map((a) => (
                  <div key={a.id} className="flex justify-between py-0.5 text-[11px]"><span className="truncate">{a.name}</span><span className="text-muted-foreground shrink-0">{weeksLabel(a.duration_weeks)}</span></div>
                ))}
              </div>
            )}
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
