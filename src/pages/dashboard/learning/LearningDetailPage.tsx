import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lightbulb, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  getInsightTypeLabel, getInsightTypeBadgeClass,
  getScopeLabel, getLearningStatusBadgeClass,
} from '@/lib/project-management/orgLearningModel';
import { resolveEvidenceCitations } from '@/lib/project-management/learningEvidencePicker';
import type { OrgLearningEntry } from '@/pages/dashboard/lfa-builder/types';

interface EvidenceCitation {
  id: string;
  label: string;
  projectId: string | null;
}

// Sidebar Learning is a read-only, cross-project browsing surface only —
// authoring (Create/Edit/Publish/Delete) happens exclusively inside each
// project's MEAL > Learning tab. This page never renders those actions,
// regardless of who is viewing it.
//
// Not-found and "it's a Draft you don't own" render identically — a Draft's
// existence is never confirmed to anyone but its author (RLS enforces this;
// this page just presents whatever RLS actually returned).
export default function LearningDetailPage() {
  const { learningId } = useParams<{ learningId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entry, setEntry] = useState<OrgLearningEntry | null>(null);
  const [citations, setCitations] = useState<EvidenceCitation[]>([]);
  const [relatedProjects, setRelatedProjects] = useState<{ id: string; name: string }[]>([]);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [publisherName, setPublisherName] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!learningId) return;
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

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl py-2">
        <Card className="border-destructive/50"><CardContent className="py-4 text-sm text-destructive">{error}</CardContent></Card>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="mx-auto max-w-4xl py-2">
        <Card><CardContent className="flex flex-col items-center gap-2 py-16 text-center">
          <CardTitle className="text-lg">Learning tidak ditemukan.</CardTitle>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 py-2">
      <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/learning')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
      </Button>

      <Card>
        <CardContent className="space-y-4 py-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500 shrink-0" />
              {entry.title}
            </h1>
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
        </CardContent>
      </Card>
    </div>
  );
}
