import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import BudgetCalculator from '@/pages/dashboard/lfa-builder/BudgetCalculator';
import { ProjectWorkspaceNav } from '../ProjectWorkspaceNav';
import { resolveTargetBudgetForLfaProject } from '@/lib/budget/targetBudget';
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

interface ProjectMeta {
  org_id: string;
  name: string;
  duration_months: number | null;
  sector: string | null;
}

export default function ProjectBudgetPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectMeta, setProjectMeta] = useState<ProjectMeta | null>(null);
  const [targetBudget, setTargetBudget] = useState<number | null>(null);
  const [budgetRefreshKey, setBudgetRefreshKey] = useState(0);
  const [stageExpanded, setStageExpanded] = useState<Record<string, boolean>>({});

  const [rawBudgetItems, setRawBudgetItems] = useState<BudgetItemInput[]>([]);
  const [rawWbsItems, setRawWbsItems] = useState<WbsBudgetInput[]>([]);
  const [rawStages, setRawStages] = useState<StageBudgetInput[]>([]);

  const loadAll = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [projRes, wbsRes, budgetRes, stagesRes] = await Promise.all([
        supabase.from('lfa_projects').select('org_id, name, duration_months, sector').eq('id', projectId).single(),
        (supabase as any).from('lfa_wbs_items').select('id, level, parent_id, stage_id').eq('lfa_project_id', projectId),
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

  const snapshot = useMemo(() => computeBudgetSnapshot({
    targetBudget,
    budgetItems: rawBudgetItems,
    durationMonths: projectMeta?.duration_months || 12,
  }), [targetBudget, rawBudgetItems, projectMeta]);

  const stageResult = useMemo(() => computeStageBudgets({
    budgetItems: rawBudgetItems,
    wbsItems: rawWbsItems,
    stages: rawStages,
  }), [rawBudgetItems, rawWbsItems, rawStages]);

  const activityRows = useMemo(() => computeActivityBudgets({
    budgetItems: rawBudgetItems,
    wbsItems: rawWbsItems,
  }), [rawBudgetItems, rawWbsItems]);

  const onBudgetChanged = useCallback(() => {
    void loadAll();
    setBudgetRefreshKey((k) => k + 1);
  }, [loadAll]);

  const activityNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of rawWbsItems) {
      if (w.level === 2) map.set(w.id, `Activity ${w.id.slice(0, 8)}`);
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
          {/* SECTION 1 — Budget Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ringkasan Anggaran</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <div className="text-xs text-muted-foreground">Target Budget</div>
                  <div className="text-lg font-bold">
                    {snapshot.hasTargetBudget ? formatBudgetBadge(snapshot.targetBudget!) : 'Belum ditetapkan'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Detailed Budget</div>
                  <div className="text-lg font-bold">{formatBudgetBadge(snapshot.detailedBudget)}</div>
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
                    {snapshot.overAllocation > 0 ? 'Over-allocation' : 'Sisa Gap'}
                  </div>
                  <div className={`text-lg font-bold ${snapshot.overAllocation > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                    {snapshot.hasTargetBudget
                      ? snapshot.overAllocation > 0
                        ? `+${formatBudgetBadge(snapshot.overAllocation)}`
                        : formatBudgetBadge(snapshot.remainingGap ?? 0)
                      : '—'}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 border-t pt-4">
                <div>
                  <div className="text-xs text-muted-foreground">Realisasi</div>
                  <div className="text-sm font-semibold">{formatBudgetBadge(snapshot.actualRealization)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Utilisasi</div>
                  <div className="text-sm font-semibold">{snapshot.utilizationPercent.toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Burn Rate (bln)</div>
                  <div className="text-sm font-semibold">{formatBudgetBadge(snapshot.plannedBurnRate)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Overhead</div>
                  <div className="text-sm font-semibold">{snapshot.overheadPercent.toFixed(0)}%</div>
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
                      <div className="text-sm font-bold shrink-0">{formatBudgetBadge(row.total)}</div>
                      {row.percentOfProject > 0 && (
                        <Progress value={row.percentOfProject} className="w-16 h-1.5 shrink-0" />
                      )}
                    </div>
                    <CollapsibleContent className="pl-8 pt-2 space-y-1">
                      {activityRows
                        .filter((a) => {
                          const w = rawWbsItems.find((wi) => wi.id === a.activityId);
                          if (!w || w.level !== 2) return false;
                          let cur = w;
                          for (let g = 0; g < 10; g++) {
                            if (cur.level === 1) return cur.stage_id === row.stageId;
                            if (!cur.parent_id) break;
                            const parent = rawWbsItems.find((p) => p.id === cur.parent_id);
                            if (!parent) break;
                            cur = parent;
                          }
                          return row.stageId === null;
                        })
                        .map((a) => (
                          <div key={a.activityId} className="flex items-center justify-between rounded bg-muted/30 px-3 py-1.5 text-xs">
                            <span className="truncate">{activityNameById.get(a.activityId) || a.activityId}</span>
                            <span className="ml-2 shrink-0 text-muted-foreground">
                              {formatBudgetBadge(a.total)} · {a.budgetItemCount} item
                            </span>
                          </div>
                        ))}
                      {activityRows.filter((a) => {
                        const w = rawWbsItems.find((wi) => wi.id === a.activityId);
                        if (!w || w.level !== 2) return false;
                        let cur = w;
                        for (let g = 0; g < 10; g++) {
                          if (cur.level === 1) return cur.stage_id === row.stageId;
                          if (!cur.parent_id) break;
                          const parent = rawWbsItems.find((p) => p.id === cur.parent_id);
                          if (!parent) break;
                          cur = parent;
                        }
                        return row.stageId === null;
                      }).length === 0 && (
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
                    <div className="text-sm font-bold shrink-0">{formatBudgetBadge(stageResult.unassignedTotal)}</div>
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
                <div>Remunerasi Tenaga Ahli &amp; Pendukung</div>
                <div className="mt-1">Indeks provinsi diterapkan berdasarkan lokasi proyek untuk penyesuaian biaya personil.</div>
              </div>
              <div className="rounded border p-3">
                <div className="font-semibold text-foreground text-xs mb-1">Skenario Efisiensi Internal</div>
                <div>Multiplier dapat disesuaikan</div>
                <div className="mt-1">Bukan standar resmi. Gunakan untuk perencanaan skenario internal organisasi.</div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 4 — Detailed Budget Calculator */}
          <BudgetCalculator
            key={budgetRefreshKey}
            projectId={projectId}
            orgId={orgId}
            programDurationMonths={projectMeta?.duration_months || 12}
            sector={projectMeta?.sector || 'Sektor Lainnya'}
            onBudgetChanged={onBudgetChanged}
          />
        </>
      )}
    </div>
  );
}
