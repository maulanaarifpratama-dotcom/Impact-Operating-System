/**
 * Evaluation Module MVP — typed application service.
 *
 * Consumes evidence (read-only). Produces findings and recommendations.
 * Never mutates evidence, PM records, or Programme Design.
 *
 * Uses existing project_evaluation_findings table — no migration required.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/database.generated';

type Rpc = SupabaseClient<Database, 'public'>;

// ── Types ───────────────────────────────────────────────────────────────────

export type EvaluationFindingRow = Database['public']['Tables']['project_evaluation_findings']['Row'];

export type FindingSeverity = 'informational' | 'minor' | 'major' | 'critical';
export type FindingStatus = 'draft' | 'approved' | 'closed';

export interface CreateFindingInput {
  project_id: string;
  org_id: string;
  finding: string;
  severity: FindingSeverity;
  recommendation?: string;
  evidence_id?: string;
}

// ── Queries ─────────────────────────────────────────────────────────────────

export async function listProjectFindings(
  supabase: Rpc,
  projectId: string,
): Promise<EvaluationFindingRow[]> {
  const { data, error } = await supabase
    .from('project_evaluation_findings')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as EvaluationFindingRow[];
}

export async function createFinding(
  supabase: Rpc,
  input: CreateFindingInput,
): Promise<EvaluationFindingRow> {
  const { data, error } = await supabase
    .from('project_evaluation_findings')
    .insert({
      org_id: input.org_id,
      project_id: input.project_id,
      finding: input.finding,
      severity: input.severity,
      recommendation: input.recommendation ?? null,
      evidence_id: input.evidence_id ?? null,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as EvaluationFindingRow;
}

export async function deleteFinding(
  supabase: Rpc,
  findingId: string,
): Promise<void> {
  const { error } = await supabase
    .from('project_evaluation_findings')
    .delete()
    .eq('id', findingId);

  if (error) throw error;
}

// ── Labels ──────────────────────────────────────────────────────────────────

export const SEVERITY_LABELS: Record<FindingSeverity, string> = {
  informational: 'Informasi',
  minor: 'Minor',
  major: 'Mayor',
  critical: 'Kritis',
};

export function getSeverityBadgeClass(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-700 border-red-300';
    case 'major': return 'bg-orange-100 text-orange-700 border-orange-300';
    case 'minor': return 'bg-amber-100 text-amber-700 border-amber-300';
    default: return 'bg-slate-100 text-slate-600 border-slate-300';
  }
}

// ── Evidence Linking ────────────────────────────────────────────────────────

export interface EvidenceRef {
  id: string;
  type: 'completion_claim' | 'tracking_entry' | 'completion_evidence';
  label: string;
}

export function getEvidenceRefsFromClaims(
  claims: Array<{ id: string; wbs_item_name?: string | null; status?: string }>,
): EvidenceRef[] {
  return claims
    .filter((c) => c.status === 'verified')
    .map((c) => ({
      id: c.id,
      type: 'completion_claim' as const,
      label: `ACR: ${c.wbs_item_name || c.id.slice(0, 8)}`,
    }));
}
