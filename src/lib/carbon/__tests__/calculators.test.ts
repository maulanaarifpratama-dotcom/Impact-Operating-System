// src/lib/carbon/__tests__/calculators.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateCarbonSummary,
  calculateScopeBreakdown,
  calculateEnvironmentalValue,
  calculateEROI
} from '../calculators';
import { CarbonActivityItem } from '../types';

describe('Shared Carbon Engine Calculators', () => {
  const sampleActivities: CarbonActivityItem[] = [
    {
      name: 'Operasional Kendaraan Lapangan',
      carbon_enabled: true,
      carbon_factor: 2.5,
      carbon_quantity: 100, // +250 kg CO2
      carbon_scope: 'scope_1'
    },
    {
      name: 'Konsumsi Listrik Kantor PLN',
      carbon_enabled: true,
      carbon_factor: 0.8,
      carbon_quantity: 500, // +400 kg CO2
      carbon_scope: 'scope_2'
    },
    {
      name: 'Penanaman Pohon Reforestrasi',
      carbon_enabled: true,
      carbon_factor: -15.0,
      carbon_quantity: 100, // -1500 kg CO2 (reduction)
      carbon_scope: 'scope_3'
    },
    {
      name: 'Aktivitas Belum Diisi Volume',
      carbon_enabled: true,
      carbon_factor: 5.0,
      carbon_quantity: null,
      carbon_scope: 'scope_1'
    }
  ];

  it('calculates gross emissions, gross reductions, and net impact correctly', () => {
    const summary = calculateCarbonSummary(sampleActivities);

    expect(summary.gross_emission_kg).toBe(650); // 250 + 400
    expect(summary.gross_reduction_kg).toBe(1500); // 1500
    expect(summary.net_impact_kg).toBe(-850); // 650 - 1500 = -850 kg
    expect(summary.net_impact_tons).toBe(-0.85);
    expect(summary.missing_quantity_count).toBe(1);
  });

  it('calculates tree equivalent accurately', () => {
    const summary = calculateCarbonSummary(sampleActivities);
    expect(summary.trees_equivalent).toBe(170); // 850 / 5 = 170 trees
  });

  it('calculates scope breakdown accurately', () => {
    const breakdown = calculateScopeBreakdown(sampleActivities);
    expect(breakdown.scope1_kg).toBe(250);
    expect(breakdown.scope2_kg).toBe(400);
    expect(breakdown.scope3_kg).toBe(-1500);
    expect(breakdown.unassigned_count).toBe(0);
  });

  it('computes environmental value using IDXCarbon benchmark', () => {
    // Net reduction = 1500 - 650 = 850 kg = 0.85 tons
    // IDXCarbon = Rp 69.000 / ton
    // Value = 0.85 * 69000 = Rp 58.650
    const valuation = calculateEnvironmentalValue(0.85, 'IDX_CARBON');
    expect(valuation.benchmark_code).toBe('IDX_CARBON');
    expect(valuation.net_impact_value_idr).toBe(58650);
  });

  it('computes EROI ratio correctly when budget is provided', () => {
    const eroi = calculateEROI(58650, 100000, 0.85); // Budget Rp 100.000
    // EROI = 58650 / 100000 = 0.59
    expect(eroi.eroi_ratio).toBe(0.59);
    expect(eroi.formatted_ratio).toBe('1 : 0.59');
    expect(eroi.cost_per_ton_reduced_idr).toBe(117647); // 100.000 / 0.85
  });
});
