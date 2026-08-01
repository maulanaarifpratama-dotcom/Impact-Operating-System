import type { SupabaseClient } from '@supabase/supabase-js';

export interface TargetBudgetSources {
  gwBudgetIdr?: unknown;
  gwWizardBudgetIdr?: unknown;
  gwMetadataTotalBudgetIdr?: unknown;
  documentMetaBudgetIdr?: unknown;
  lfaProjectTargetBudgetIdr?: unknown;
}

function toPositiveNumber(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Canonical target budget resolver used across UI modules.
 *
 * Priority order:
 * 1) gw_projects.budget_idr (normalized writer output)
 * 2) gw_projects.wizard_data.budgetIdr
 * 3) gw_projects.metadata.total_budget_idr
 * 4) generated document matrix.meta.budgetIdr
 * 5) lfa_projects.target_budget_idr (legacy/fallback)
 */
export function resolveTargetBudget(sources: TargetBudgetSources): number | null {
  return (
    toPositiveNumber(sources.gwBudgetIdr)
    ?? toPositiveNumber(sources.gwWizardBudgetIdr)
    ?? toPositiveNumber(sources.gwMetadataTotalBudgetIdr)
    ?? toPositiveNumber(sources.documentMetaBudgetIdr)
    ?? toPositiveNumber(sources.lfaProjectTargetBudgetIdr)
    ?? null
  );
}

type RuntimeGwProject = {
  id: string;
  budget_idr?: unknown;
  wizard_data?: Record<string, unknown> | null;
};

async function loadCurrentDocumentBudgetIdr(
  supabase: SupabaseClient,
  gwProjectId: string,
): Promise<number | null> {
  const { data } = await supabase
    .from('gw_lfa_documents')
    .select('matrix')
    .eq('project_id', gwProjectId)
    .eq('is_current', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const matrix = (data as any)?.matrix;
  return resolveTargetBudget({
    documentMetaBudgetIdr: matrix?.meta?.budgetIdr,
  });
}

export async function resolveTargetBudgetForLfaProject(
  supabase: SupabaseClient,
  lfaProjectId: string,
): Promise<number | null> {
  const { data: proj } = await supabase
    .from('lfa_projects')
    .select('*')
    .eq('id', lfaProjectId)
    .maybeSingle();

  if (!proj) return null;

  let gwProject: RuntimeGwProject | null = null;
  const linkedGrantId = (proj as any).linked_grant_id as string | null | undefined;

  if (linkedGrantId) {
    const { data } = await supabase
      .from('gw_projects' as any)
      .select('id, budget_idr, wizard_data')
      .eq('id', linkedGrantId)
      .maybeSingle();
    gwProject = (data as RuntimeGwProject | null) ?? null;
  }

  if (!gwProject) {
    const { data } = await supabase
      .from('gw_projects' as any)
      .select('id, budget_idr, wizard_data, updated_at')
      .eq('wizard_data->>lfa_project_id', lfaProjectId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    gwProject = (data as RuntimeGwProject | null) ?? null;
  }

  const documentMetaBudgetIdr = gwProject?.id
    ? await loadCurrentDocumentBudgetIdr(supabase, gwProject.id)
    : null;

  return resolveTargetBudget({
    gwBudgetIdr: gwProject?.budget_idr,
    gwWizardBudgetIdr: (gwProject?.wizard_data as any)?.budgetIdr,
    documentMetaBudgetIdr,
    lfaProjectTargetBudgetIdr: (proj as any).target_budget_idr,
  });
}
