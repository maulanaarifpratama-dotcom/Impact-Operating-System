import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  History,
  ClipboardCheck,
  FileText,
  AlertTriangle,
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ProjectWorkspaceNav } from '../ProjectWorkspaceNav';
import { useOrgRole } from '@/hooks/useOrgRole';
import CompletionClaimReviewDialog from '@/components/verification/CompletionClaimReviewDialog';

// PM + MEAL Canonicalization: ACR is the single source of truth. 'activity' stays a valid
// tab (reachable via ?tab=activity from Control Center) but is deliberately left out of the
// primary TABS bar below — it's an audit utility, not a workflow screen. 'milestones' and
// 'evidence' are removed entirely: Evidence & Verification duplicated ACR (folded into the
// ACR tab's status filter), and Milestones duplicated Stage/Timeline/Deliverables progress.
type MealTab = 'control-center' | 'acr' | 'deliverables' | 'activity';

const TABS: { key: MealTab; label: string }[] = [
  { key: 'control-center', label: 'Control Center' },
  { key: 'acr', label: 'ACR' },
  { key: 'deliverables', label: 'Deliverables' },
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
function ControlCenterTab({ projectId, onOpenActivityLog }: { projectId: string; onOpenActivityLog: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    execution: { open: number; inProgress: number; completed: number; overdue: number; blocked: number };
    acr: { documented: number; closed: number; pendingVerification: number };
    recentLearning: { id: string; name: string; observations: string; date: string | null }[];
    totalOutputs: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wbsRes, claimsRes] = await Promise.all([
        supabase.from('lfa_wbs_items').select('id, status, end_date, blocker_category').eq('lfa_project_id', projectId).eq('level', 2),
        supabase.from('wbs_completion_claims').select('id, wbs_item_id, status, observations, submitted_at').eq('lfa_project_id', projectId),
      ]);
      if (wbsRes.error) throw wbsRes.error;
      if (claimsRes.error) throw claimsRes.error;

      // Work Plan owns execution status (Belum Mulai / Sedang Berjalan / Selesai).
      // Overdue and Blocked are derived, never manual flags: Overdue = today > end_date
      // AND status != completed; Blocked = an active bottleneck (blocker_category) is set.
      const activities = (wbsRes.data || []) as any[];
      const now = new Date();
      let execOpen = 0, execInProgress = 0, execCompleted = 0, execOverdue = 0, execBlocked = 0;
      for (const a of activities) {
        if (a.status === 'completed') execCompleted++;
        else if (a.status === 'in_progress') execInProgress++;
        else execOpen++; // not_started, or any legacy/non-canonical status, defaults to Open

        if (a.status !== 'completed' && a.end_date && new Date(a.end_date) < now) execOverdue++;
        if (a.blocker_category) execBlocked++;
      }

      const claims = (claimsRes.data || []) as any[];

      // One active (non-cancelled) claim per Activity — takes the most recent by submitted_at.
      // ACR ownership is separate from execution status: Documented/Closed describe the
      // completion RECORD (Evidence Verification), never the Activity's own execution status.
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
        if (c.status === 'verified') acrClosed++;
        else if (c.status === 'submitted') acrDocumented++;
      }
      const pendingVerification = acrDocumented; // Documented == awaiting Evidence Verification

      const withNotes = claims.filter((c) => c.observations && String(c.observations).trim().length > 0);
      const noteItemIds = Array.from(new Set(withNotes.map((c) => c.wbs_item_id)));
      const wbsNames = new Map<string, string>();
      if (noteItemIds.length > 0) {
        const { data: nameRows } = await supabase.from('lfa_wbs_items').select('id, name').in('id', noteItemIds);
        for (const r of (nameRows || [])) wbsNames.set(r.id, r.name || 'Activity');
      }
      const recentLearning = withNotes
        .sort((a, b) => String(b.submitted_at || '').localeCompare(String(a.submitted_at || '')))
        .slice(0, 5)
        .map((c) => ({
          id: c.id as string,
          name: wbsNames.get(c.wbs_item_id) || 'Activity',
          observations: c.observations as string,
          date: c.submitted_at as string | null,
        }));

      setStats({
        execution: { open: execOpen, inProgress: execInProgress, completed: execCompleted, overdue: execOverdue, blocked: execBlocked },
        acr: { documented: acrDocumented, closed: acrClosed, pendingVerification },
        recentLearning,
        // Deliverable Summary uses the exact same source as the Deliverables page:
        // a Deliverable is a Closed ACR, nothing else — no separate manual record.
        totalOutputs: acrClosed,
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
        .eq('status', 'verified')
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
        return <ControlCenterTab projectId={projectId} onOpenActivityLog={() => setTab('activity')} />;
      case 'acr':
        return <AcrTab projectId={projectId} />;
      case 'deliverables':
        return <DeliverablesTab projectId={projectId} />;
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
