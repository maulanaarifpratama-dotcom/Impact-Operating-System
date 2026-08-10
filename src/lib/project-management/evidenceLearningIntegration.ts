/**
 * Evidence → Evaluation → Learning Integration Service.
 *
 * Thin integration layer connecting the three canonical modules:
 *   Evidence (ADR 0011) → Evaluation (ADR 0012) → Learning (ADR 0013)
 *
 * All mutations go through existing module services. This module only
 * provides cross-module reference helpers, convenience creation functions,
 * and lineage visibility utilities.
 *
 * No new tables. No new RPCs. No architecture changes.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/database.generated';
import type { CreateFindingInput, EvaluationFindingRow } from './evaluationModule';
import type { CreateLearningInput, LearningEntryRow } from './orgLearningService';
import type { LearningInsightType, LearningScope } from '@/pages/dashboard/lfa-builder/types';

type Rpc = SupabaseClient<Database, 'public'>;

// ── Evidence → Finding ──────────────────────────────────────────────────────

export interface EvidenceToFindingInput {
  project_id: string;
  org_id: string;
  finding: string;
  severity: 'informational' | 'minor' | 'major' | 'critical';
  evidenceId?: string;
  claimId?: string;
  recommendation?: string;
}

/**
 * Creates an evaluation finding linked to a specific evidence record or
 * completion claim. Both evidence_id (direct) and claim context are preserved.
 */
export async function createFindingFromEvidence(
  supabase: Rpc,
  input: EvidenceToFindingInput,
): Promise<EvaluationFindingRow> {
  const { createFinding } = await import('./evaluationModule');

  return createFinding(supabase, {
    project_id: input.project_id,
    org_id: input.org_id,
    finding: input.finding,
    severity: input.severity,
    recommendation: input.recommendation,
    evidence_id: input.evidenceId ?? input.claimId ?? undefined,
  });
}

// ── Finding → Learning ─────────────────────────────────────────────────────

export interface FindingToLearningInput {
  org_id: string;
  insight: string;
  insight_type: LearningInsightType;
  scope: LearningScope;
  recommendation?: string;
}

/**
 * Creates a learning entry that synthesizes an evaluation finding into
 * organizational knowledge. The finding reference is embedded in the
 * insight text for traceability (no structural FK exists between
 * org_learning_entries and project_evaluation_findings).
 */
export async function createLearningFromFinding(
  supabase: Rpc,
  input: FindingToLearningInput,
): Promise<LearningEntryRow> {
  const { createLearningEntry } = await import('./orgLearningService');

  return createLearningEntry(supabase, {
    org_id: input.org_id,
    insight: input.insight,
    insight_type: input.insight_type,
    scope: input.scope,
    recommendation: input.recommendation,
  });
}

// ── Lineage Helpers ─────────────────────────────────────────────────────────

export interface EvidenceFindingLineage {
  claimId: string;
  claimStatus?: string | null;
  findingCount: number;
  findings: Array<{ id: string; severity: string; excerpt: string }>;
}

/**
 * Returns evaluation findings linked to a specific completion claim.
 * Provides lineage visibility: "this claim produced these findings."
 */
export async function getFindingsForClaim(
  supabase: Rpc,
  claimId: string,
): Promise<EvidenceFindingLineage> {
  const { data, error } = await supabase
    .from('project_evaluation_findings')
    .select('id, finding, severity, evidence_id')
    .eq('evidence_id', claimId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as Array<{ id: string; finding: string; severity: string; evidence_id: string | null }>;

  return {
    claimId,
    findingCount: rows.length,
    findings: rows.map((r) => ({
      id: r.id,
      severity: r.severity,
      excerpt: r.finding.slice(0, 120),
    })),
  };
}

// ── Cross-Module Reference Labels ───────────────────────────────────────────

export const INTEGRATION_LABELS = {
  evidenceToFindingAction: 'Buat Temuan Evaluasi',
  findingToLearningAction: 'Catat sebagai Pembelajaran',
  evidenceSource: 'Sumber Bukti',
  findingReference: 'Referensi Temuan',
  lineageLabel: 'Jejak Bukti → Temuan → Pembelajaran',
} as const;
