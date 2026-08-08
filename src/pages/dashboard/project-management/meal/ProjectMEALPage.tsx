import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  History,
  ClipboardCheck,
  FileText,
  AlertTriangle,
  Clock,
  Target,
  Wallet,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ProjectWorkspaceNav } from '../ProjectWorkspaceNav';
import {
  computeMonitoring,
  type MonitoringOutput,
  type WbsSnapshot,
  type DeliverableSnapshot,
  type ClaimSnapshot,
  type EvidenceSnapshot,
  type ActivityEvent,
} from '@/lib/project-management/monitoringModel';
import {
  computeBudgetSnapshot,
  type BudgetItemInput,
} from '@/lib/budget/budgetModel';
import { resolveTargetBudgetForLfaProject } from '@/lib/budget/targetBudget';
import { useOrgRole } from '@/hooks/useOrgRole';
import CompletionClaimReviewDialog from '@/components/verification/CompletionClaimReviewDialog';

type MealTab = 'control-center' | 'deliverables' | 'milestones' | 'evidence' | 'activity';

const TABS: { key: MealTab; label: string }[] = [
  { key: 'control-center', label: 'Control Center' },
  { key: 'deliverables', label: 'Deliverables' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'evidence', label: 'Evidence & Verification' },
  { key: 'activity', label: 'Activity Log' },
];

const EVENT_LABELS: Record<string, string> = {
  project_created: 'Proyek dibuat',
  objective_created: 'Objective dibuat',
  objective_updated: 'Objective diperbarui',
  objective_reordered: 'Objective diurutkan ulang',
  objective_archived: 'Objective diarsipkan',
  objective_restored: 'Objective dikembalikan',
  stage_created: 'Stage dibuat',
  stage_updated: 'Stage diperbarui',
  stage_reordered: 'Stage diurutkan ulang',
  stage_status_changed: 'Status Stage berubah',
  stage_archived: 'Stage diarsipkan',
  stage_restored: 'Stage dikembalikan',
  wbs_stage_assigned: 'WBS ditautkan ke Stage',
  wbs_stage_unassigned: 'Tautan WBS ke Stage dilepas',
  wbs_people_changed: 'PIC/Reviewer WBS berubah',
  wbs_status_changed: 'Status WBS berubah',
  meal_context_changed: 'Context indikator MEAL diperbarui',
  deliverable_created: 'Deliverable dibuat',
  deliverable_status_changed: 'Status Deliverable berubah',
  deliverable_archived: 'Deliverable diarsipkan',
  deliverable_stage_assigned: 'Deliverable ditautkan ke Stage',
  deliverable_stage_unassigned: 'Tautan Deliverable ke Stage dilepas',
};

const ENTITY_LABELS: Record<string, string> = {
  project: 'Proyek',
  objective: 'Objective',
  stage: 'Stage',
  wbs_item: 'WBS',
  meal_item: 'MEAL',
  deliverable: 'Deliverable',
};

function formatIDR(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function ControlCenterTab({ projectId, orgId }: { projectId: string; orgId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monitoring, setMonitoring] = useState<MonitoringOutput | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stagesRes, wbsRes, budgetRes, delivRes, claimsRes, evidenceRes, eventsRes] = await Promise.all([
        (supabase as any).from('project_stages').select('id, title, status, planned_start_date, planned_end_date').eq('project_id', projectId),
        (supabase as any).from('lfa_wbs_items').select('id, level, parent_id, stage_id, name, status, progress_percent, pic, start_month, duration_weeks').eq('lfa_project_id', projectId),
        supabase.from('lfa_budget_items').select('id, wbs_item_id, volume, unit_price_idr, actual_amount_idr, cost_category').eq('lfa_project_id', projectId),
        (supabase as any).from('project_deliverables').select('id, name as title, status, due_date as target_date').eq('project_id', projectId).is('archived_at', null),
        supabase.from('wbs_completion_claims').select('id, wbs_item_id, status, claimed_progress').eq('lfa_project_id', projectId),
        supabase.from('wbs_completion_evidence').select('id, claim_id').not('claim_id', 'is', null),
        (supabase as any).from('project_activity_events').select('entity_type, entity_id, event_type, created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(50),
      ]);

      if (stagesRes.error) throw stagesRes.error;
      if (wbsRes.error) throw wbsRes.error;
      if (budgetRes.error) throw budgetRes.error;
      if (claimsRes.error) throw claimsRes.error;
      if (evidenceRes.error) throw evidenceRes.error;
      if (eventsRes.error) throw eventsRes.error;

      const stages = (stagesRes.data || []).map((s: any) => ({
        id: s.id,
        title: s.title || '',
        status: s.status || 'not_started',
        plannedStartDate: s.planned_start_date,
        plannedEndDate: s.planned_end_date,
        progress: 0,
      }));

      const wbsItems: WbsSnapshot[] = (wbsRes.data || []).map((w: any) => ({
        id: w.id,
        level: w.level || 1,
        parentId: w.parent_id,
        name: w.name || '',
        status: w.status || 'not_started',
        progress: w.progress_percent ?? 0,
        pic: w.pic,
        startMonth: w.start_month || 1,
        durationWeeks: w.duration_weeks || 1,
        stageId: w.stage_id,
        blockedReason: w.blocked_reason,
      }));

      const budgetItems: BudgetItemInput[] = (budgetRes.data || []).map((b: any) => ({
        id: b.id,
        wbs_item_id: b.wbs_item_id,
        volume: b.volume,
        unit_price_idr: b.unit_price_idr,
        actual_amount_idr: b.actual_amount_idr,
        cost_category: b.cost_category,
      }));

      const targetBudget = await resolveTargetBudgetForLfaProject(supabase as any, projectId);

      const budgetSnapshot = computeBudgetSnapshot({
        targetBudget,
        budgetItems,
        durationMonths: 12,
      });

      const deliverables: DeliverableSnapshot[] = (delivRes.data || []).map((d: any) => ({
        id: d.id,
        title: d.title || d.name || '',
        status: d.status || 'not_started',
        stageId: null,
        targetDate: d.target_date || d.due_date || null,
      }));

      const claims: ClaimSnapshot[] = (claimsRes.data || []).map((c: any) => ({
        id: c.id,
        wbsItemId: c.wbs_item_id,
        status: c.status,
        claimedProgress: c.claimed_progress ?? 0,
      }));

      const evidence: EvidenceSnapshot[] = (evidenceRes.data || []).map((e: any) => ({
        id: e.id,
        claimId: e.claim_id,
      }));

      const events: ActivityEvent[] = (eventsRes.data || []).map((ev: any) => ({
        entityType: ev.entity_type,
        entityId: ev.entity_id,
        eventType: ev.event_type,
        createdAt: ev.created_at,
      }));

      const result = computeMonitoring({
        stages,
        wbsItems,
        budget: budgetSnapshot,
        deliverables,
        claims,
        evidence,
        events,
        budgetedActivityIds: new Set(
          budgetItems
            .filter((b) => b.wbs_item_id)
            .map((b) => {
              let cur = wbsItems.find((w) => w.id === b.wbs_item_id);
              for (let g = 0; g < 10 && cur; g++) {
                if (cur.level === 2) return cur.id;
                if (!cur.parentId) break;
                cur = wbsItems.find((w) => w.id === cur!.parentId);
              }
              return null;
            })
            .filter(Boolean) as string[],
        ),
      });

      setMonitoring(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !monitoring) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-4 text-sm text-destructive">{error || 'Gagal memuat data.'}</CardContent>
      </Card>
    );
  }

  const m = monitoring;

  return (
    <div className="space-y-6">
      {m.warnings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
              <AlertTriangle className="h-4 w-4" />
              Peringatan
            </div>
            <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
              {m.warnings.map((w, i) => <li key={i}>&middot; {w}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Jadwal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stage melewati tenggat</span>
              <Badge variant={m.schedule.stageOverdue > 0 ? 'destructive' : 'outline'}>{m.schedule.stageOverdue}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Activity melewati tenggat</span>
              <Badge variant={m.schedule.activityOverdue > 0 ? 'destructive' : 'outline'}>{m.schedule.activityOverdue}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Item terhambat</span>
              <Badge variant={m.schedule.blockedWork > 0 ? 'destructive' : 'outline'}>{m.schedule.blockedWork}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tenggat mendatang (14 hari)</span>
              <span className="font-semibold">{m.schedule.upcomingDeadlines}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Eksekusi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Progres Proyek</span>
              <span className="font-bold">{m.execution.projectProgress}%</span>
            </div>
            <Progress value={m.execution.projectProgress} className="h-1.5 mt-1 mb-2" />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Activity selesai</span>
              <span>{m.execution.completedActivities} / {m.execution.totalActivities}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Task selesai</span>
              <span>{m.execution.completedTasks} / {m.execution.totalTasks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tanpa PIC</span>
              <Badge variant={m.execution.workWithoutPIC > 0 ? 'destructive' : 'outline'}>{m.execution.workWithoutPIC}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              Anggaran
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target</span>
              <span className="font-semibold">{m.budget.targetBudget ? formatIDR(m.budget.targetBudget) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Detailed</span>
              <span className="font-semibold">{formatIDR(m.budget.detailedBudget)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Coverage</span>
              <span className="font-semibold">{m.budget.coveragePercent.toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Utilisasi</span>
              <span className="font-semibold">{m.budget.utilizationPercent.toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Deliverables
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Planned</span>
              <span>{m.deliverables.planned}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">In Progress</span>
              <span>{m.deliverables.inProgress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted</span>
              <span>{m.deliverables.submitted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Accepted</span>
              <span>{m.deliverables.accepted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Overdue</span>
              <Badge variant={m.deliverables.overdue > 0 ? 'destructive' : 'outline'}>{m.deliverables.overdue}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              Bukti & Verifikasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Klaim</span>
              <span>{m.evidence.totalClaims}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Menunggu Verifikasi</span>
              <Badge variant={m.evidence.pendingVerification > 0 ? 'default' : 'outline'}>{m.evidence.pendingVerification}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Terverifikasi</span>
              <span className="text-emerald-600 font-semibold">{m.evidence.verified}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ditolak</span>
              <Badge variant={m.evidence.rejected > 0 ? 'destructive' : 'outline'}>{m.evidence.rejected}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Bukti</span>
              <span>{m.evidence.evidenceCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tanpa PIC</span>
              <Badge variant={m.assignment.withoutPIC > 0 ? 'destructive' : 'outline'}>{m.assignment.withoutPIC}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Activity tanpa PIC</span>
              <span>{m.assignment.activitiesWithoutPIC}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Task/Subtask tanpa PIC</span>
              <span>{m.assignment.tasksWithoutPIC}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Terblokir</span>
              <Badge variant={m.assignment.blocked > 0 ? 'destructive' : 'outline'}>{m.assignment.blocked}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jatuh tempo 7 hari</span>
              <span>{m.assignment.dueWithin7Days}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Menunggu verifikasi</span>
              <span>{m.assignment.submittedForVerification}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              Aktivitas Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs max-h-48 overflow-y-auto">
            {m.recentEvents.slice(0, 8).map((ev, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <Badge variant="outline" className="text-[8px] py-0 h-4 shrink-0">
                  {ENTITY_LABELS[ev.entityType] || ev.entityType}
                </Badge>
                <span>{EVENT_LABELS[ev.eventType] || ev.eventType}</span>
                <span className="text-muted-foreground ml-auto">
                  {new Date(ev.createdAt).toLocaleDateString('id-ID')}
                </span>
              </div>
            ))}
            {m.recentEvents.length === 0 && (
              <span className="text-muted-foreground italic">Belum ada aktivitas tercatat.</span>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DeliverablesTab({ projectId }: { projectId: string }) {
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [activityMap, setActivityMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [delivRes, linkRes, wbsRes] = await Promise.all([
        (supabase as any).from('project_deliverables').select('id, name, description, status, due_date, owner').eq('project_id', projectId).is('archived_at', null).order('created_at', { ascending: false }),
        (supabase as any).from('project_deliverable_activities').select('deliverable_id, wbs_item_id'),
        (supabase as any).from('lfa_wbs_items').select('id, name, level').eq('lfa_project_id', projectId),
      ]);
      setDeliverables(delivRes.data || []);
      if (linkRes.data && wbsRes.data) {
        const wbsNames = new Map(wbsRes.data.map((w: any) => [w.id, w.name]));
        const map: Record<string, string[]> = {};
        for (const link of linkRes.data) {
          if (!map[link.deliverable_id]) map[link.deliverable_id] = [];
          map[link.deliverable_id].push(wbsNames.get(link.wbs_item_id) || link.wbs_item_id);
        }
        setActivityMap(map);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  const active = deliverables.filter((d: any) => !d.archived_at);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {active.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <CardTitle className="text-lg">Belum ada Deliverable</CardTitle>
            <CardDescription>
              Deliverable adalah output dari Activity yang selesai.<br />
              Buka <strong>Work Plan → Activity → Rincian → Buat Deliverable</strong>
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        active.map((d: any) => (
          <Card key={d.id}>
            <CardContent className="space-y-2 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{d.name}</CardTitle>
                  <Badge variant={d.status === 'approved' ? 'default' : d.status === 'submitted' ? 'outline' : d.status === 'in_progress' ? 'default' : 'secondary'}>
                    {d.status === 'approved' ? 'Disetujui' : d.status === 'submitted' ? 'Submitted' : d.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                  </Badge>
                </div>
                {d.due_date && <span className="text-xs text-muted-foreground">Due: {d.due_date}</span>}
              </div>
              {d.description && <p className="text-sm text-muted-foreground">{d.description}</p>}
              {d.owner && <p className="text-xs text-muted-foreground">Owner: {d.owner}</p>}
              {(activityMap[d.id]?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {activityMap[d.id].map((name: string) => (
                    <Badge key={name} variant="outline" className="text-[9px]">{name}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function MilestonesTab({ projectId }: { projectId: string }) {
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from('project_milestones')
        .select('id, name, target_date, status, notes')
        .eq('project_id', projectId)
        .is('archived_at', null)
        .order('target_date', { ascending: true, nullsFirst: false });
      setMilestones(data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const achieved = milestones.filter((m: any) => m.status === 'achieved');
  const notAchieved = milestones.filter((m: any) => m.status !== 'achieved');
  const delayed = notAchieved.filter((m: any) => m.target_date && new Date(m.target_date) < new Date());
  const upcoming = notAchieved.filter((m: any) => !m.target_date || new Date(m.target_date) >= new Date());

  const renderSection = (title: string, items: any[], variant: 'default' | 'secondary' | 'destructive') => (
    <div className="space-y-2" key={title}>
      <h3 className="text-sm font-semibold text-muted-foreground">{title} ({items.length})</h3>
      {items.map((m: any) => (
        <Card key={m.id}>
          <CardContent className="flex items-start justify-between gap-3 py-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{m.name}</CardTitle>
                <Badge variant={variant}>
                  {variant === 'destructive' ? 'Terlambat' : variant === 'default' ? 'Tercapai' : 'Upcoming'}
                </Badge>
              </div>
              {m.target_date && <p className="text-xs text-muted-foreground">Target: {m.target_date}</p>}
              {m.notes && <p className="text-sm text-muted-foreground">{m.notes}</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {milestones.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <CardTitle className="text-lg">Belum ada Milestone</CardTitle>
            <CardDescription>
              Milestone adalah checkpoint tata kelola proyek.<br />
              Owner dapat menambahkan di halaman Milestones.
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <>
          {delayed.length > 0 && renderSection('Terlambat', delayed, 'destructive')}
          {upcoming.length > 0 && renderSection('Upcoming', upcoming, 'secondary')}
          {achieved.length > 0 && renderSection('Tercapai', achieved, 'default')}
        </>
      )}
    </div>
  );
}

function EvidenceVerificationTab({ projectId }: { projectId: string }) {
  const { role: orgRole } = useOrgRole();
  const isOwner = orgRole === 'owner';
  const { user } = { user: { id: null } }; // fallback — auth is handled by backend
  const [claims, setClaims] = useState<any[]>([]);
  const [evidenceMap, setEvidenceMap] = useState<Record<string, any[]>>({});
  const [wbsMap, setWbsMap] = useState<Record<string, { id: string; name: string; level: number }>>({});
  const [submitterMap, setSubmitterMap] = useState<Record<string, string>>({});
  const [reviewerMap, setReviewerMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('submitted');
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: claimsErr } = await supabase
        .from('wbs_completion_claims')
        .select('id, wbs_item_id, claim_note, claimed_progress, status, submitted_at, review_note, claimed_by, reviewed_by, reviewed_at, facts, lessons_learned, observations, recommendations, next_action')
        .eq('lfa_project_id', projectId)
        .order('created_at', { ascending: false });
      if (claimsErr) throw claimsErr;
      const rows = (data || []) as any[];
      setClaims(rows);

      const claimIds = rows.map((c: any) => c.id);
      if (claimIds.length > 0) {
        const { data: evData } = await supabase
          .from('wbs_completion_evidence')
          .select('id, claim_id, evidence_type, title, storage_reference, uploaded_at')
          .in('claim_id', claimIds)
          .order('uploaded_at', { ascending: true });
        const evMap: Record<string, any[]> = {};
        for (const ev of (evData || [])) {
          if (!evMap[ev.claim_id]) evMap[ev.claim_id] = [];
          evMap[ev.claim_id].push(ev);
        }
        setEvidenceMap(evMap);
      }

      const wbsIds = Array.from(new Set(rows.map((c: any) => c.wbs_item_id).filter(Boolean)));
      if (wbsIds.length > 0) {
        const { data: wbsData } = await supabase
          .from('lfa_wbs_items')
          .select('id, name, level')
          .in('id', wbsIds);
        const wm: Record<string, { id: string; name: string; level: number }> = {};
        for (const w of (wbsData || [])) {
          wm[w.id] = { id: w.id, name: w.name || 'Tanpa Nama', level: w.level || 2 };
        }
        setWbsMap(wm);
      }

      const userIds = Array.from(new Set([
        ...rows.map((c: any) => c.claimed_by).filter(Boolean),
        ...rows.map((c: any) => c.reviewed_by).filter(Boolean),
      ]));
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        const sm: Record<string, string> = {};
        for (const p of (profiles || [])) sm[p.id] = p.full_name || p.id;
        setSubmitterMap(sm);
        setReviewerMap(sm);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat antrean verifikasi.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  const getClaimBadge = (status: string) => {
    switch (status) {
      case 'verified': return <Badge variant="default" className="bg-emerald-100 text-emerald-800 border-emerald-300">Terverifikasi</Badge>;
      case 'submitted': return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">Menunggu Verifikasi</Badge>;
      case 'needs_revision': return <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300">Perlu Perbaikan</Badge>;
      case 'rejected': return <Badge variant="destructive">Ditolak</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLevelBadge = (level: number) => {
    switch (level) {
      case 2: return <Badge variant="outline" className="text-[8px] py-0 h-4 bg-emerald-50 text-emerald-700">Activity</Badge>;
      case 3: return <Badge variant="outline" className="text-[8px] py-0 h-4 bg-indigo-50 text-indigo-700">Task</Badge>;
      case 4: return <Badge variant="outline" className="text-[8px] py-0 h-4 bg-slate-100 text-slate-600">Subtask</Badge>;
      default: return null;
    }
  };

  const filtered = claims.filter((c: any) => filter === 'all' ? true : c.status === filter);

  const submittedCount = claims.filter((c: any) => c.status === 'submitted').length;

  const handleReviewed = useCallback(() => {
    void load();
    setDialogOpen(false);
    setSelectedClaim(null);
  }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
  );

  if (error) return (
    <Card className="border-destructive/50"><CardContent className="py-4 text-sm text-destructive">{error}</CardContent></Card>
  );

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border w-fit">
        {[
          { key: 'submitted', label: 'Menunggu Verifikasi' },
          { key: 'needs_revision', label: 'Perlu Revisi' },
          { key: 'verified', label: 'Terverifikasi' },
          { key: 'rejected', label: 'Ditolak' },
          { key: 'all', label: 'Semua' },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1 text-[11px] font-semibold transition-all rounded-md ${
              filter === f.key ? 'bg-white dark:bg-slate-950 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}{f.key === 'submitted' && submittedCount > 0 && <span className="ml-1 text-[9px] bg-amber-500 text-white rounded-full px-1.5 py-0">{submittedCount}</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <ClipboardCheck className="h-10 w-10 text-muted-foreground" />
            <CardTitle className="text-lg">
              {filter === 'submitted' ? 'Tidak ada klaim yang menunggu verifikasi.' : 'Belum ada klaim'}
            </CardTitle>
            <CardDescription>Klaim penyelesaian dibuat dari Activity di Work Plan.</CardDescription>
          </CardContent>
        </Card>
      ) : (
        filtered.map((c: any) => {
          const wbs = wbsMap[c.wbs_item_id];
          const evCount = (evidenceMap[c.id] || []).length;
          return (
            <Card key={c.id} className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => { setSelectedClaim(c); setDialogOpen(true); }}>
              <CardContent className="space-y-2 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {wbs && getLevelBadge(wbs.level)}
                    <span className="text-sm font-semibold truncate">{wbs?.name || c.wbs_item_id?.slice(0, 8) || 'Claim'}</span>
                    {getClaimBadge(c.status)}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {c.submitted_at ? new Date(c.submitted_at).toLocaleDateString('id-ID') : '-'}
                  </span>
                </div>
                {c.claim_note && <p className="text-xs text-muted-foreground line-clamp-2">{c.claim_note}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Pengaju: {submitterMap[c.claimed_by] || c.claimed_by?.slice(0, 8) || '—'}</span>
                  <span>Progress: {c.claimed_progress || 0}%</span>
                  {evCount > 0 && <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{evCount} bukti</span>}
                </div>
                {c.review_note && <p className="text-xs italic text-orange-700 dark:text-orange-400 line-clamp-1">Catatan: {c.review_note}</p>}
              </CardContent>
            </Card>
          );
        })
      )}

      {selectedClaim && (
        <CompletionClaimReviewDialog
          open={dialogOpen}
          onOpenChange={(open) => { if (!open) { setDialogOpen(false); setSelectedClaim(null); } }}
          projectId={projectId}
          claim={{
            id: selectedClaim.id,
            wbsItemId: selectedClaim.wbs_item_id,
            claimNote: selectedClaim.claim_note,
            claimedProgress: selectedClaim.claimed_progress || 0,
            status: selectedClaim.status,
            submittedAt: selectedClaim.submitted_at,
            reviewNote: selectedClaim.review_note,
            claimedBy: selectedClaim.claimed_by,
            reviewedBy: selectedClaim.reviewed_by,
            reviewedAt: selectedClaim.reviewed_at,
            facts: selectedClaim.facts,
            lessonsLearned: selectedClaim.lessons_learned,
            observations: selectedClaim.observations,
            recommendations: selectedClaim.recommendations,
            nextAction: selectedClaim.next_action,
          }}
          wbsContext={{
            id: selectedClaim.wbs_item_id,
            name: wbsMap[selectedClaim.wbs_item_id]?.name || selectedClaim.wbs_item_id?.slice(0, 8) || '—',
            level: wbsMap[selectedClaim.wbs_item_id]?.level || 2,
            stageTitle: null,
          }}
          evidence={(evidenceMap[selectedClaim.id] || []).map((ev: any) => ({
            id: ev.id,
            evidence_type: ev.evidence_type,
            title: ev.title,
            description: ev.description,
            storage_reference: ev.storage_reference,
            uploaded_at: ev.uploaded_at,
          }))}
          submitterName={submitterMap[selectedClaim.claimed_by] || null}
          reviewerName={reviewerMap[selectedClaim.reviewed_by] || null}
          isOwner={isOwner}
          currentUserId={user?.id || null}
          onReviewed={handleReviewed}
        />
      )}
    </div>
  );
}

function ActivityLogTab({ projectId }: { projectId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    (supabase as any)
      .from('project_activity_events')
      .select('id, entity_type, entity_id, event_type, safe_metadata, actor_id, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(async ({ data, error }: any) => {
        if (error) { setLoading(false); return; }
        const rows = (data || []) as any[];
        setEvents(rows);
        const ids = Array.from(new Set(rows.map((r: any) => r.actor_id)));
        if (ids.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', ids);
          const map: Record<string, string> = {};
          for (const p of profiles || []) map[p.id] = p.full_name || p.id;
          setNames(map);
        }
        setLoading(false);
      });
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <History className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada aktivitas tercatat.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((ev: any) => (
        <Card key={ev.id}>
          <CardContent className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3">
              <Badge variant="outline">{ENTITY_LABELS[ev.entity_type] || ev.entity_type}</Badge>
              <div>
                <p className="text-sm font-medium">{EVENT_LABELS[ev.event_type] || ev.event_type}</p>
                <p className="text-xs text-muted-foreground">
                  {names[ev.actor_id] || ev.actor_id} · {new Date(ev.created_at).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ProjectMEALPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeTab = (searchParams.get('tab') as MealTab) || 'control-center';

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    supabase
      .from('lfa_projects')
      .select('org_id')
      .eq('id', projectId)
      .single()
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setOrgId(data?.org_id ?? null);
        }
        setLoading(false);
      });
  }, [projectId]);

  const setTab = (tab: MealTab) => {
    setSearchParams({ tab });
  };

  const renderTab = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      );
    }
    if (error || !orgId || !projectId) {
      return (
        <Card className="border-destructive/50">
          <CardContent className="py-4 text-sm text-destructive">{error || 'Proyek tidak ditemukan.'}</CardContent>
        </Card>
      );
    }
    switch (activeTab) {
      case 'control-center':
        return <ControlCenterTab projectId={projectId} orgId={orgId} />;
      case 'deliverables':
        return <DeliverablesTab projectId={projectId} />;
      case 'milestones':
        return <MilestonesTab projectId={projectId} />;
      case 'evidence':
        return <EvidenceVerificationTab projectId={projectId} />;
      case 'activity':
        return <ActivityLogTab projectId={projectId} />;
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-2">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/project-management')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
      </div>

      {projectId && <ProjectWorkspaceNav projectId={projectId} />}

      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            className={`px-3 py-1 text-[11px] font-semibold transition-all rounded-md ${
              activeTab === tab.key
                ? 'bg-white dark:bg-slate-950 text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {renderTab()}
    </div>
  );
}
