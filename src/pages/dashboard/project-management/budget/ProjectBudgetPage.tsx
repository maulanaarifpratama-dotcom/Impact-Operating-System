import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, ChevronDown, ChevronRight, Info, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useOrgRole } from '@/hooks/useOrgRole';
import { supabase } from '@/integrations/supabase/client';
import BudgetCalculator from '@/pages/dashboard/lfa-builder/BudgetCalculator';
import { ProjectWorkspaceNav } from '../ProjectWorkspaceNav';
import { resolveTargetBudgetForLfaProject, persistTargetBudgetForLfaProject } from '@/lib/budget/targetBudget';
import ActivityBudgetEditor from '@/components/budget/ActivityBudgetEditor';
import {
  computeBudgetSnapshot,
  computeStageBudgets,
  computeActivityBudgets,
  formatIDR,
  formatBudgetBadge,
  type BudgetItemInput,
  type WbsBudgetInput,
  type StageBudgetInput,
} from '@/lib/budget/budgetModel';
import { classifyFinanceHealth, type FinanceHealth } from '@/lib/project-management/financeModel';

interface ProjectMeta {
  org_id: string;
  name: string;
  duration_months: number | null;
  sector: string | null;
}

type StageActivityRow = { activityId: string; total: number; budgetItemCount: number };

export default function ProjectBudgetPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role: orgRole } = useOrgRole();
  const isOwner = orgRole === 'owner';

  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectMeta, setProjectMeta] = useState<ProjectMeta | null>(null);
  const [targetBudget, setTargetBudget] = useState<number | null>(null);
  const [stageExpanded, setStageExpanded] = useState<Record<string, boolean>>({});

  const [rawBudgetItems, setRawBudgetItems] = useState<BudgetItemInput[]>([]);
  const [rawWbsItems, setRawWbsItems] = useState<WbsBudgetInput[]>([]);
  const [rawStages, setRawStages] = useState<StageBudgetInput[]>([]);

  // Target Budget dialog
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);

  const loadAll = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [projRes, wbsRes, budgetRes, stagesRes] = await Promise.all([
        supabase.from('lfa_projects').select('org_id, name, duration_months, sector').eq('id', projectId).single(),
        (supabase as any).from('lfa_wbs_items').select('id, level, parent_id, stage_id, name').eq('lfa_project_id', projectId),
        supabase.from('lfa_budget_items').select('id, wbs_item_id, volume, unit_price_idr, actual_amount_idr, cost_category').eq('lfa_project_id', projectId),
        (supabase as any).from('project_stages').select('id, title, archived_at').eq('project_id', projectId),
      ]);

      if (projRes.error) throw projRes.error;
      if (wbsRes.error) throw wbsRes.error;
      if (budgetRes.error) throw budgetRes.error;
      if (stagesRes.error) throw stagesRes.error;

      const proj = projRes.data as ProjectMeta;
      setProjectMeta(proj);
      setOrgId(proj.org_id);
      setRawWbsItems((wbsRes.data || []) as WbsBudgetInput[]);
      setRawBudgetItems((budgetRes.data || []) as BudgetItemInput[]);
      setRawStages((stagesRes.data || []) as StageBudgetInput[]);

      const tgt = await resolveTargetBudgetForLfaProject(supabase as any, projectId);
      setTargetBudget(tgt);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  // Deep-link from Work Plan: ?activityId=xxx
  const [searchParams] = useSearchParams();
  const focusedActivityId = searchParams.get('activityId');

  // Auto-expand stage containing the focused Activity
  useEffect(() => {
    if (!focusedActivityId || rawWbsItems.length === 0) return;
    const wbsById = new Map(rawWbsItems.map((w) => [w.id, w]));
    let cur = wbsById.get(focusedActivityId);
    let stageId: string | null = null;
    for (let g = 0; g < 10 && cur; g++) {
      if (cur.level === 1) { stageId = cur.stage_id ?? null; break; }
      if (!cur.parent_id) break;
      cur = wbsById.get(cur.parent_id);
    }
    if (stageId) {
      setStageExpanded((prev) => ({ ...prev, [stageId!]: true }));
    }
  }, [focusedActivityId, rawWbsItems]);

  const snapshot = useMemo(() => computeBudgetSnapshot({
    targetBudget,
    budgetItems: rawBudgetItems,
    durationMonths: projectMeta?.duration_months || 12,
  }), [targetBudget, rawBudgetItems, projectMeta]);

  const financeHealth = useMemo<FinanceHealth>(
    () => classifyFinanceHealth(snapshot.detailedBudget, snapshot.actualRealization),
    [snapshot.detailedBudget, snapshot.actualRealization],
  );

  const HEALTH_LABEL: Record<FinanceHealth, string> = {
    unknown: 'Tidak Diketahui',
    healthy: 'Sehat',
    watch: 'Perlu Perhatian',
    critical: 'Kritis',
    overspent: 'Melebihi Anggaran',
  };

  const stageResult = useMemo(() => computeStageBudgets({
    budgetItems: rawBudgetItems,
    wbsItems: rawWbsItems,
    stages: rawStages,
  }), [rawBudgetItems, rawWbsItems, rawStages]);

  const activityRows = useMemo(() => computeActivityBudgets({
    budgetItems: rawBudgetItems,
    wbsItems: rawWbsItems,
  }), [rawBudgetItems, rawWbsItems]);

  // Pre-compute which activity belongs to which stage
  const activitiesByStage = useMemo(() => {
    const map = new Map<string | null, StageActivityRow[]>();
    const wbsById = new Map(rawWbsItems.map((w) => [w.id, w]));

    const resolveStage = (wbsItemId: string): string | null => {
      let cur = wbsById.get(wbsItemId);
      for (let g = 0; g < 10 && cur; g++) {
        if (cur.level === 1) return cur.stage_id ?? null;
        if (!cur.parent_id) break;
        cur = wbsById.get(cur.parent_id);
      }
      return null;
    };

    for (const stage of stageResult.rows) {
      map.set(stage.stageId, []);
    }
    map.set(null, []);

    for (const a of activityRows) {
      const sid = resolveStage(a.activityId);
      const key = sid && map.has(sid) ? sid : null;
      map.get(key)!.push(a);
    }
    return map;
  }, [activityRows, rawWbsItems, stageResult.rows]);

  const onBudgetChanged = useCallback(() => {
    void loadAll();
  }, [loadAll]);

  // Target Budget persistence
  const openTargetDialog = () => {
    setTargetInput(targetBudget ? String(Math.round(targetBudget)) : '');
    setTargetDialogOpen(true);
  };

  const handleSaveTarget = async () => {
    const normalized = Number(String(targetInput).replace(/[^0-9]/g, ''));
    if (!Number.isFinite(normalized) || normalized <= 0) {
      toast({ title: 'Target Budget tidak valid', description: 'Isi nominal lebih besar dari 0.', variant: 'destructive' });
      return;
    }
    setSavingTarget(true);
    try {
      const saved = await persistTargetBudgetForLfaProject(supabase as any, projectId!, normalized);
      setTargetBudget(saved);
      setTargetDialogOpen(false);
      toast({ title: 'Target Budget Tersimpan', description: `Target budget diperbarui ke ${formatIDR(saved)}.` });
    } catch (err: any) {
      toast({ title: 'Gagal menyimpan Target Budget', description: err?.message || 'Terjadi kesalahan.', variant: 'destructive' });
    } finally {
      setSavingTarget(false);
    }
  };

  const wbsNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of rawWbsItems) {
      if (w.level === 2 && (w as any).name) map.set(w.id, (w as any).name);
    }
    return map;
  }, [rawWbsItems]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-2">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/project-management')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
      </div>

      {projectId && <ProjectWorkspaceNav projectId={projectId} />}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error || !orgId || !projectId ? (
        <Card className="border-destructive/50">
          <CardContent className="py-4 text-sm text-destructive">{error || 'Proyek tidak ditemukan.'}</CardContent>
        </Card>
      ) : (
        <>
          {/* Focused Activity header (deep-linked from Work Plan) */}
          {focusedActivityId && (() => {
            const actWbs = rawWbsItems.find((w) => w.id === focusedActivityId && w.level === 2);
            if (!actWbs) return null;
            const actName = ((actWbs as any).name as string) || focusedActivityId;
            return (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Kelola Budget Activity</div>
                    <div className="text-sm font-bold">{actName}</div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate(`/dashboard/project-management/${projectId}/budget`, { replace: true })}>
                    Tampilkan Semua
                  </Button>
                </CardContent>
              </Card>
            );
          }          )()}

          {/* Activity Budget Editor (when activityId is present) */}
          {focusedActivityId && orgId && (
            <ActivityBudgetEditor
              projectId={projectId!}
              orgId={orgId}
              activityId={focusedActivityId}
              activityName={rawWbsItems.find((wi) => wi.id === focusedActivityId && wi.level === 2)
                ? ((rawWbsItems.find((wi) => wi.id === focusedActivityId && wi.level === 2) as any)?.name as string) || focusedActivityId
                : focusedActivityId}
              isOwner={isOwner}
              onChanged={onBudgetChanged}
            />
          )}

          {/* SECTION 1 — Budget Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Ringkasan Anggaran</CardTitle>
              {isOwner && (
                <Button variant="outline" size="sm" onClick={openTargetDialog}>
                  <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                  {snapshot.hasTargetBudget ? 'Edit Target Budget' : 'Set Target Budget'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <div className="text-xs text-muted-foreground">Target Budget</div>
                  <div className="text-lg font-bold">
                    {snapshot.hasTargetBudget ? formatIDR(snapshot.targetBudget!) : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Detailed Budget</div>
                  <div className="text-lg font-bold">{formatIDR(snapshot.detailedBudget)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Coverage</div>
                  <div className="text-lg font-bold">
                    {snapshot.hasTargetBudget ? `${snapshot.coveragePercent.toFixed(0)}%` : '—'}
                  </div>
                  {snapshot.hasTargetBudget && (
                    <Progress value={Math.min(snapshot.coveragePercent, 100)} className="mt-1 h-1.5" />
                  )}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    {snapshot.overAllocation > 0 ? 'Over-allocation' : 'Gap Belum Dialokasikan'}
                  </div>
                  <div className={`text-lg font-bold ${snapshot.overAllocation > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                    {snapshot.hasTargetBudget
                      ? snapshot.overAllocation > 0
                        ? `+${formatIDR(snapshot.overAllocation)}`
                        : formatIDR(snapshot.remainingGap ?? 0)
                      : '—'}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 border-t pt-4">
                <div>
                  <div className="text-xs text-muted-foreground">Realisasi</div>
                  <div className="text-sm font-semibold">{formatIDR(snapshot.actualRealization)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Utilisasi</div>
                  <div className="text-sm font-semibold">{snapshot.utilizationPercent.toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Burn Rate Bulanan (Target)</div>
                  <div className="text-sm font-semibold">{snapshot.hasTargetBudget ? formatIDR(snapshot.plannedBurnRate) : '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Overhead</div>
                  <div className="text-sm font-semibold">{snapshot.overheadPercent.toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Kesehatan Finansial</div>
                  <div className={`text-sm font-semibold ${
                    financeHealth === 'healthy' ? 'text-emerald-600' :
                    financeHealth === 'watch' ? 'text-amber-600' :
                    financeHealth === 'critical' ? 'text-orange-600' :
                    financeHealth === 'overspent' ? 'text-red-600' :
                    'text-muted-foreground'
                  }`}>
                    {HEALTH_LABEL[financeHealth]}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2 — Budget by Stage */}
          {stageResult.rows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Budget per Stage</CardTitle>
                <CardDescription>
                  Dikelompokkan melalui Activity → Stage. Total: {formatIDR(snapshot.detailedBudget)} — {rawBudgetItems.length} item anggaran.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {stageResult.rows.map((row) => (
                  <Collapsible
                    key={row.stageId ?? 'unassigned'}
                    open={stageExpanded[row.stageId ?? '__unassigned__']}
                    onOpenChange={(open) =>
                      setStageExpanded((prev) => ({ ...prev, [row.stageId ?? '__unassigned__']: open }))
                    }
                  >
                    <div className="flex items-center gap-2 rounded-md border p-3">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                          {stageExpanded[row.stageId ?? '__unassigned__'] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{row.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.activityCount} Activity · {row.percentOfProject.toFixed(0)}% dari Project
                        </div>
                      </div>
                      <div className="text-sm font-bold shrink-0">{formatIDR(row.total)}</div>
                      {row.percentOfProject > 0 && (
                        <Progress value={row.percentOfProject} className="w-16 h-1.5 shrink-0" />
                      )}
                    </div>
                    <CollapsibleContent className="pl-8 pt-2 space-y-1">
                      {(activitiesByStage.get(row.stageId) || []).map((a) => (
                        <div
                          key={a.activityId}
                          id={`activity-budget-${a.activityId}`}
                          className={`flex items-center justify-between rounded bg-muted/30 px-3 py-1.5 text-xs ${focusedActivityId === a.activityId ? 'ring-2 ring-primary/50 bg-primary/10' : ''}`}
                        >
                          <span className="truncate">{wbsNameById.get(a.activityId) || a.activityId}</span>
                          <span className="ml-2 shrink-0 text-muted-foreground">
                            {formatIDR(a.total)} · {a.budgetItemCount} item
                          </span>
                        </div>
                      ))}
                      {(activitiesByStage.get(row.stageId) || []).length === 0 && (
                        <div className="text-xs text-muted-foreground italic px-3 py-1">Belum ada Activity dengan anggaran.</div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                ))}

                {stageResult.unassignedTotal > 0 && (
                  <div className="flex items-center gap-2 rounded-md border border-dashed p-3">
                    <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">Belum Ditentukan Stage</div>
                      <div className="text-xs text-muted-foreground">Activity yang belum ditautkan ke Stage mana pun</div>
                    </div>
                    <div className="text-sm font-bold shrink-0">{formatIDR(stageResult.unassignedTotal)}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* SECTION 3 — Reference Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Referensi Standar</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs text-muted-foreground">
              <div className="rounded border p-3">
                <div className="font-semibold text-foreground text-xs mb-1">SBM (Standar Biaya Masukan)</div>
                <div>TA 2026, PMK 32 Tahun 2025</div>
                <div className="mt-1">Referensi resmi. Gunakan sebagai pembanding, bukan pengganti otomatis.</div>
              </div>
              <div className="rounded border p-3">
                <div className="font-semibold text-foreground text-xs mb-1">INKINDO 2026</div>
                <div>Referensi Biaya Profesional</div>
                <div className="mt-1">Indeks provinsi diterapkan berdasarkan lokasi proyek untuk penyesuaian biaya personil.</div>
              </div>
              <div className="rounded border p-3">
                <div className="font-semibold text-foreground text-xs mb-1">Skenario Efisiensi Internal</div>
                <div>Multiplier 70% (dapat disesuaikan)</div>
                <div className="mt-1">Bukan standar resmi. Untuk perencanaan skenario internal organisasi.</div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 4 — Detailed Budget Calculator */}
          <BudgetCalculator
            projectId={projectId}
            orgId={orgId}
            programDurationMonths={projectMeta?.duration_months || 12}
            sector={projectMeta?.sector || 'Sektor Lainnya'}
            onBudgetChanged={onBudgetChanged}
            productMode="project_management"
          />

          {/* Target Budget Dialog */}
          <Dialog open={targetDialogOpen} onOpenChange={setTargetDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{snapshot.hasTargetBudget ? 'Edit Target Budget' : 'Set Target Budget'}</DialogTitle>
                <DialogDescription>
                  Target budget digunakan sebagai acuan Coverage dan Gap terhadap Detailed Budget.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="pm-target-budget">Target Budget (IDR)</Label>
                <Input
                  id="pm-target-budget"
                  inputMode="numeric"
                  placeholder="500000000"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && targetInput.trim()) void handleSaveTarget();
                  }}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" disabled={savingTarget} onClick={() => setTargetDialogOpen(false)}>
                  Batal
                </Button>
                <Button onClick={handleSaveTarget} disabled={savingTarget || !targetInput.trim()}>
                  {savingTarget ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Simpan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
