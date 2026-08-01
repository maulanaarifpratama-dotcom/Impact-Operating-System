// src/lib/carbon/types.ts

export type GHGScope = 'scope_1' | 'scope_2' | 'scope_3' | 'unassigned';

export interface CarbonActivityItem {
  id?: string;
  name?: string;
  carbon_enabled?: boolean;
  carbon_factor?: number | null;
  carbon_quantity?: number | string | null;
  carbon_unit?: string | null;
  carbon_source?: string | null;
  carbon_scope?: string | null;
}

export interface ScopeBreakdown {
  scope1_kg: number;
  scope2_kg: number;
  scope3_kg: number;
  unassigned_count: number;
}

export interface EnvironmentalValuationResult {
  benchmark_code: string;
  benchmark_name: string;
  price_per_ton_idr: number;
  price_per_ton_usd: number;
  gross_reduction_value_idr: number;
  net_impact_value_idr: number;
}

export interface EROIResult {
  eroi_ratio: number;
  formatted_ratio: string;
  cost_per_ton_reduced_idr: number;
  total_investment_idr: number;
}

export interface CarbonSummaryOutput {
  activity_count: number;
  missing_quantity_count: number;
  gross_emission_kg: number;
  gross_reduction_kg: number;
  net_impact_kg: number;
  net_impact_tons: number;
  trees_equivalent: number;
  scope_breakdown: ScopeBreakdown;
  valuation: EnvironmentalValuationResult;
  eroi?: EROIResult;
}
