// src/lib/carbon/engine.ts
import { supabase } from '@/integrations/supabase/client';
import { CarbonActivityItem, CarbonSummaryOutput } from './types';
import { calculateCarbonSummary } from './calculators';

/**
 * Orchestration service for fetching WBS activities from Supabase and computing the carbon summary.
 */
export async function getProjectCarbonSummary(
  projectId: string,
  orgId: string,
  benchmarkCode?: string,
  totalBudgetIDR: number = 0
): Promise<CarbonSummaryOutput | null> {
  const { data, error } = await supabase
    .from('lfa_wbs_items' as any)
    .select('id, name, carbon_enabled, carbon_factor, carbon_quantity, carbon_unit, carbon_source, carbon_scope')
    .eq('lfa_project_id', projectId)
    .eq('org_id', orgId)
    .eq('carbon_enabled', true)
    .eq('level', 2);

  if (error || !data) return null;

  return calculateCarbonSummary(data as CarbonActivityItem[], benchmarkCode, totalBudgetIDR);
}

/**
 * Orchestration service for fetching organization-wide WBS activities from Supabase and computing the carbon summary.
 */
export async function getOrgCarbonSummary(
  orgId: string,
  benchmarkCode?: string,
  totalBudgetIDR: number = 0
): Promise<CarbonSummaryOutput | null> {
  const { data, error } = await supabase
    .from('lfa_wbs_items' as any)
    .select('id, name, carbon_enabled, carbon_factor, carbon_quantity, carbon_unit, carbon_source, carbon_scope')
    .eq('org_id', orgId)
    .eq('carbon_enabled', true)
    .eq('level', 2);

  if (error || !data) return null;

  return calculateCarbonSummary(data as CarbonActivityItem[], benchmarkCode, totalBudgetIDR);
}
