import { supabase } from '@/integrations/supabase/client';

export interface EvidenceCandidate {
  sourceType: 'acr' | 'finding';
  sourceId: string;
  label: string;
  projectId: string;
}

// Evidence Base picker: generalizes the search-and-select pattern already
// used for Evaluation Findings' "Related Evidence" field (AcrTab), extended
// to search Verified ACRs and Findings across every project in the org, not
// just one. Sprint-1 adequate — name-match search, not a full-text engine.
export async function searchEvidenceCandidates(query: string): Promise<EvidenceCandidate[]> {
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

// Evidence selection defaults to the current project first when authoring
// from a project's MEAL > Learning tab. This only changes what's shown
// before the user types a search query — search itself still reaches
// every project in the org, unchanged.
export async function loadProjectEvidenceCandidates(projectId: string): Promise<EvidenceCandidate[]> {
  const client = supabase as any;
  const [claimsRes, findingsRes, projectRes] = await Promise.all([
    supabase.from('wbs_completion_claims').select('id, wbs_item_id').eq('lfa_project_id', projectId).eq('status', 'verified').order('submitted_at', { ascending: false }).limit(10),
    client.from('project_evaluation_findings').select('id, title').eq('project_id', projectId).order('created_at', { ascending: false }).limit(10),
    supabase.from('lfa_projects').select('name').eq('id', projectId).maybeSingle(),
  ]);
  const claims = (claimsRes.data || []) as { id: string; wbs_item_id: string }[];
  const findings = (findingsRes.data || []) as { id: string; title: string }[];
  const projectName = (projectRes.data as any)?.name || 'Project';

  const wbsIds = Array.from(new Set(claims.map((c) => c.wbs_item_id)));
  const wbsNameById = new Map<string, string>();
  if (wbsIds.length > 0) {
    const { data } = await supabase.from('lfa_wbs_items').select('id, name').in('id', wbsIds);
    for (const w of ((data || []) as any[])) wbsNameById.set(w.id, w.name || 'Activity');
  }

  const acrCandidates: EvidenceCandidate[] = claims.map((c) => ({
    sourceType: 'acr' as const,
    sourceId: c.id,
    label: `ACR: ${wbsNameById.get(c.wbs_item_id) || 'Activity'} — ${projectName}`,
    projectId,
  }));
  const findingCandidates: EvidenceCandidate[] = findings.map((f) => ({
    sourceType: 'finding' as const,
    sourceId: f.id,
    label: `Finding: ${f.title} — ${projectName}`,
    projectId,
  }));

  return [...acrCandidates, ...findingCandidates];
}

// Re-resolve labels for evidence rows already stored on an entry (Edit mode),
// using the same candidate shape the picker produces so chips render consistently.
export async function resolveEvidenceCitations(rows: { source_type: 'acr' | 'finding'; source_id: string }[]): Promise<EvidenceCandidate[]> {
  const client = supabase as any;
  const resolved: EvidenceCandidate[] = [];
  for (const row of rows) {
    if (row.source_type === 'acr') {
      const { data: claim } = await supabase.from('wbs_completion_claims').select('id, wbs_item_id, lfa_project_id').eq('id', row.source_id).maybeSingle();
      if (!claim) continue;
      const { data: wbs } = await supabase.from('lfa_wbs_items').select('name').eq('id', (claim as any).wbs_item_id).maybeSingle();
      const { data: proj } = await supabase.from('lfa_projects').select('name').eq('id', (claim as any).lfa_project_id).maybeSingle();
      resolved.push({ sourceType: 'acr', sourceId: row.source_id, label: `ACR: ${(wbs as any)?.name || 'Activity'} — ${(proj as any)?.name || 'Project'}`, projectId: (claim as any).lfa_project_id });
    } else {
      const { data: finding } = await client.from('project_evaluation_findings').select('id, title, project_id').eq('id', row.source_id).maybeSingle();
      if (!finding) continue;
      const { data: proj } = await supabase.from('lfa_projects').select('name').eq('id', (finding as any).project_id).maybeSingle();
      resolved.push({ sourceType: 'finding', sourceId: row.source_id, label: `Finding: ${(finding as any).title} — ${(proj as any)?.name || 'Project'}`, projectId: (finding as any).project_id });
    }
  }
  return resolved;
}
