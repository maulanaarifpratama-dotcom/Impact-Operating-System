// src/lib/esg/__tests__/aggregator.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getOrgESGSummary } from '../aggregator';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { gender: 'female', age_group: 'youth', is_vulnerable: true },
            { gender: 'male', age_group: 'adult', is_vulnerable: false }
          ],
          error: null
        })
      })
    })
  }
}));

// Mock carbon engine
vi.mock('@/lib/carbon/engine', () => ({
  getOrgCarbonSummary: vi.fn().mockResolvedValue({
    activity_count: 5,
    missing_quantity_count: 0,
    gross_emission_kg: 500,
    gross_reduction_kg: 1500,
    net_impact_kg: -1000,
    net_impact_tons: -1.0,
    trees_equivalent: 200,
    scope_breakdown: { scope1_kg: 200, scope2_kg: 300, scope3_kg: -1500, unassigned_count: 0 },
    valuation: {
      benchmark_code: 'IDX_CARBON',
      benchmark_name: 'Bursa Karbon Indonesia (IDXCarbon)',
      price_per_ton_idr: 69000,
      price_per_ton_usd: 4.31,
      gross_reduction_value_idr: 69000,
      net_impact_value_idr: 69000
    },
    eroi: {
      eroi_ratio: 0.69,
      formatted_ratio: '1 : 0.69',
      cost_per_ton_reduced_idr: 100000,
      total_investment_idr: 100000
    }
  })
}));

describe('ESG Aggregation Service', () => {
  it('aggregates ESG summary payload accurately', async () => {
    const summary = await getOrgESGSummary('org-123', 'Yayasan Peduli Bencana');

    expect(summary.organization_id).toBe('org-123');
    expect(summary.organization_name).toBe('Yayasan Peduli Bencana');
    expect(summary.environment.carbon.net_impact_kg).toBe(-1000);
    expect(summary.social.total_beneficiaries).toBe(2);
    expect(summary.social.female_percentage).toBe(50);
    expect(summary.governance.impact_readiness_score).toBe(85);
  });
});
