import { supabase } from '@/integrations/supabase/client';

export interface CarbonSummary {
  totalCarbonKg: number;
  reductionKg: number;
  emissionKg: number;
  netImpact: 'reduction' | 'emission' | 'neutral';
  activitiesWithCarbon: number;
  activitiesMissingQuantity: number;
  equivalentTrees: number;
}

export function computeCarbonSummary(data: any[]): CarbonSummary {
  let total = 0;
  let reduction = 0;
  let emission = 0;
  let count = 0;
  let missingQtyCount = 0;

  for (const item of data) {
    if (item.carbon_factor == null) continue;

    count++;

    const qty = item.carbon_quantity;
    if (qty == null || qty === '' || isNaN(Number(qty))) {
      missingQtyCount++;
      continue;
    }

    const impact = Number(item.carbon_factor) * Number(qty);

    total += impact;

    if (impact < 0) {
      reduction += Math.abs(impact);
    } else {
      emission += impact;
    }
  }

  const netImpact =
    total < 0 ? 'reduction' :
    total > 0 ? 'emission' :
    'neutral';

  return {
    totalCarbonKg: total,
    reductionKg: reduction,
    emissionKg: emission,
    netImpact,
    activitiesWithCarbon: count,
    activitiesMissingQuantity: missingQtyCount,
    equivalentTrees: Math.abs(total) / 5
  };
}

export async function getProjectCarbonSummary(projectId: string, orgId: string): Promise<CarbonSummary | null> {
  const { data, error } = await supabase
    .from('lfa_wbs_items' as any)
    .select('carbon_factor, carbon_quantity, carbon_scope, level')
    .eq('lfa_project_id', projectId)
    .eq('org_id', orgId)
    .eq('carbon_enabled', true)
    .eq('level', 2);

  if (error || !data) return null;

  return computeCarbonSummary(data);
}

export async function getOrgCarbonSummary(orgId: string): Promise<CarbonSummary | null> {
  const { data, error } = await supabase
    .from('lfa_wbs_items' as any)
    .select('carbon_factor, carbon_quantity, carbon_scope, level')
    .eq('org_id', orgId)
    .eq('carbon_enabled', true)
    .eq('level', 2);

  if (error || !data) return null;

  return computeCarbonSummary(data);
}
