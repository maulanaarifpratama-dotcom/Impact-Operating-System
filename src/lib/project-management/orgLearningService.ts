/**
 * Learning Module MVP — typed application service.
 *
 * Consumes evaluation findings, recommendations, and evidence patterns.
 * Produces organizational learning records (insights).
 * Never automatically modifies Programme Design.
 *
 * Uses existing org_learning_entries table and canonical orgLearningModel.ts
 * taxonomy — no migration required.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/database.generated';
import {
  type LearningInsightType,
  type LearningScope,
} from '@/pages/dashboard/lfa-builder/types';

type Rpc = SupabaseClient<Database, 'public'>;

// ── Types ───────────────────────────────────────────────────────────────────

export type LearningEntryRow = Database['public']['Tables']['org_learning_entries']['Row'];

export interface CreateLearningInput {
  org_id: string;
  insight: string;
  insight_type: LearningInsightType;
  scope: LearningScope;
  recommendation?: string;
}

export { type LearningInsightType, type LearningScope };

// ── Queries ─────────────────────────────────────────────────────────────────

export async function listOrgLearning(
  supabase: Rpc,
  orgId: string,
): Promise<LearningEntryRow[]> {
  const { data, error } = await supabase
    .from('org_learning_entries')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as LearningEntryRow[];
}

export async function createLearningEntry(
  supabase: Rpc,
  input: CreateLearningInput,
): Promise<LearningEntryRow> {
  const { data, error } = await supabase
    .from('org_learning_entries')
    .insert({
      org_id: input.org_id,
      insight: input.insight,
      insight_type: input.insight_type,
      recommendation: input.recommendation ?? '',
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as LearningEntryRow;
}

export async function publishLearningEntry(
  supabase: Rpc,
  entryId: string,
): Promise<LearningEntryRow> {
  const { data, error } = await supabase
    .from('org_learning_entries')
    .update({ published_at: new Date().toISOString() } as any)
    .eq('id', entryId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as LearningEntryRow;
}

// ── Labels ──────────────────────────────────────────────────────────────────

export const INSIGHT_TYPE_LABELS: Record<LearningInsightType, string> = {
  good_practice: 'Good Practice',
  failure_pattern: 'Failure Pattern',
  mixed: 'Mixed',
};

export const SCOPE_LABELS: Record<LearningScope, string> = {
  project_specific: 'Project-specific',
  programme_wide: 'Programme-wide',
  organization_wide: 'Organization-wide',
};

export function getInsightTypeBadgeClass(type: string): string {
  switch (type) {
    case 'good_practice': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    case 'failure_pattern': return 'bg-red-100 text-red-700 border-red-300';
    default: return 'bg-slate-100 text-slate-600 border-slate-300';
  }
}
