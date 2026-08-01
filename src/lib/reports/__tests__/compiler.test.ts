// src/lib/reports/__tests__/compiler.test.ts
import { describe, it, expect, vi } from 'vitest';
import { compileSustainabilityReport } from '../compiler';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { name: 'Yayasan Impactory Hijau', legal_name: 'Yayasan Impactory Indonesia' },
            error: null
          }),
          eq: vi.fn().mockResolvedValue({
            data: [{ status: 'completed' }, { status: 'completed' }, { status: 'in_progress' }],
            error: null
          })
        })
      })
    })
  }
}));

// Mock ESG aggregator
vi.mock('@/lib/esg/aggregator', () => ({
  getOrgESGSummary: vi.fn().mockResolvedValue({
    organization_id: 'org-test-1',
    organization_name: 'Yayasan Impactory Hijau',
    environment: {
      carbon: {
        gross_emission_kg: 400,
        gross_reduction_kg: 1400,
        net_impact_kg: -1000,
        net_impact_tons: -1.0,
        trees_equivalent: 200,
        valuation: { net_impact_value_idr: 69000 },
        eroi: { eroi_ratio: 0.69 }
      }
    },
    social: {
      total_beneficiaries: 150,
      female_percentage: 60,
      youth_percentage: 40,
      vulnerable_percentage: 20,
      social_value_idr: 250000000,
      sroi_ratio: 2.5
    },
    governance: {
      evidence_verification_rate: 95,
      impact_readiness_score: 90,
      compliance_score: 92,
      active_risks_count: 0
    },
    sdgs: {
      aligned_sdg_numbers: [1, 3, 5, 8, 13, 17],
      primary_sdg: 13
    },
    combined_impact_multiple: 3.19
  })
}));

describe('Sustainability Report Compiler Service', () => {
  it('compiles multi-table data into UnifiedReportPayload accurately', async () => {
    const payload = await compileSustainabilityReport('org-test-1', undefined, 'GRI');

    expect(payload.organization.name).toBe('Yayasan Impactory Hijau');
    expect(payload.social_impact.total_beneficiaries).toBe(150);
    expect(payload.social_impact.sroi_ratio).toBe(2.5);
    expect(payload.environmental_impact.net_impact_co2e_tons).toBe(-1.0);
    expect(payload.environmental_impact.trees_equivalent).toBe(200);
    expect(payload.ai_narratives?.executive_statement).toContain('Yayasan Impactory Hijau');
  });
});
