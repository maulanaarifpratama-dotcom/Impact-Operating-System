// src/lib/carbon/calculators.ts
import { numericOrNull } from '@/lib/utils';
import {
  CarbonActivityItem,
  CarbonSummaryOutput,
  ScopeBreakdown,
  EnvironmentalValuationResult,
  EROIResult
} from './types';
import { CARBON_BENCHMARKS, DEFAULT_BENCHMARK_CODE } from './benchmarks';

/**
 * Calculates GHG Scope 1, 2, and 3 breakdown from activity items.
 */
export function calculateScopeBreakdown(items: CarbonActivityItem[]): ScopeBreakdown {
  let scope1_kg = 0;
  let scope2_kg = 0;
  let scope3_kg = 0;
  let unassigned_count = 0;

  for (const item of items) {
    if (item.carbon_enabled === false || item.carbon_factor == null) continue;

    const qty = numericOrNull(item.carbon_quantity);
    if (qty === null) continue;

    const impact = Number(item.carbon_factor) * qty;

    if (item.carbon_scope === 'scope_1') {
      scope1_kg += impact;
    } else if (item.carbon_scope === 'scope_2') {
      scope2_kg += impact;
    } else if (item.carbon_scope === 'scope_3') {
      scope3_kg += impact;
    } else {
      unassigned_count++;
    }
  }

  return {
    scope1_kg,
    scope2_kg,
    scope3_kg,
    unassigned_count
  };
}

/**
 * Calculates monetized environmental value from net carbon reduction tons.
 */
export function calculateEnvironmentalValue(
  netReductionTons: number,
  benchmarkCode: string = DEFAULT_BENCHMARK_CODE
): EnvironmentalValuationResult {
  const benchmark = CARBON_BENCHMARKS[benchmarkCode] || CARBON_BENCHMARKS[DEFAULT_BENCHMARK_CODE];
  const safeTons = Math.max(0, netReductionTons);

  const net_impact_value_idr = Math.round(safeTons * benchmark.price_per_ton_idr);

  return {
    benchmark_code: benchmark.code,
    benchmark_name: benchmark.name,
    price_per_ton_idr: benchmark.price_per_ton_idr,
    price_per_ton_usd: benchmark.price_per_ton_usd,
    gross_reduction_value_idr: net_impact_value_idr,
    net_impact_value_idr
  };
}

/**
 * Calculates EROI Ratio (1 : X) given environmental value generated and total investment budget.
 */
export function calculateEROI(
  environmentalValueIDR: number,
  totalBudgetIDR: number,
  netReductionTons: number = 0
): EROIResult {
  if (totalBudgetIDR <= 0) {
    return {
      eroi_ratio: 0,
      formatted_ratio: '1 : 0',
      cost_per_ton_reduced_idr: 0,
      total_investment_idr: totalBudgetIDR
    };
  }

  const eroi_ratio = Number((environmentalValueIDR / totalBudgetIDR).toFixed(2));
  const cost_per_ton = netReductionTons > 0 ? Math.round(totalBudgetIDR / netReductionTons) : 0;

  return {
    eroi_ratio,
    formatted_ratio: `1 : ${eroi_ratio}`,
    cost_per_ton_reduced_idr: cost_per_ton,
    total_investment_idr: totalBudgetIDR
  };
}

/**
 * Main pure calculation function that computes the complete carbon summary output.
 */
export function calculateCarbonSummary(
  items: CarbonActivityItem[],
  benchmarkCode: string = DEFAULT_BENCHMARK_CODE,
  totalBudgetIDR: number = 0
): CarbonSummaryOutput {
  let gross_emission_kg = 0;
  let gross_reduction_kg = 0;
  let missing_quantity_count = 0;
  let active_count = 0;

  const scope_breakdown = calculateScopeBreakdown(items);

  for (const item of items) {
    if (item.carbon_factor == null) continue;

    active_count++;

    const qty = numericOrNull(item.carbon_quantity);
    if (qty === null) {
      missing_quantity_count++;
      continue;
    }

    const impact = Number(item.carbon_factor) * qty;

    if (impact < 0) {
      gross_reduction_kg += Math.abs(impact);
    } else {
      gross_emission_kg += impact;
    }
  }

  const net_impact_kg = gross_emission_kg - gross_reduction_kg;
  const net_impact_tons = net_impact_kg / 1000;
  const trees_equivalent = Math.abs(net_impact_kg) / 5;

  const net_reduction_tons = gross_reduction_kg > gross_emission_kg ? (gross_reduction_kg - gross_emission_kg) / 1000 : 0;
  const valuation = calculateEnvironmentalValue(net_reduction_tons, benchmarkCode);

  let eroi: EROIResult | undefined = undefined;
  if (totalBudgetIDR > 0) {
    eroi = calculateEROI(valuation.net_impact_value_idr, totalBudgetIDR, net_reduction_tons);
  }

  return {
    activity_count: items.length,
    missing_quantity_count,
    gross_emission_kg: Math.round(gross_emission_kg * 100) / 100,
    gross_reduction_kg: Math.round(gross_reduction_kg * 100) / 100,
    net_impact_kg: Math.round(net_impact_kg * 100) / 100,
    net_impact_tons: Math.round(net_impact_tons * 1000) / 1000,
    trees_equivalent: Math.round(trees_equivalent * 10) / 10,
    scope_breakdown,
    valuation,
    eroi
  };
}
