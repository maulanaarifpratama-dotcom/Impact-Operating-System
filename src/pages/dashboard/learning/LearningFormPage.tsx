import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useOrgRole } from '@/hooks/useOrgRole';
import { INSIGHT_TYPE_OPTIONS, SCOPE_OPTIONS } from '@/lib/project-management/orgLearningModel';
import type {
  LearningInsightType, LearningScope, OrgLearningEntry,
} from '@/pages/dashboard/lfa-builder/types';

interface EvidenceCandidate {
  sourceType: 'acr' | 'finding';
  sourceId: string;
  label: string;
  projectId: string;
}

// Evidence Base picker: generalizes the search-and-select pattern already
// used for Evaluation Findings' "Related Evidence" field (AcrTab), extended
// to search Verified ACRs and Findings across every project in the org, not
// just one. Sprint-1 adequate — name-match search, not a full-text engine.
async function searchEvidenceCandidates(query: string): Promise<EvidenceCandidate[]> {
  const client = supabase as any;
  const q = query.trim();
  if (q.length < 2) return [];

  const [wbsMatch, projectMatch] = await Promise.all([
    supabase.from('lfa_wbs_items').select('id, name, lfa_project_id').eq('level', 2).ilike('name', `%${q}%`).limit(15),
    supabase.from('lfa_projects').select('id, name').ilike('name', `%${q}%`).limit(15),
  ]);
  const wbsRows = (wbsMatch.data || []) as { id: string; name: string; lfa_project_id: string }[];
  const projectRows = (projectMatch.data || []) as { id: string; name: string }[];
  const wbsIds = wbsRows.map((w) => w.id);
  const projectIds = projectRows.map((p) => p.id);

  const claimQueries = [];
  if (wbsIds.length > 0) claimQueries.push(supabase.from('wbs_completion_claims').select('id, wbs_item_id, lfa_project_id').eq('status', 'verified').in('wbs_item_id', wbsIds).limit(10));
  if (projectIds.length > 0) claimQueries.push(supabase.from('wbs_completion_claims').select('id, wbs_item_id, lfa_project_id').eq('status', 'verified').in('lfa_project_id', projectIds).limit(10));

  const findingQueries = [
    client.from('project_evaluation_findings').select('id, title, wbs_item_id, project_id').ilike('title', `%${q}%`).limit(10),
  ];
  if (wbsIds.length > 0) findingQueries.push(client.from('project_evaluation_findings').select('id, title, wbs_item_id, project_id').in('wbs_item_id', wbsIds).limit(10));
  if (projectIds.length > 0) findingQueries.push(client.from('project_evaluation_findings').select('id, title, wbs_item_id, project_id').in('project_id', projectIds).limit(10));

  const [claimResults, findingResults] = await Promise.all([
    Promise.all(claimQueries),
    Promise.all(findingQueries),
  ]);

  const claimsById = new Map<string, { id: string; wbs_item_id: string; lfa_project_id: string }>();
  for (const r of claimResults) for (const c of ((r.data || []) as any[])) claimsById.set(c.id, c);

  const findingsById = new Map<string, { id: string; title: string; wbs_item_id: string | null; project_id: string }>();
  for (const r of findingResults) for (const f of ((r.data || []) as any[])) findingsById.set(f.id, f);

  const allWbsIds = Array.from(new Set([
    ...Array.from(claimsById.values()).map((c) => c.wbs_item_id),
    ...Array.from(findingsById.values()).map((f) => f.wbs_item_id).filter(Boolean) as string[],
  ]));
  const allProjectIds = Array.from(new Set([
    ...Array.from(claimsById.values()).map((c) => c.lfa_project_id),
    ...Array.from(findingsById.values()).map((f) => f.project_id),
  ]));

  const wbsNameById = new Map(wbsRows.map((w) => [w.id, w.name]));
  const projectNameById = new Map(projectRows.map((p) => [p.id, p.name]));
  const missingWbsIds = allWbsIds.filter((id) => !wbsNameById.has(id));
  const missingProjectIds = allProjectIds.filter((id) => !projectNameById.has(id));
  if (missingWbsIds.length > 0) {
    const { data } = await supabase.from('lfa_wbs_items').select('id, name').in('id', missingWbsIds);
    for (const w of ((data || []) as any[])) wbsNameById.set(w.id, w.name || 'Activity');
  }
  if (missingProjectIds.length > 0) {
    const { data } = await supabase.from('lfa_projects').select('id, name').in('id', missingProjectIds);
    for (const p of ((data || []) as any[])) projectNameById.set(p.id, p.name || 'Project');
  }

  const acrCandidates: EvidenceCandidate[] = Array.from(claimsById.values()).map((c) => ({
    sourceType: 'acr' as const,
    sourceId: c.id,
    label: `ACR: ${wbsNameById.get(c.wbs_item_id) || 'Activity'} — ${projectNameById.get(c.lfa_project_id) || 'Project'}`,
    projectId: c.lfa_project_id,
  }));
  const findingCandidates: EvidenceCandidate[] = Array.from(findingsById.values()).map((f) => ({
    sourceType: 'finding' as const,
    sourceId: f.id,
    label: `Finding: ${f.title} — ${projectNameById.get(f.project_id) || 'Project'}`,
    projectId: f.project_id,
  }));

  return [...acrCandidates, ...findingCandidates].slice(0, 20);
}

export default function LearningFormPage() {
  const { learningId } = useParams<{ learningId: string }>();
  const isEdit = !!learningId;
  const navigate = useNavigate();
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

  // Load existing Draft for Edit
  useEffect(() => {
    if (!isEdit || !learningId) return;
    (async () => {
      setLoading(true);
      try {
        const client = supabase as any;
        const { data, error } = await client.from('org_learning_entries').select('*').eq('id', learningId).maybeSingle();
        if (error || !data) { navigate('/dashboard/learning'); return; }
        const e = data as OrgLearningEntry;
        if (e.status !== 'draft' || e.authored_by !== user?.id) {
          navigate(`/dashboard/learning/${learningId}`);
          return;
        }
        setTitle(e.title);
        setInsight(e.insight);
        setInsightType(e.insight_type);
        setRecommendation(e.recommendation);
        setScope(e.scope);

        const { data: evidenceRows } = await client.from('org_learning_evidence').select('source_type, source_id').eq('learning_id', learningId);
        const ev = (evidenceRows || []) as { source_type: 'acr' | 'finding'; source_id: string }[];
        // Re-resolve labels for the existing selections using the same
        // candidate shape the picker produces, so chips render consistently.
        const resolved: EvidenceCandidate[] = [];
        for (const e2 of ev) {
          if (e2.source_type === 'acr') {
            const { data: claim } = await supabase.from('wbs_completion_claims').select('id, wbs_item_id, lfa_project_id').eq('id', e2.source_id).maybeSingle();
            if (!claim) continue;
            const { data: wbs } = await supabase.from('lfa_wbs_items').select('name').eq('id', (claim as any).wbs_item_id).maybeSingle();
            const { data: proj } = await supabase.from('lfa_projects').select('name').eq('id', (claim as any).lfa_project_id).maybeSingle();
            resolved.push({ sourceType: 'acr', sourceId: e2.source_id, label: `ACR: ${(wbs as any)?.name || 'Activity'} — ${(proj as any)?.name || 'Project'}`, projectId: (claim as any).lfa_project_id });
          } else {
            const { data: finding } = await client.from('project_evaluation_findings').select('id, title, project_id').eq('id', e2.source_id).maybeSingle();
            if (!finding) continue;
            const { data: proj } = await supabase.from('lfa_projects').select('name').eq('id', (finding as any).project_id).maybeSingle();
            resolved.push({ sourceType: 'finding', sourceId: e2.source_id, label: `Finding: ${(finding as any).title} — ${(proj as any)?.name || 'Project'}`, projectId: (finding as any).project_id });
          }
        }
        setSelectedEvidence(resolved);
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, learningId, user?.id, navigate]);

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
        navigate(`/dashboard/learning/${learningId}`);
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
        navigate(`/dashboard/learning/${newId}`);
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
    <div className="mx-auto max-w-3xl space-y-4 py-2">
      <Button variant="ghost" size="sm" onClick={() => navigate(isEdit ? `/dashboard/learning/${learningId}` : '/dashboard/learning')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
      </Button>

      <Card>
        <CardContent className="space-y-4 py-6">
          <h1 className="text-xl font-bold">{isEdit ? 'Edit Learning' : 'New Learning'}</h1>

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
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Activity atau Project untuk menambahkan bukti..."
              />
            </div>
            {selectedEvidence.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedEvidence.map((e) => (
                  <Badge key={`${e.sourceType}-${e.sourceId}`} variant="secondary" className="flex items-center gap-1">
                    {e.label}
                    <button onClick={() => removeEvidence(e)}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
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
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => addEvidence(r)}
                    >
                      {r.label}
                    </button>
                  ))
                )}
              </div>
            )}
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
                ? relatedProjectNames.map((n) => <Badge key={n} variant="outline">{n}</Badge>)
                : <span className="text-xs text-muted-foreground">Otomatis terisi dari Evidence Base.</span>}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => navigate(isEdit ? `/dashboard/learning/${learningId}` : '/dashboard/learning')}>Cancel</Button>
            <Button onClick={handleSave} disabled={!canSave || saving}>
              {saving ? 'Menyimpan...' : isEdit ? 'Save Changes' : 'Save as Draft'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
