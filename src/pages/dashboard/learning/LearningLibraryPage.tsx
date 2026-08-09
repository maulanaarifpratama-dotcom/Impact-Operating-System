import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lightbulb, Loader2, Plus } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useOrgRole } from '@/hooks/useOrgRole';
import {
  getInsightTypeLabel, getInsightTypeBadgeClass, INSIGHT_TYPE_OPTIONS,
  getScopeLabel, SCOPE_OPTIONS,
  getLearningStatusBadgeClass,
} from '@/lib/project-management/orgLearningModel';
import type { OrgLearningEntry } from '@/pages/dashboard/lfa-builder/types';

type StatusFilter = 'published' | 'all' | 'my_drafts';

interface LearningRow extends OrgLearningEntry {
  relatedProjectNames: string[];
}

// MEAL Learning V1 (Sprint 1). Org-level knowledge library — not nested
// inside any project. Read access is universal; authoring is owner/admin
// only. Draft visibility is enforced server-side (RLS), this page's filters
// are a convenience layer on top, not the actual security boundary.
export default function LearningLibraryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizationId, canDelete: isReviewer } = useOrgRole();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusFilter = (searchParams.get('status') as StatusFilter) || 'published';
  const insightTypeFilter = searchParams.get('insight_type') || 'all';
  const scopeFilter = searchParams.get('scope') || 'all';
  const projectFilter = searchParams.get('project') || 'all';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<LearningRow[]>([]);
  const [projectOptions, setProjectOptions] = useState<{ id: string; name: string }[]>([]);
  const [counters, setCounters] = useState({ total: 0, thisQuarter: 0, goodPractice: 0, failurePattern: 0 });

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all' || value === 'published') next.delete(key);
    else next.set(key, value);
    if (key !== 'status') { /* keep other params */ }
    setSearchParams(next);
  };

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError(null);
    try {
      const client = supabase as any;

      // Counters always reflect Published knowledge, narrowed by Insight
      // Type/Scope if set — Drafts are not yet organizational knowledge.
      let counterQuery = client.from('org_learning_entries').select('id, insight_type, created_at').eq('org_id', organizationId).eq('status', 'published');
      if (insightTypeFilter !== 'all') counterQuery = counterQuery.eq('insight_type', insightTypeFilter);
      if (scopeFilter !== 'all') counterQuery = counterQuery.eq('scope', scopeFilter);
      const { data: counterRows } = await counterQuery;
      const quarterStart = new Date();
      quarterStart.setMonth(quarterStart.getMonth() - 3);
      const cRows = (counterRows || []) as { id: string; insight_type: string; created_at: string }[];
      setCounters({
        total: cRows.length,
        thisQuarter: cRows.filter((r) => new Date(r.created_at) >= quarterStart).length,
        goodPractice: cRows.filter((r) => r.insight_type === 'good_practice').length,
        failurePattern: cRows.filter((r) => r.insight_type === 'failure_pattern').length,
      });

      // Main list — RLS already restricts Drafts to their author; "my_drafts"
      // here just narrows the client-visible set to status=draft (which, for
      // anyone but the author, RLS would return empty for anyway).
      let listQuery = client.from('org_learning_entries').select('*').eq('org_id', organizationId);
      if (statusFilter === 'published') listQuery = listQuery.eq('status', 'published');
      else if (statusFilter === 'my_drafts') listQuery = listQuery.eq('status', 'draft');
      if (insightTypeFilter !== 'all') listQuery = listQuery.eq('insight_type', insightTypeFilter);
      if (scopeFilter !== 'all') listQuery = listQuery.eq('scope', scopeFilter);
      listQuery = listQuery.order('created_at', { ascending: false });
      const { data: entries, error: listErr } = await listQuery;
      if (listErr) throw listErr;
      const entryRows = (entries || []) as OrgLearningEntry[];

      // Related Projects are derived, never stored — resolve via Evidence Base.
      const entryIds = entryRows.map((e) => e.id);
      const projectIdsByEntry = new Map<string, Set<string>>();
      if (entryIds.length > 0) {
        const { data: evidenceRows } = await client.from('org_learning_evidence').select('learning_id, source_type, source_id').in('learning_id', entryIds);
        const ev = (evidenceRows || []) as { learning_id: string; source_type: string; source_id: string }[];
        const acrIds = ev.filter((e) => e.source_type === 'acr').map((e) => e.source_id);
        const findingIds = ev.filter((e) => e.source_type === 'finding').map((e) => e.source_id);
        const acrProjectById = new Map<string, string>();
        const findingProjectById = new Map<string, string>();
        if (acrIds.length > 0) {
          const { data: claims } = await supabase.from('wbs_completion_claims').select('id, lfa_project_id').in('id', acrIds);
          for (const c of ((claims || []) as { id: string; lfa_project_id: string }[])) acrProjectById.set(c.id, c.lfa_project_id);
        }
        if (findingIds.length > 0) {
          const { data: findings } = await client.from('project_evaluation_findings').select('id, project_id').in('id', findingIds);
          for (const f of ((findings || []) as { id: string; project_id: string }[])) findingProjectById.set(f.id, f.project_id);
        }
        for (const e of ev) {
          const projectId = e.source_type === 'acr' ? acrProjectById.get(e.source_id) : findingProjectById.get(e.source_id);
          if (!projectId) continue;
          if (!projectIdsByEntry.has(e.learning_id)) projectIdsByEntry.set(e.learning_id, new Set());
          projectIdsByEntry.get(e.learning_id)!.add(projectId);
        }
      }

      const allProjectIds = Array.from(new Set(Array.from(projectIdsByEntry.values()).flatMap((s) => Array.from(s))));
      const projectNameById = new Map<string, string>();
      if (allProjectIds.length > 0) {
        const { data: projects } = await supabase.from('lfa_projects').select('id, name').in('id', allProjectIds);
        for (const p of ((projects || []) as { id: string; name: string }[])) projectNameById.set(p.id, p.name || 'Project');
      }
      setProjectOptions(allProjectIds.map((id) => ({ id, name: projectNameById.get(id) || 'Project' })));

      let resolved: LearningRow[] = entryRows.map((e) => ({
        ...e,
        relatedProjectNames: Array.from(projectIdsByEntry.get(e.id) || []).map((id) => projectNameById.get(id) || 'Project'),
      }));

      if (projectFilter !== 'all') {
        resolved = resolved.filter((r) => (projectIdsByEntry.get(r.id) || new Set()).has(projectFilter));
      }

      setRows(resolved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [organizationId, statusFilter, insightTypeFilter, scopeFilter, projectFilter]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Lightbulb className="h-6 w-6 text-amber-500" /> Learning Library</h1>
          <p className="text-sm text-muted-foreground">Institutional knowledge synthesized from ACR and Evaluation Findings across projects.</p>
        </div>
        {isReviewer && (
          <Button onClick={() => navigate('/dashboard/learning/new')}>
            <Plus className="mr-1 h-4 w-4" /> New Learning
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardContent className="py-4"><div className="text-2xl font-bold">{counters.total}</div><div className="text-xs text-muted-foreground">Total Published</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-2xl font-bold">{counters.thisQuarter}</div><div className="text-xs text-muted-foreground">This Quarter</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-2xl font-bold text-emerald-600">{counters.goodPractice}</div><div className="text-xs text-muted-foreground">Good Practice</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-2xl font-bold text-red-600">{counters.failurePattern}</div><div className="text-xs text-muted-foreground">Failure Pattern</div></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={statusFilter} onValueChange={(v) => setFilter('status', v)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="all">All</SelectItem>
            {isReviewer && <SelectItem value="my_drafts">My Drafts</SelectItem>}
          </SelectContent>
        </Select>
        <Select value={insightTypeFilter} onValueChange={(v) => setFilter('insight_type', v)}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Insight Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Insight Types</SelectItem>
            {INSIGHT_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={scopeFilter} onValueChange={(v) => setFilter('scope', v)}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Scope" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scopes</SelectItem>
            {SCOPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {projectOptions.length > 0 && (
          <Select value={projectFilter} onValueChange={(v) => setFilter('project', v)}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projectOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : error ? (
        <Card className="border-destructive/50">
          <CardContent className="py-4 text-sm text-destructive flex items-center justify-between">
            <span>Gagal memuat Learning.</span>
            <Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button>
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Lightbulb className="h-10 w-10 text-muted-foreground" />
            <CardTitle className="text-lg">
              {statusFilter === 'published' && insightTypeFilter === 'all' && scopeFilter === 'all' && projectFilter === 'all'
                ? 'Belum ada Learning yang dipublikasikan.'
                : 'Tidak ada Learning yang cocok dengan filter ini.'}
            </CardTitle>
            {isReviewer && statusFilter === 'published' && insightTypeFilter === 'all' && scopeFilter === 'all' && projectFilter === 'all' && (
              <Button onClick={() => navigate('/dashboard/learning/new')}><Plus className="mr-1 h-4 w-4" /> New Learning</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/dashboard/learning/${r.id}`)}>
              <CardContent className="space-y-1.5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <CardTitle className="text-base truncate">{r.title}</CardTitle>
                    <Badge variant="outline" className={`text-[9px] py-0 h-4 shrink-0 ${getInsightTypeBadgeClass(r.insight_type)}`}>{getInsightTypeLabel(r.insight_type)}</Badge>
                    <Badge variant="outline" className={`text-[9px] py-0 h-4 shrink-0 ${getLearningStatusBadgeClass(r.status)}`}>{r.status === 'published' ? 'Published' : 'Draft'}</Badge>
                  </div>
                </div>
                <CardDescription className="line-clamp-2">{r.insight}</CardDescription>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{getScopeLabel(r.scope)}</span>
                  {r.relatedProjectNames.length > 0 && <span>Projects: {r.relatedProjectNames.join(', ')}</span>}
                  {r.published_at && <span>Published: {new Date(r.published_at).toLocaleDateString('id-ID')}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
