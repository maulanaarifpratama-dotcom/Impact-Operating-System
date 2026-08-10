import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  History,
  ClipboardCheck,
  FileText,
  AlertTriangle,
  Wallet,
  Plus,
  Trash2,
  Lightbulb,
  Pencil,
  Search,
  X,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ProjectWorkspaceNav } from '../ProjectWorkspaceNav';
import { useOrgRole } from '@/hooks/useOrgRole';
import { useAuth } from '@/providers/AuthProvider';
import CompletionClaimReviewDialog from '@/components/verification/CompletionClaimReviewDialog';
import {
  isOverdue, isBlocked, getExecutionBucket, getClosureStatus, CLOSED_CLAIM_STATUS,
} from '@/lib/project-management/executionModel';
import { computeBudgetSnapshot, formatIDR, type BudgetItemInput } from '@/lib/budget/budgetModel';
import { resolveTargetBudgetForLfaProject } from '@/lib/budget/targetBudget';
import { getSeverityLabel, getSeverityBadgeClass, SEVERITY_OPTIONS } from '@/lib/project-management/learningModel';
import {
  getInsightTypeLabel, getInsightTypeBadgeClass, getLearningStatusBadgeClass,
  getScopeLabel, canManageLearning, INSIGHT_TYPE_OPTIONS, SCOPE_OPTIONS,
} from '@/lib/project-management/orgLearningModel';
import {
  type EvidenceCandidate, searchEvidenceCandidates, loadProjectEvidenceCandidates, resolveEvidenceCitations,
} from '@/lib/project-management/learningEvidencePicker';
import type {
  ProjectEvaluationFinding, EvaluationFindingSeverity, OrgLearningEntry, LearningInsightType, LearningScope,
} from '@/pages/dashboard/lfa-builder/types';

// PM + MEAL Canonicalization: ACR is the single source of truth. 'activity' stays a valid
// tab (reachable via ?tab=activity from Control Center) but is deliberately left out of the
// primary TABS bar below — it's an audit utility, not a workflow screen. 'milestones' and
// 'evidence' are removed entirely: Evidence & Verification duplicated ACR (folded into the
// ACR tab's status filter), and Milestones duplicated Stage/Timeline/Deliverables progress.
// Evaluation Finding lives inside the ACR tab (Claims/Findings toggle) — the
// smallest existing surface — never its own top-level tab.
//
// MEAL Learning V1 UX correction: Learning IS an organization-level entity
// (org_learning_entries/org_learning_evidence, unchanged) but authoring was
// originally placed only in a top-level sidebar module, forcing users out of
// the project MEAL workflow to create one. This 'learning' tab is the primary
// authoring surface — a project-scoped view over the same org-level data, not
// a second store. The sidebar Learning page remains for cross-project browse/
// search only.
type MealTab = 'control-center' | 'acr' | 'deliverables' | 'learning' | 'activity';

const TABS: { key: MealTab; label: string }[] = [
  { key: 'control-center', label: 'Control Center' },
  { key: 'acr', label: 'ACR' },
  { key: 'deliverables', label: 'Deliverables' },
  { key: 'learning', label: 'Learning' },
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

// Control Center is a project health SUMMARY only — no duplicate ACR
// rendering, no giant multi-domain dashboard. Everything here is either a
// count derived from ACR/Deliverables, or a link out to the screen that
// owns the detail (ACR tab, Audit Log).
function ControlCenterTab({ projectId, onOpenActivityLog, onOpenLearning }: { projectId: string; onOpenActivityLog: () => void; onOpenLearning: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    execution: { open: number; inProgress: number; completed: number; overdue: number; blocked: number };
    acr: { documented: number; closed: number; pendingVerification: number };
    recentLearning: { id: string; name: string; observations: string; date: string | null }[];
    totalOutputs: number;
    finance: { plannedBudget: number; actualCost: number; utilizationPercent: number; hasTargetBudget: boolean };
    relatedLearning: { count: number; items: { id: string; title: string }[] };
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wbsRes, claimsRes, budgetRes, projectRes] = await Promise.all([
        supabase.from('lfa_wbs_items').select('id, status, end_date, blocker_category').eq('lfa_project_id', projectId).eq('level', 2),
        supabase.from('wbs_completion_claims').select('id, wbs_item_id, status, facts, observations, submitted_at').eq('lfa_project_id', projectId),
        supabase.from('lfa_budget_items').select('id, wbs_item_id, volume, unit_price_idr, actual_amount_idr, cost_category').eq('lfa_project_id', projectId),
        supabase.from('lfa_projects').select('duration_months').eq('id', projectId).maybeSingle(),
      ]);
      if (wbsRes.error) throw wbsRes.error;
      if (claimsRes.error) throw claimsRes.error;
      if (budgetRes.error) throw budgetRes.error;

      // Finance card reuses the existing Budget calculation engine verbatim
      // (budgetModel.ts) — no new financial math, per PM-P5A scope.
      const budgetItems = (budgetRes.data || []) as BudgetItemInput[];
      const targetBudget = await resolveTargetBudgetForLfaProject(supabase as any, projectId);
      const durationMonths = (projectRes.data as any)?.duration_months || 12;
      const budgetSnapshot = computeBudgetSnapshot({ targetBudget, budgetItems, durationMonths });

      // Work Plan owns execution status; Overdue/Blocked are derived — all three
      // via the canonical predicates in executionModel.ts, shared with Work Plan and Timeline.
      const activities = (wbsRes.data || []) as any[];
      let execOpen = 0, execInProgress = 0, execCompleted = 0, execOverdue = 0, execBlocked = 0;
      for (const a of activities) {
        const bucket = getExecutionBucket(a.status);
        if (bucket === 'completed') execCompleted++;
        else if (bucket === 'in_progress') execInProgress++;
        else execOpen++;

        if (isOverdue(a)) execOverdue++;
        if (isBlocked(a)) execBlocked++;
      }

      const claims = (claimsRes.data || []) as any[];

      // One active (non-cancelled) claim per Activity — takes the most recent by submitted_at.
      // ACR ownership is separate from execution status: getClosureStatus (executionModel.ts)
      // is the single source for Documented/Closed, shared with Work Plan and the ACR tab.
      const latestByItem = new Map<string, any>();
      for (const c of claims) {
        if (c.status === 'cancelled') continue;
        const existing = latestByItem.get(c.wbs_item_id);
        if (!existing || (c.submitted_at || '') > (existing.submitted_at || '')) {
          latestByItem.set(c.wbs_item_id, c);
        }
      }

      let acrClosed = 0;
      let acrDocumented = 0;
      for (const c of latestByItem.values()) {
        const closure = getClosureStatus(c);
        if (closure === 'closed') acrClosed++;
        else if (closure === 'documented') acrDocumented++;
      }
      const pendingVerification = acrDocumented; // Documented == awaiting Evidence Verification

      // Recent Learning (MEAL-P1, revised per stop-gate review): a derived view
      // over ACR Facts + Observations, not a stored entity. Observations is the
      // primary text; when a claim has no observations but does have Facts,
      // those are summarized instead — no Activity is silently skipped just
      // because its reflection landed in Facts rather than the Notes field.
      const withLearning = claims
        .map((c) => {
          const factsList = (c.facts || []) as { label: string; value: string }[];
          const text = (c.observations && String(c.observations).trim())
            || (factsList.length > 0 ? factsList.map((f) => `${f.label}: ${f.value}`).join('; ') : '');
          return { ...c, learningText: text as string };
        })
        .filter((c) => c.learningText.trim().length > 0);
      const learningItemIds = Array.from(new Set(withLearning.map((c) => c.wbs_item_id)));
      const wbsNames = new Map<string, string>();
      if (learningItemIds.length > 0) {
        const { data: nameRows } = await supabase.from('lfa_wbs_items').select('id, name').in('id', learningItemIds);
        for (const r of (nameRows || [])) wbsNames.set(r.id, r.name || 'Activity');
      }
      const recentLearning = withLearning
        .sort((a, b) => String(b.submitted_at || '').localeCompare(String(a.submitted_at || '')))
        .slice(0, 5)
        .map((c) => ({
          id: c.id as string,
          name: wbsNames.get(c.wbs_item_id) || 'Activity',
          observations: c.learningText,
          date: c.submitted_at as string | null,
        }));

      // Related Learning (MEAL Learning V1): org-level knowledge whose
      // Evidence Base cites this project's Verified ACRs and/or Findings.
      // RLS already restricts to Published entries visible to this org
      // member — no separate visibility check needed here.
      const client = supabase as any;
      const verifiedAcrIds = claims.filter((c) => c.status === CLOSED_CLAIM_STATUS).map((c) => c.id);
      const { data: findingRows } = await client.from('project_evaluation_findings').select('id').eq('project_id', projectId);
      const findingIds = ((findingRows || []) as { id: string }[]).map((f) => f.id);
      let relatedLearning: { id: string; title: string }[] = [];
      let relatedLearningCount = 0;
      if (verifiedAcrIds.length > 0 || findingIds.length > 0) {
        const evidenceQueries = [];
        if (verifiedAcrIds.length > 0) evidenceQueries.push(client.from('org_learning_evidence').select('learning_id').eq('source_type', 'acr').in('source_id', verifiedAcrIds));
        if (findingIds.length > 0) evidenceQueries.push(client.from('org_learning_evidence').select('learning_id').eq('source_type', 'finding').in('source_id', findingIds));
        const evidenceResults = await Promise.all(evidenceQueries);
        const learningIds = Array.from(new Set(evidenceResults.flatMap((r) => ((r.data || []) as { learning_id: string }[]).map((e) => e.learning_id))));
        if (learningIds.length > 0) {
          const { data: learningRows } = await client.from('org_learning_entries').select('id, title, created_at').in('id', learningIds).eq('status', 'published').order('created_at', { ascending: false });
          const lRows = (learningRows || []) as { id: string; title: string; created_at: string }[];
          relatedLearningCount = lRows.length;
          relatedLearning = lRows.slice(0, 3).map((l) => ({ id: l.id, title: l.title }));
        }
      }

      setStats({
        execution: { open: execOpen, inProgress: execInProgress, completed: execCompleted, overdue: execOverdue, blocked: execBlocked },
        acr: { documented: acrDocumented, closed: acrClosed, pendingVerification },
        recentLearning,
        // Deliverable Summary uses the exact same source as the Deliverables page:
        // a Deliverable is a Closed ACR, nothing else — no separate manual record.
        totalOutputs: acrClosed,
        finance: {
          plannedBudget: budgetSnapshot.detailedBudget,
          actualCost: budgetSnapshot.actualRealization,
          utilizationPercent: budgetSnapshot.utilizationPercent,
          hasTargetBudget: budgetSnapshot.hasTargetBudget,
        },
        relatedLearning: { count: relatedLearningCount, items: relatedLearning },
      });
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

  if (error || !stats) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-4 text-sm text-destructive">{error || 'Gagal memuat data.'}</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Work Plan owns execution status — this card never reflects ACR documentation state. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            Activities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Open</span><span className="font-semibold">{stats.execution.open}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">In Progress</span><span className="font-semibold">{stats.execution.inProgress}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span className="font-semibold text-emerald-600">{stats.execution.completed}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Overdue (Terlambat)</span><Badge variant={stats.execution.overdue > 0 ? 'destructive' : 'outline'}>{stats.execution.overdue}</Badge></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Blocked (Terblokir)</span><Badge variant={stats.execution.blocked > 0 ? 'destructive' : 'outline'}>{stats.execution.blocked}</Badge></div>
        </CardContent>
      </Card>

      {/* ACR owns documentation status — never used to determine execution status above. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            ACR
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pending Verification</span>
            <Badge variant={stats.acr.pendingVerification > 0 ? 'default' : 'outline'}>{stats.acr.pendingVerification}</Badge>
          </div>
          <div className="flex justify-between"><span className="text-muted-foreground">Closed ACRs</span><span className="font-semibold text-emerald-600">{stats.acr.closed}</span></div>
        </CardContent>
      </Card>

      {/* Same source as the Deliverables page: a Deliverable IS a Closed ACR — no separate manual record. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Deliverable Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <span className="text-2xl font-bold">{stats.totalOutputs}</span>
          <p className="text-xs text-muted-foreground mt-1">Total Outputs — Activities dengan ACR Closed (Evidence Verified).</p>
        </CardContent>
      </Card>

      {/* Finance: read-only view of the existing budget engine (computeBudgetSnapshot) — no new calculations. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            Finance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          {stats.finance.hasTargetBudget ? (
            <>
              <div className="flex justify-between"><span className="text-muted-foreground">Planned</span><span className="font-semibold">{formatIDR(stats.finance.plannedBudget)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Actual</span><span className="font-semibold">{formatIDR(stats.finance.actualCost)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Budget Utilization</span><span className="font-semibold">{stats.finance.utilizationPercent.toFixed(0)}%</span></div>
            </>
          ) : (
            <span className="text-muted-foreground italic">Belum ada Target Budget untuk proyek ini.</span>
          )}
        </CardContent>
      </Card>

      {/* Related Learning (MEAL Learning V1): read-only teaser that opens the
          in-project Learning tab — that tab, not the org-level Library, is the
          primary authoring/browsing surface for this project's Learning. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Related Learning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs">
          {stats.relatedLearning.count === 0 ? (
            <span className="text-muted-foreground italic">Belum ada Learning terkait proyek ini.</span>
          ) : (
            <>
              <div className="text-muted-foreground">{stats.relatedLearning.count} entri</div>
              {stats.relatedLearning.items.map((l) => (
                <Link key={l.id} to={`/dashboard/learning/${l.id}`} className="block truncate text-primary hover:underline">
                  {l.title}
                </Link>
              ))}
              <button onClick={onOpenLearning} className="inline-block text-[10px] font-semibold text-primary hover:underline pt-1">
                View all →
              </button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="sm:col-span-2 lg:col-span-3">
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            Recent Learning
          </CardTitle>
          <button
            onClick={onOpenActivityLog}
            className="text-[10px] text-primary hover:underline font-semibold"
            data-testid="meal-open-activity-log-link"
          >
            Audit Log (Admin) →
          </button>
        </CardHeader>
        <CardContent className="space-y-2 text-xs max-h-56 overflow-y-auto">
          {stats.recentLearning.length === 0 ? (
            <span className="text-muted-foreground italic">Belum ada Notes / Observations tercatat dari ACR.</span>
          ) : (
            stats.recentLearning.map((r) => (
              <div key={r.id} className="border-b last:border-0 pb-2 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold truncate">{r.name}</span>
                  {r.date && <span className="text-muted-foreground shrink-0">{new Date(r.date).toLocaleDateString('id-ID')}</span>}
                </div>
                <p className="text-muted-foreground line-clamp-2">{r.observations}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface DeliverableOutput {
  id: string;
  activityName: string;
  stageName: string | null;
  pic: string | null;
  evidenceCount: number;
  completionDate: string | null;
}

// Deliverables = outputs derived from Closed ACRs. No manual creation, no
// linking, no conversion — an Activity's output appears here automatically
// the moment its ACR's Evidence Verification is Sufficient (status='verified').
// Canonical rule: ACR Open or Documented (submitted, not yet verified) do
// NOT qualify — only a verified ACR represents a confirmed output.
function DeliverablesTab({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true);
  const [outputs, setOutputs] = useState<DeliverableOutput[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: claims } = await supabase
        .from('wbs_completion_claims')
        .select('id, wbs_item_id, reviewed_at, submitted_at')
        .eq('lfa_project_id', projectId)
        .eq('status', CLOSED_CLAIM_STATUS)
        .order('reviewed_at', { ascending: false });

      const claimRows = (claims || []) as any[];
      if (claimRows.length === 0) {
        setOutputs([]);
        return;
      }

      const wbsIds = Array.from(new Set(claimRows.map((c) => c.wbs_item_id).filter(Boolean)));
      const { data: wbsItems } = await supabase
        .from('lfa_wbs_items')
        .select('id, name, pic, parent_id')
        .in('id', wbsIds);
      const wbsById = new Map((wbsItems || []).map((w: any) => [w.id, w]));

      // Stage is assigned on the level-1 parent (same convention as Work Plan's Stage Picker).
      const parentIds = Array.from(new Set((wbsItems || []).map((w: any) => w.parent_id).filter(Boolean)));
      const stageNameByActivityId = new Map<string, string | null>();
      if (parentIds.length > 0) {
        const { data: parents } = await supabase.from('lfa_wbs_items').select('id, stage_id').in('id', parentIds);
        const stageIdByParent = new Map((parents || []).map((p: any) => [p.id, p.stage_id]));
        const stageIds = Array.from(new Set(Array.from(stageIdByParent.values()).filter(Boolean))) as string[];
        let stageTitleById = new Map<string, string>();
        if (stageIds.length > 0) {
          const { data: stages } = await (supabase as any).from('project_stages').select('id, title').in('id', stageIds);
          stageTitleById = new Map((stages || []).map((s: any) => [s.id, s.title]));
        }
        for (const w of (wbsItems || [])) {
          const stageId = w.parent_id ? stageIdByParent.get(w.parent_id) : null;
          stageNameByActivityId.set(w.id, stageId ? (stageTitleById.get(stageId) || null) : null);
        }
      }

      const claimIds = claimRows.map((c) => c.id);
      const { data: evidenceRows } = await supabase
        .from('wbs_completion_evidence')
        .select('id, claim_id')
        .in('claim_id', claimIds);
      const evidenceCountByClaim = new Map<string, number>();
      for (const e of ((evidenceRows || []) as any[])) {
        evidenceCountByClaim.set(e.claim_id, (evidenceCountByClaim.get(e.claim_id) || 0) + 1);
      }

      setOutputs(claimRows.map((c) => {
        const wbs = wbsById.get(c.wbs_item_id);
        return {
          id: c.id as string,
          activityName: wbs?.name || 'Activity',
          stageName: stageNameByActivityId.get(c.wbs_item_id) || null,
          pic: wbs?.pic || null,
          evidenceCount: evidenceCountByClaim.get(c.id) || 0,
          completionDate: c.reviewed_at || c.submitted_at || null,
        };
      }));
    } catch {
      setOutputs([]);
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

  if (outputs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <CardTitle className="text-lg">Belum ada output proyek.</CardTitle>
          <CardDescription>
            Output akan muncul otomatis setelah Activity memiliki ACR yang diverifikasi.
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {outputs.map((o) => (
        <Card key={o.id}>
          <CardContent className="space-y-1.5 py-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">{o.activityName}</CardTitle>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Closed</Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {o.stageName && <span>Stage: {o.stageName}</span>}
              {o.pic && <span>PIC: {o.pic}</span>}
              <span>Verification: Verified</span>
              <span>Evidence: {o.evidenceCount}</span>
              {o.completionDate && (
                <span>Completed: {new Date(o.completionDate).toLocaleDateString('id-ID')}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AcrTab({ projectId }: { projectId: string }) {
  const [searchParams] = useSearchParams();
  const { role: orgRole, canDelete: isReviewer } = useOrgRole();
  const isOwner = orgRole === 'owner';
  const { user } = { user: { id: null } }; // fallback — auth is handled by backend
  const { user: authUser } = useAuth(); // real user id, needed for Evaluation Finding created_by
  const { toast } = useToast();
  const [view, setView] = useState<'claims' | 'findings'>(() => {
    const v = searchParams.get('view');
    return v === 'findings' ? 'findings' : 'claims';
  });
  const [claims, setClaims] = useState<any[]>([]);
  const [evidenceMap, setEvidenceMap] = useState<Record<string, any[]>>({});
  const [wbsMap, setWbsMap] = useState<Record<string, { id: string; name: string; level: number }>>({});
  const [submitterMap, setSubmitterMap] = useState<Record<string, string>>({});
  const [reviewerMap, setReviewerMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(() => searchParams.get('claimFilter') || 'submitted');
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Evaluation Findings (MEAL-P1, revised): the one new PM+MEAL entity —
  // fewer, formal, owner/admin-only judgments referencing ACR Evidence/
  // Activity by id. Lives here, not in a separate top-level tab, because ACR
  // is the smallest existing surface where evidence-based review already
  // happens. No Deliverable reference (PM+MEAL V1 debt closure, Task 3): a
  // Deliverable is an Activity whose ACR reached Closed, not a stored
  // entity — wbs_item_id already covers that.
  const [evidenceOptions, setEvidenceOptions] = useState<{ id: string; wbsItemId: string | null; label: string }[]>([]);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [findings, setFindings] = useState<ProjectEvaluationFinding[]>([]);
  const [findingsLoading, setFindingsLoading] = useState(true);
  const [findingDialogOpen, setFindingDialogOpen] = useState(false);
  const [findingTitle, setFindingTitle] = useState('');
  const [findingText, setFindingText] = useState('');
  const [findingSeverity, setFindingSeverity] = useState<EvaluationFindingSeverity>('minor');
  const [findingRecommendation, setFindingRecommendation] = useState('');
  const [findingActivityId, setFindingActivityId] = useState('');
  const [findingEvidenceId, setFindingEvidenceId] = useState('');
  const [savingFinding, setSavingFinding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: claimsErr } = await supabase
        .from('wbs_completion_claims')
        .select('id, wbs_item_id, claim_note, claimed_progress, status, submitted_at, review_note, claimed_by, reviewed_by, reviewed_at, facts, observations')
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

  const loadFindings = useCallback(async () => {
    setFindingsLoading(true);
    const client = supabase as any;
    const { data, error: findingsErr } = await client
      .from('project_evaluation_findings')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (!findingsErr) setFindings((data || []) as ProjectEvaluationFinding[]);
    setFindingsLoading(false);
  }, [projectId]);

  useEffect(() => { void loadFindings(); }, [loadFindings]);

  // Evidence options derive from the Claims already loaded for this tab —
  // Findings reference the same wbs_completion_evidence rows, never a copy.
  useEffect(() => {
    if (claims.length === 0) { setEvidenceOptions([]); return; }
    const options: { id: string; wbsItemId: string | null; label: string }[] = [];
    for (const c of claims) {
      const wbsItemId = c.wbs_item_id || null;
      const activityName = wbsItemId ? (wbsMap[wbsItemId]?.name || 'Activity') : 'Activity';
      for (const ev of (evidenceMap[c.id] || [])) {
        options.push({ id: ev.id, wbsItemId, label: `${activityName} — ${ev.title || 'Bukti tanpa judul'}` });
      }
    }
    setEvidenceOptions(options);
  }, [claims, evidenceMap, wbsMap]);

  useEffect(() => {
    const creatorIds = Array.from(new Set(findings.map((f) => f.created_by).filter(Boolean)));
    if (creatorIds.length === 0) return;
    supabase.from('profiles').select('id, full_name').in('id', creatorIds).then(({ data }) => {
      const names: Record<string, string> = {};
      for (const p of ((data || []) as { id: string; full_name: string | null }[])) names[p.id] = p.full_name || p.id;
      setCreatorNames(names);
    });
  }, [findings]);

  const resetFindingForm = () => {
    setFindingTitle('');
    setFindingText('');
    setFindingSeverity('minor');
    setFindingRecommendation('');
    setFindingActivityId('');
    setFindingEvidenceId('');
  };

  const handleCreateFinding = async () => {
    if (!findingTitle.trim() || !findingText.trim() || !authUser?.id) return;
    setSavingFinding(true);
    try {
      const { data: project } = await supabase.from('lfa_projects').select('org_id').eq('id', projectId).single();
      const client = supabase as any;
      const { error: insertErr } = await client.from('project_evaluation_findings').insert({
        org_id: project?.org_id,
        project_id: projectId,
        title: findingTitle.trim(),
        finding: findingText.trim(),
        severity: findingSeverity,
        recommendation: findingRecommendation.trim() || null,
        wbs_item_id: findingActivityId || null,
        evidence_id: findingEvidenceId || null,
        created_by: authUser.id,
      });
      if (insertErr) throw insertErr;
      toast({ title: 'Evaluation Finding ditambahkan' });
      setFindingDialogOpen(false);
      resetFindingForm();
      void loadFindings();
    } catch (err) {
      toast({ title: 'Gagal menyimpan Evaluation Finding', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSavingFinding(false);
    }
  };

  const handleDeleteFinding = async (id: string) => {
    const client = supabase as any;
    const { error: deleteErr } = await client.from('project_evaluation_findings').delete().eq('id', id);
    if (deleteErr) {
      toast({ title: 'Gagal menghapus Evaluation Finding', description: deleteErr.message, variant: 'destructive' });
    } else {
      void loadFindings();
    }
  };

  const filteredEvidenceOptions = findingActivityId
    ? evidenceOptions.filter((e) => e.wbsItemId === findingActivityId)
    : evidenceOptions;

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

  const activityOptions = Object.values(wbsMap);

  return (
    <div className="space-y-3">
      {/* Claims/Findings — Evaluation Finding lives inside ACR (the smallest existing
          surface for evidence-based review), not a separate top-level tab. */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border w-fit">
          {[
            { key: 'claims' as const, label: 'Claims' },
            { key: 'findings' as const, label: 'Findings' },
          ].map((v) => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`px-3 py-1 text-[11px] font-semibold transition-all rounded-md ${
                view === v.key ? 'bg-white dark:bg-slate-950 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        {view === 'findings' && isReviewer && (
          <Button size="sm" onClick={() => { resetFindingForm(); setFindingDialogOpen(true); }}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Finding
          </Button>
        )}
      </div>

      {view === 'claims' && (
      <>
      {/* Filter tabs — matches the two-action Evidence Verification model (Sufficient / Return For More Evidence) */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border w-fit">
        {[
          { key: 'submitted', label: 'Pending Verification' },
          { key: 'verified', label: 'Verified' },
          { key: 'needs_revision', label: 'Returned' },
          { key: 'all', label: 'All' },
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
            <CardDescription>ACR dibuat dari Activity di Work Plan.</CardDescription>
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
            observations: selectedClaim.observations,
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
      </>
      )}

      {view === 'findings' && (
        findingsLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : findings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <AlertTriangle className="h-10 w-10 text-muted-foreground" />
              <CardTitle className="text-lg">Belum ada Evaluation Finding.</CardTitle>
              <CardDescription>
                {isReviewer
                  ? 'Judgment formal dan periodik — dibuat oleh Owner/Admin, merujuk Evidence/Activity dari ACR.'
                  : 'Evaluation Finding dibuat oleh Owner/Admin sebagai judgment formal dan periodik.'}
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {findings.map((f) => (
              <Card key={f.id}>
                <CardContent className="space-y-1.5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <CardTitle className="text-base truncate">{f.title}</CardTitle>
                      <Badge variant="outline" className={`text-[9px] py-0 h-4 ${getSeverityBadgeClass(f.severity)}`}>
                        {getSeverityLabel(f.severity)}
                      </Badge>
                    </div>
                    {isReviewer && (
                      <button
                        onClick={() => handleDeleteFinding(f.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        title="Hapus"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{f.finding}</p>
                  {f.recommendation && (
                    <p className="text-xs italic text-emerald-700 dark:text-emerald-400">Rekomendasi: {f.recommendation}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                    {f.wbs_item_id && wbsMap[f.wbs_item_id] && <span>Activity: {wbsMap[f.wbs_item_id].name}</span>}
                    {f.evidence_id && <span>Evidence: terlampir</span>}
                    <span>Oleh: {creatorNames[f.created_by] || '—'}</span>
                    {f.created_at && <span>{new Date(f.created_at).toLocaleDateString('id-ID')}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      <Dialog open={findingDialogOpen} onOpenChange={setFindingDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Evaluation Finding</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={findingTitle} onChange={(e) => setFindingTitle(e.target.value)} placeholder="Judul singkat" />
            </div>
            <div className="space-y-1.5">
              <Label>Finding</Label>
              <Textarea value={findingText} onChange={(e) => setFindingText(e.target.value)} placeholder="Apa yang dinilai/ditemukan?" rows={4} />
            </div>
            <div className="space-y-1.5">
              <Label>Severity</Label>
              <Select value={findingSeverity} onValueChange={(v) => setFindingSeverity(v as EvaluationFindingSeverity)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.emoji} {opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Related Activity (optional)</Label>
              <Select value={findingActivityId || '__none__'} onValueChange={(v) => { setFindingActivityId(v === '__none__' ? '' : v); setFindingEvidenceId(''); }}>
                <SelectTrigger><SelectValue placeholder="Tidak terkait Activity tertentu" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Tidak ada —</SelectItem>
                  {activityOptions.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Related Evidence (optional)</Label>
              <Select value={findingEvidenceId || '__none__'} onValueChange={(v) => setFindingEvidenceId(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Tidak melampirkan bukti ACR" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Tidak ada —</SelectItem>
                  {filteredEvidenceOptions.map((e) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Recommendation (optional)</Label>
              <Textarea value={findingRecommendation} onChange={(e) => setFindingRecommendation(e.target.value)} placeholder="Apa yang perlu diperbaiki ke depan?" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFindingDialogOpen(false)}>Batal</Button>
            <Button onClick={handleCreateFinding} disabled={savingFinding || !findingTitle.trim() || !findingText.trim()}>
              {savingFinding ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// MEAL Learning V1 — REPLACED workflow (not layered on top of the old one):
// Create, Edit, Publish, Delete, and browsing this project's own Learning
// entries all happen INLINE here via local view state. Nothing in this tab
// ever calls navigate() to /dashboard/learning/* — the browser URL and the
// sidebar's active section never change while authoring. The sidebar
// Learning Library still exists as a separate, read-only, cross-project
// browsing surface (reached only via its own nav item), but it is no longer
// part of the authoring path at all.
type ProjectLearningView = 'list' | 'create' | 'edit' | 'detail';

function ProjectLearningTab({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const { canDelete: isReviewer } = useOrgRole();

  const [view, setView] = useState<ProjectLearningView>('list');
  const [activeId, setActiveId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<OrgLearningEntry[]>([]);
  const [myDrafts, setMyDrafts] = useState<OrgLearningEntry[]>([]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = supabase as any;
      const { data: claims, error: claimsErr } = await supabase
        .from('wbs_completion_claims')
        .select('id, status')
        .eq('lfa_project_id', projectId);
      if (claimsErr) throw claimsErr;
      const verifiedAcrIds = ((claims || []) as { id: string; status: string }[])
        .filter((c) => c.status === CLOSED_CLAIM_STATUS)
        .map((c) => c.id);

      const { data: findingRows, error: findingErr } = await client.from('project_evaluation_findings').select('id').eq('project_id', projectId);
      if (findingErr) throw findingErr;
      const findingIds = ((findingRows || []) as { id: string }[]).map((f) => f.id);

      let learningIds: string[] = [];
      if (verifiedAcrIds.length > 0 || findingIds.length > 0) {
        const evidenceQueries = [];
        if (verifiedAcrIds.length > 0) evidenceQueries.push(client.from('org_learning_evidence').select('learning_id').eq('source_type', 'acr').in('source_id', verifiedAcrIds));
        if (findingIds.length > 0) evidenceQueries.push(client.from('org_learning_evidence').select('learning_id').eq('source_type', 'finding').in('source_id', findingIds));
        const evidenceResults = await Promise.all(evidenceQueries);
        learningIds = Array.from(new Set(evidenceResults.flatMap((r) => ((r.data || []) as { learning_id: string }[]).map((e) => e.learning_id))));
      }

      if (learningIds.length === 0) {
        setPublished([]);
        setMyDrafts([]);
        return;
      }

      const { data: entries, error: entriesErr } = await client.from('org_learning_entries').select('*').in('id', learningIds).order('created_at', { ascending: false });
      if (entriesErr) throw entriesErr;
      const rows = (entries || []) as OrgLearningEntry[];
      // RLS already keeps other authors' Drafts out of this result entirely —
      // the split below is just presentational (Published vs. my own Drafts).
      setPublished(rows.filter((r) => r.status === 'published'));
      setMyDrafts(rows.filter((r) => r.status === 'draft' && r.authored_by === user?.id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId, user?.id]);

  useEffect(() => { if (view === 'list') void loadList(); }, [loadList, view]);

  if (view === 'create') {
    return (
      <LearningInlineEditor
        projectId={projectId}
        onSaved={(id) => { setActiveId(id); setView('detail'); }}
        onCancel={() => setView('list')}
      />
    );
  }
  if (view === 'edit' && activeId) {
    return (
      <LearningInlineEditor
        projectId={projectId}
        learningId={activeId}
        onSaved={() => setView('detail')}
        onCancel={() => setView('detail')}
      />
    );
  }
  if (view === 'detail' && activeId) {
    return (
      <LearningInlineDetail
        learningId={activeId}
        onBack={() => { setActiveId(null); setView('list'); }}
        onEdit={() => setView('edit')}
        onDeleted={() => { setActiveId(null); setView('list'); }}
      />
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (error) {
    return <Card className="border-destructive/50"><CardContent className="py-4 text-sm text-destructive">{error}</CardContent></Card>;
  }

  const openDetail = (id: string) => { setActiveId(id); setView('detail'); };

  const renderEntry = (l: OrgLearningEntry) => (
    <Card key={l.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openDetail(l.id)}>
      <CardContent className="space-y-1.5 py-4">
        <div className="flex items-center gap-2 min-w-0">
          <CardTitle className="text-base truncate">{l.title}</CardTitle>
          <Badge variant="outline" className={`text-[9px] py-0 h-4 shrink-0 ${getInsightTypeBadgeClass(l.insight_type)}`}>{getInsightTypeLabel(l.insight_type)}</Badge>
          <Badge variant="outline" className={`text-[9px] py-0 h-4 shrink-0 ${getLearningStatusBadgeClass(l.status)}`}>{l.status === 'published' ? 'Published' : 'Draft'}</Badge>
        </div>
        <CardDescription className="line-clamp-2">{l.insight}</CardDescription>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">Institutional knowledge synthesized from this project's ACR and Evaluation Findings.</div>
        {isReviewer && (
          <Button size="sm" onClick={() => setView('create')}>
            <Plus className="mr-1 h-3.5 w-3.5" /> New Learning
          </Button>
        )}
      </div>

      {myDrafts.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">My Drafts</div>
          {myDrafts.map(renderEntry)}
        </div>
      )}

      <div className="space-y-2">
        {published.length > 0 && <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Published</div>}
        {published.length === 0 && myDrafts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Lightbulb className="h-10 w-10 text-muted-foreground" />
              <CardTitle className="text-lg">Belum ada Learning terkait proyek ini.</CardTitle>
              {isReviewer && (
                <Button onClick={() => setView('create')}>
                  <Plus className="mr-1 h-4 w-4" /> New Learning
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          published.map(renderEntry)
        )}
      </div>

      {/* The sidebar Learning module was removed entirely — this is now the
          only entry point into the cross-project Library. */}
      <div className="pt-2 border-t">
        <Link to="/dashboard/learning" className="text-xs font-semibold text-primary hover:underline">
          Browse Organization Learning →
        </Link>
      </div>
    </div>
  );
}

// Inline Create/Edit — no route, no navigate() to /dashboard/learning/*.
// Evidence Base defaults to this project's own Verified ACRs/Findings before
// any search text is typed; typing still searches every project in the org.
function LearningInlineEditor({ projectId, learningId, onSaved, onCancel }: {
  projectId: string;
  learningId?: string;
  onSaved: (id: string) => void;
  onCancel: () => void;
}) {
  const isEdit = !!learningId;
  const { toast } = useToast();
  const { user } = useAuth();
  const { organizationId } = useOrgRole();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [insight, setInsight] = useState('');
  const [insightType, setInsightType] = useState<LearningInsightType | ''>('');
  const [recommendation, setRecommendation] = useState('');
  const [scope, setScope] = useState<LearningScope | ''>('');
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceCandidate[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EvidenceCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [defaultCandidates, setDefaultCandidates] = useState<EvidenceCandidate[]>([]);
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [showExternalSearch, setShowExternalSearch] = useState(false);

  useEffect(() => {
    setLoadingDefaults(true);
    loadProjectEvidenceCandidates(projectId).then(setDefaultCandidates).finally(() => setLoadingDefaults(false));
  }, [projectId]);

  useEffect(() => {
    if (!isEdit || !learningId) return;
    (async () => {
      setLoading(true);
      try {
        const client = supabase as any;
        const { data } = await client.from('org_learning_entries').select('*').eq('id', learningId).maybeSingle();
        if (!data) { onCancel(); return; }
        const e = data as OrgLearningEntry;
        setTitle(e.title);
        setInsight(e.insight);
        setInsightType(e.insight_type);
        setRecommendation(e.recommendation);
        setScope(e.scope);
        const { data: evidenceRows } = await client.from('org_learning_evidence').select('source_type, source_id').eq('learning_id', learningId);
        setSelectedEvidence(await resolveEvidenceCitations((evidenceRows || []) as any));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, learningId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchEvidenceCandidates(searchQuery);
      setSearchResults(results.filter((r) => !selectedEvidence.some((s) => s.sourceType === r.sourceType && s.sourceId === r.sourceId)));
      setSearching(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedEvidence.length]);

  const addEvidence = (c: EvidenceCandidate) => {
    setSelectedEvidence((prev) => [...prev, c]);
    setSearchResults((prev) => prev.filter((r) => !(r.sourceType === c.sourceType && r.sourceId === c.sourceId)));
  };
  const removeEvidence = (c: EvidenceCandidate) => {
    setSelectedEvidence((prev) => prev.filter((r) => !(r.sourceType === c.sourceType && r.sourceId === c.sourceId)));
  };
  const toggleEvidence = (c: EvidenceCandidate) => {
    setSelectedEvidence((prev) =>
      prev.some((s) => s.sourceType === c.sourceType && s.sourceId === c.sourceId)
        ? prev.filter((r) => !(r.sourceType === c.sourceType && r.sourceId === c.sourceId))
        : [...prev, c]
    );
  };

  const relatedProjectNames = Array.from(new Set(selectedEvidence.map((e) => e.projectId)))
    .map((pid) => selectedEvidence.find((e) => e.projectId === pid)?.label.split(' — ').pop() || pid);

  const canSave = title.trim() && insight.trim() && insightType && recommendation.trim() && scope && selectedEvidence.length > 0;

  const handleSave = async () => {
    if (!canSave || !user?.id || !organizationId) return;
    setSaving(true);
    try {
      const client = supabase as any;
      if (isEdit && learningId) {
        const { error: updateErr } = await client.from('org_learning_entries').update({
          title: title.trim(), insight: insight.trim(), insight_type: insightType,
          recommendation: recommendation.trim(), scope,
        }).eq('id', learningId);
        if (updateErr) throw updateErr;
        await client.from('org_learning_evidence').delete().eq('learning_id', learningId);
        const { error: evErr } = await client.from('org_learning_evidence').insert(
          selectedEvidence.map((e) => ({ learning_id: learningId, source_type: e.sourceType, source_id: e.sourceId })),
        );
        if (evErr) throw evErr;
        toast({ title: 'Learning diperbarui' });
        onSaved(learningId);
      } else {
        const { data: created, error: insertErr } = await client.from('org_learning_entries').insert({
          org_id: organizationId, title: title.trim(), insight: insight.trim(), insight_type: insightType,
          recommendation: recommendation.trim(), scope, authored_by: user.id, status: 'draft',
        }).select('id').single();
        if (insertErr) throw insertErr;
        const newId = (created as any).id;
        const { error: evErr } = await client.from('org_learning_evidence').insert(
          selectedEvidence.map((e) => ({ learning_id: newId, source_type: e.sourceType, source_id: e.sourceId })),
        );
        if (evErr) throw evErr;
        toast({ title: 'Draft Learning dibuat' });
        onSaved(newId);
      }
    } catch (err) {
      toast({ title: 'Gagal menyimpan Learning', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 pb-16 max-w-full">
      <Button variant="ghost" size="sm" onClick={onCancel}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
      </Button>
      <Card className="w-full max-w-full box-border overflow-hidden">
        <CardContent className="space-y-4 py-6">
          <h2 className="text-lg font-bold">{isEdit ? 'Edit Learning' : 'New Learning'}</h2>

          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul singkat pattern" />
          </div>

          <div className="space-y-1.5">
            <Label>Insight</Label>
            <Textarea value={insight} onChange={(e) => setInsight(e.target.value)} placeholder="Pattern yang teramati across beberapa ACR/Finding" rows={4} />
          </div>

          <div className="space-y-1.5">
            <Label>Insight Type</Label>
            <Select value={insightType} onValueChange={(v) => setInsightType(v as LearningInsightType)}>
              <SelectTrigger><SelectValue placeholder="Pilih tipe" /></SelectTrigger>
              <SelectContent>
                {INSIGHT_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Recommendation</Label>
            <Textarea value={recommendation} onChange={(e) => setRecommendation(e.target.value)} placeholder="Apa yang harus dilakukan berbeda ke depan" rows={3} />
          </div>

          <div className="space-y-1.5">
            <Label>Evidence Base</Label>
            {selectedEvidence.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedEvidence.map((e) => (
                  <Badge key={`${e.sourceType}-${e.sourceId}`} variant="secondary" className="flex items-center gap-1 max-w-full">
                    <span className="truncate max-w-[280px]">{e.label}</span>
                    <button onClick={() => removeEvidence(e)} className="shrink-0"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="border rounded overflow-hidden">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-muted/50">
                Dari proyek ini
              </div>
              {loadingDefaults ? (
                <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
              ) : defaultCandidates.length === 0 ? (
                <div className="py-3 text-center text-xs text-muted-foreground">Belum ada ACR terverifikasi atau Finding untuk proyek ini.</div>
              ) : (
                defaultCandidates.map((r) => {
                  const isSelected = selectedEvidence.some((s) => s.sourceType === r.sourceType && s.sourceId === r.sourceId);
                  return (
                    <button
                      key={`${r.sourceType}-${r.sourceId}`}
                      className={`w-full min-w-0 flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left ${isSelected ? 'bg-primary/5' : ''}`}
                      onClick={() => toggleEvidence(r)}
                    >
                      <span className={`shrink-0 flex items-center justify-center w-4 h-4 rounded border text-[10px] ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 text-transparent'}`}>
                        ✓
                      </span>
                      <span className="min-w-0 flex-1 truncate">{r.label}</span>
                    </button>
                  );
                })
              )}
            </div>
            <div>
                <button
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowExternalSearch((v) => !v)}
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${showExternalSearch ? 'rotate-0' : '-rotate-90'}`} />
                  Cari bukti dari proyek lain
                </button>
                {showExternalSearch && (
                  <div className="mt-2 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari Activity atau Project..."
                      />
                    </div>
                    {searchQuery.trim().length >= 2 && (
                      <div className="border rounded max-h-48 overflow-y-auto">
                        {searching ? (
                          <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
                        ) : searchResults.length === 0 ? (
                          <div className="py-3 text-center text-xs text-muted-foreground">Tidak ditemukan.</div>
                        ) : (
                          searchResults.map((r) => (
                            <button
                              key={`${r.sourceType}-${r.sourceId}`}
                              className="block w-full min-w-0 text-left px-3 py-2 text-sm hover:bg-muted truncate"
                              onClick={() => addEvidence(r)}
                            >
                              {r.label}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
          </div>

          <div className="space-y-1.5">
            <Label>Scope of Applicability</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as LearningScope)}>
              <SelectTrigger><SelectValue placeholder="Pilih scope" /></SelectTrigger>
              <SelectContent>
                {SCOPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Related Projects</Label>
            <div className="flex flex-wrap gap-1.5">
              {relatedProjectNames.length > 0
                ? relatedProjectNames.map((n) => <Badge key={n} variant="outline" className="max-w-[220px]"><span className="truncate">{n}</span></Badge>)
                : <span className="text-xs text-muted-foreground">Otomatis terisi dari Evidence Base.</span>}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pr-6 pb-8 pt-2 border-t w-full">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleSave} disabled={!canSave || saving}>
              {saving ? 'Menyimpan...' : isEdit ? 'Save Changes' : 'Save as Draft'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Inline Detail — Publish/Edit/Delete stay inside this tab; only the
// Evidence Base citation links leave (into the cited project's ACR tab,
// which is not a Learning route and does not touch the sidebar).
function LearningInlineDetail({ learningId, onBack, onEdit, onDeleted }: {
  learningId: string;
  onBack: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entry, setEntry] = useState<OrgLearningEntry | null>(null);
  const [citations, setCitations] = useState<{ id: string; label: string; projectId: string | null }[]>([]);
  const [relatedProjects, setRelatedProjects] = useState<{ id: string; name: string }[]>([]);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [publisherName, setPublisherName] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = supabase as any;
      const { data, error: fetchErr } = await client.from('org_learning_entries').select('*').eq('id', learningId).maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!data) { setEntry(null); setLoading(false); return; }
      setEntry(data as OrgLearningEntry);

      const { data: evidenceRows } = await client.from('org_learning_evidence').select('id, source_type, source_id').eq('learning_id', learningId);
      const ev = (evidenceRows || []) as { id: string; source_type: 'acr' | 'finding'; source_id: string }[];
      const resolvedCitations = await resolveEvidenceCitations(ev);
      setCitations(ev.map((e, i) => ({ id: e.id, label: resolvedCitations[i]?.label || '—', projectId: resolvedCitations[i]?.projectId || null })));
      const allProjectIds = Array.from(new Set(resolvedCitations.map((c) => c.projectId).filter(Boolean) as string[]));
      if (allProjectIds.length > 0) {
        const { data: projects } = await supabase.from('lfa_projects').select('id, name').in('id', allProjectIds);
        const nameById = new Map(((projects || []) as any[]).map((p) => [p.id, p.name || 'Project']));
        setRelatedProjects(allProjectIds.map((id) => ({ id, name: nameById.get(id) || 'Project' })));
      } else {
        setRelatedProjects([]);
      }

      const userIds = [data.authored_by, data.published_by].filter(Boolean) as string[];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
        const names = new Map((profiles || []).map((p: any) => [p.id, p.full_name || p.id]));
        setAuthorName(names.get(data.authored_by) || null);
        if (data.published_by) setPublisherName(names.get(data.published_by) || null);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [learningId]);

  useEffect(() => { void load(); }, [load]);

  const handlePublish = async () => {
    if (!entry) return;
    setPublishing(true);
    try {
      const client = supabase as any;
      const { error: publishErr } = await client.from('org_learning_entries').update({
        status: 'published',
        published_by: user?.id,
        published_at: new Date().toISOString(),
      }).eq('id', entry.id);
      if (publishErr) throw publishErr;
      toast({ title: 'Learning dipublikasikan' });
      void load();
    } catch (err) {
      toast({ title: 'Gagal mempublikasikan Learning', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    setDeleting(true);
    try {
      const client = supabase as any;
      const { error: deleteErr } = await client.from('org_learning_entries').delete().eq('id', entry.id);
      if (deleteErr) throw deleteErr;
      toast({ title: 'Draft Learning dihapus' });
      onDeleted();
    } catch (err) {
      toast({ title: 'Gagal menghapus Learning', description: (err as Error).message, variant: 'destructive' });
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (error) {
    return <Card className="border-destructive/50"><CardContent className="py-4 text-sm text-destructive">{error}</CardContent></Card>;
  }

  if (!entry) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
        <Card><CardContent className="flex flex-col items-center gap-2 py-16 text-center">
          <CardTitle className="text-lg">Learning tidak ditemukan.</CardTitle>
        </CardContent></Card>
      </div>
    );
  }

  const canManage = canManageLearning(entry, user?.id || null);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
      </Button>
      <Card>
        <CardContent className="space-y-4 py-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500 shrink-0" />
              {entry.title}
            </h2>
            <div className="flex gap-1 shrink-0">
              <Badge variant="outline" className={getInsightTypeBadgeClass(entry.insight_type)}>{getInsightTypeLabel(entry.insight_type)}</Badge>
              <Badge variant="outline" className={getLearningStatusBadgeClass(entry.status)}>{entry.status === 'published' ? 'Published' : 'Draft'}</Badge>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Insight</div>
            <p className="text-sm whitespace-pre-wrap">{entry.insight}</p>
          </div>

          <div className="rounded border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900 p-3">
            <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide mb-1">Recommendation</div>
            <p className="text-sm whitespace-pre-wrap text-emerald-900 dark:text-emerald-300">{entry.recommendation}</p>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Evidence Base</div>
            <div className="space-y-1">
              {citations.map((c) => (
                <button
                  key={c.id}
                  className="block text-left text-sm text-primary hover:underline"
                  onClick={() => c.projectId && navigate(`/dashboard/project-management/${c.projectId}/meal?tab=acr`)}
                >
                  → {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground pt-2 border-t">
            <span>Related Projects: {relatedProjects.map((p) => p.name).join(', ') || '—'}</span>
            <span>Scope: {getScopeLabel(entry.scope)}</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span>Authored by {authorName || '—'}{entry.created_at ? ` on ${new Date(entry.created_at).toLocaleDateString('id-ID')}` : ''}</span>
            {entry.published_at && <span>Published by {publisherName || '—'} on {new Date(entry.published_at).toLocaleDateString('id-ID')}</span>}
          </div>

          {canManage && (
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" disabled={publishing}>Publish</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Publish this Learning?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Once published, it becomes visible organization-wide and cannot be edited directly.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePublish}>Publish</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={deleting}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this Draft?</AlertDialogTitle>
                    <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>
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
        return <ControlCenterTab projectId={projectId} onOpenActivityLog={() => setTab('activity')} onOpenLearning={() => setTab('learning')} />;
      case 'acr':
        return <AcrTab projectId={projectId} />;
      case 'deliverables':
        return <DeliverablesTab projectId={projectId} />;
      case 'learning':
        return <ProjectLearningTab projectId={projectId} />;
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
