import { describe, expect, test } from 'vitest';
import { REGRESSION_FIXTURES } from './fixtures';
import { collectCandidates } from './candidates';
import { expandOutcomes } from './outcome-expansion';
import { expandOutputs } from './output-expansion';
import { decomposeActivities } from './activity-decomposition';
import { scaffoldOutcomeIndicators, scaffoldOutputIndicators } from './indicator-scaffolding';
import { extractCostDrivers } from './cost-driver-extraction';
import { evaluateBQS27K } from './bqs-27k';
import type { CanonicalProposalPayloadV2, CanonicalOutcomeV2 } from './types';

describe('27.5k Brain — Indicator Scaffolding & Cost Driver Extraction (RC-8O)', () => {
  const goldFixtures = REGRESSION_FIXTURES.filter((f) => f.fixture_type === 'gold');

  test('All 12 GOLD fixtures must achieve BQS-27K >= 88 and 100% Indicator/CostDriver coverages', () => {
    let totalScoreSum = 0;

    for (const fixture of goldFixtures) {
      const candidates = collectCandidates(fixture.page_1_input);
      const { outcomes: rawOutcomes } = expandOutcomes(fixture.page_1_input, candidates);
      const { outputs: rawOutputs } = expandOutputs(fixture.page_1_input, rawOutcomes, candidates);
      const { outputsWithActivities } = decomposeActivities(fixture.page_1_input, rawOutputs, candidates);

      const fullOutcomes: CanonicalOutcomeV2[] = rawOutcomes.map((oc) => {
        const ocIndicators = scaffoldOutcomeIndicators(fixture.page_1_input, oc);

        const childOutputs = outputsWithActivities
          .filter((op) => op.parent_outcome_id === oc.id)
          .map((op) => {
            const opIndicators = scaffoldOutputIndicators(fixture.page_1_input, op);

            const childActivities = (op.activities || []).map((act) => {
              const cds = extractCostDrivers(fixture.page_1_input, act);
              return {
                ...act,
                cost_drivers: cds
              };
            });

            return {
              ...op,
              indicators: opIndicators,
              activities: childActivities
            };
          });

        return {
          ...oc,
          indicators: ocIndicators,
          outputs: childOutputs
        };
      });

      const payload: CanonicalProposalPayloadV2 = {
        project_id: `PROJ-${fixture.fixture_id}`,
        organization_id: 'ORG-001',
        version: 2,
        metadata: {
          title: fixture.page_1_input.program_title || 'Untitled',
          geography: fixture.page_1_input.location || 'Indonesia',
          duration_months: fixture.page_1_input.duration_value || 12,
          beneficiary_count: fixture.page_1_input.beneficiary_count || 100,
          total_budget_idr: fixture.page_1_input.funding_amount || 100000000,
          target_donor: 'Global Fund',
          donor_standard: '2026'
        },
        outcomes: fullOutcomes
      };

      const bqsResult = evaluateBQS27K(payload);
      totalScoreSum += bqsResult.total_score;

      expect(bqsResult.total_score).toBeGreaterThanOrEqual(88);
      expect(bqsResult.metrics.outcome_indicator_coverage).toBeGreaterThanOrEqual(0.90);
      expect(bqsResult.metrics.output_indicator_coverage).toBeGreaterThanOrEqual(0.90);
      expect(bqsResult.metrics.cost_driver_coverage).toBeGreaterThanOrEqual(0.90);
    }

    const avgScore = totalScoreSum / goldFixtures.length;
    expect(avgScore).toBeGreaterThanOrEqual(95);
  });

  test('FIX-GOLD-01 must extract 150 petani, 12 bulan, and yield/income indicators', () => {
    const fixture = goldFixtures.find((f) => f.fixture_id === 'FIX-GOLD-01')!;
    const candidates = collectCandidates(fixture.page_1_input);
    const { outcomes: rawOutcomes } = expandOutcomes(fixture.page_1_input, candidates);
    const oc = rawOutcomes[0];
    const indicators = scaffoldOutcomeIndicators(fixture.page_1_input, oc);

    const indNames = indicators.map((i) => i.indicator_name.toLowerCase());
    expect(indNames.some((n) => n.includes('produktivitas') || n.includes('yield'))).toBe(true);
    expect(indNames.some((n) => n.includes('pendapatan') || n.includes('income'))).toBe(true);
  });

  test('FIX-GOLD-06 must extract 400 lansia, 5 posyandu, and screening indicators', () => {
    const fixture = goldFixtures.find((f) => f.fixture_id === 'FIX-GOLD-06')!;
    const candidates = collectCandidates(fixture.page_1_input);
    const { outcomes: rawOutcomes } = expandOutcomes(fixture.page_1_input, candidates);
    const oc = rawOutcomes[0];
    const indicators = scaffoldOutcomeIndicators(fixture.page_1_input, oc);

    const indNames = indicators.map((i) => i.indicator_name.toLowerCase());
    expect(indNames.some((n) => n.includes('skrining') || n.includes('screening'))).toBe(true);
  });

  test('FIX-GOLD-12 must extract 5 OPD, 5000 warga, and SLA/satisfaction indicators', () => {
    const fixture = goldFixtures.find((f) => f.fixture_id === 'FIX-GOLD-12')!;
    const candidates = collectCandidates(fixture.page_1_input);
    const { outcomes: rawOutcomes } = expandOutcomes(fixture.page_1_input, candidates);
    const oc = rawOutcomes[0];
    const indicators = scaffoldOutcomeIndicators(fixture.page_1_input, oc);

    const indNames = indicators.map((i) => i.indicator_name.toLowerCase());
    expect(indNames.some((n) => n.includes('respons') || n.includes('sla'))).toBe(true);
  });
});
