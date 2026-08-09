import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lightbulb, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import {
  getInsightTypeLabel, getInsightTypeBadgeClass,
  getScopeLabel, getLearningStatusBadgeClass, canManageLearning,
} from '@/lib/project-management/orgLearningModel';
import type { OrgLearningEntry } from '@/pages/dashboard/lfa-builder/types';

interface EvidenceCitation {
  id: string;
  sourceType: 'acr' | 'finding';
  sourceId: string;
  label: string;
  projectId: string | null;
}

// Not-found and "it's a Draft you don't own" render identically — a Draft's
// existence is never confirmed to anyone but its author (RLS enforces this;
// this page just presents whatever RLS actually returned).
export default function LearningDetailPage() {
  const { learningId } = useParams<{ learningId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entry, setEntry] = useState<OrgLearningEntry | null>(null);
  const [citations, setCitations] = useState<EvidenceCitation[]>([]);
  const [relatedProjects, setRelatedProjects] = useState<{ id: string; name: string }[]>([]);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [publisherName, setPublisherName] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

      const acrIds = ev.filter((e) => e.source_type === 'acr').map((e) => e.source_id);
      const findingIds = ev.filter((e) => e.source_type === 'finding').map((e) => e.source_id);

      const acrById = new Map<string, { wbs_item_id: string; lfa_project_id: string }>();
      const findingById = new Map<string, { title: string; project_id: string }>();
      const wbsNameById = new Map<string, string>();
      const projectNameById = new Map<string, string>();

      if (acrIds.length > 0) {
        const { data: claims } = await supabase.from('wbs_completion_claims').select('id, wbs_item_id, lfa_project_id').in('id', acrIds);
        for (const c of ((claims || []) as any[])) acrById.set(c.id, c);
        const wbsIds = Array.from(new Set(Array.from(acrById.values()).map((c) => c.wbs_item_id)));
        if (wbsIds.length > 0) {
          const { data: wbsItems } = await supabase.from('lfa_wbs_items').select('id, name').in('id', wbsIds);
          for (const w of ((wbsItems || []) as any[])) wbsNameById.set(w.id, w.name || 'Activity');
        }
      }
      if (findingIds.length > 0) {
        const { data: findings } = await client.from('project_evaluation_findings').select('id, title, project_id').in('id', findingIds);
        for (const f of ((findings || []) as any[])) findingById.set(f.id, f);
      }

      const allProjectIds = Array.from(new Set([
        ...Array.from(acrById.values()).map((c) => c.lfa_project_id),
        ...Array.from(findingById.values()).map((f) => f.project_id),
      ]));
      if (allProjectIds.length > 0) {
        const { data: projects } = await supabase.from('lfa_projects').select('id, name').in('id', allProjectIds);
        for (const p of ((projects || []) as any[])) projectNameById.set(p.id, p.name || 'Project');
      }

      setCitations(ev.map((e) => {
        if (e.source_type === 'acr') {
          const acr = acrById.get(e.source_id);
          const activityName = acr ? (wbsNameById.get(acr.wbs_item_id) || 'Activity') : 'Activity';
          const projectName = acr ? (projectNameById.get(acr.lfa_project_id) || 'Project') : 'Project';
          return { id: e.id, sourceType: 'acr', sourceId: e.source_id, label: `ACR: ${activityName} — ${projectName}`, projectId: acr?.lfa_project_id || null };
        }
        const finding = findingById.get(e.source_id);
        const projectName = finding ? (projectNameById.get(finding.project_id) || 'Project') : 'Project';
        return { id: e.id, sourceType: 'finding', sourceId: e.source_id, label: `Finding: ${finding?.title || 'Untitled'} — ${projectName}`, projectId: finding?.project_id || null };
      }));
      setRelatedProjects(allProjectIds.map((id) => ({ id, name: projectNameById.get(id) || 'Project' })));

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
      navigate('/dashboard/learning');
    } catch (err) {
      toast({ title: 'Gagal menghapus Learning', description: (err as Error).message, variant: 'destructive' });
      setDeleting(false);
    }
  };

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

  const canManage = canManageLearning(entry, user?.id || null);

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

          {canManage && (
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/learning/${entry.id}/edit`)}>
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
