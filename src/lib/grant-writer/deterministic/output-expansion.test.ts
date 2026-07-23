import { describe, expect, test } from 'vitest';
import { expandOutcomes } from './outcome-expansion';
import { expandOutputs } from './output-expansion';
import { collectCandidates } from './candidates';
import { REGRESSION_FIXTURES } from './fixtures';

describe('27.5k Brain — Output Expansion Engine (RC-8M)', () => {
  const goldFixtures = REGRESSION_FIXTURES.filter((f) => f.fixture_type === 'gold');

  test('Output Recall across GOLD fixtures must be >= 85%', () => {
    let totalExpected = 0;
    let totalHits = 0;
    let totalOrphans = 0;

    for (const fixture of goldFixtures) {
      const candidates = collectCandidates(fixture.page_1_input);
      const { outcomes } = expandOutcomes(fixture.page_1_input, candidates);
      const { outputs } = expandOutputs(fixture.page_1_input, outcomes, candidates);

      const expectedFamilyIds = fixture.expected_mapping.output_families || [];
      totalExpected += expectedFamilyIds.length;

      const expandedFamilyIds = outputs.map((op) => op.code);

      // Check orphan outputs
      for (const op of outputs) {
        if (!op.parent_outcome_id) {
          totalOrphans++;
        }
      }

      for (const expId of expectedFamilyIds) {
        if (expandedFamilyIds.includes(expId)) {
          totalHits++;
        }
      }
    }

    const recall = totalHits / totalExpected;
    expect(recall).toBeGreaterThanOrEqual(0.85);
    expect(totalOrphans).toBe(0);
  });

  test('Outputs in FIX-GOLD-01 must have valid parent_outcome_id and codes', () => {
    const fixture = goldFixtures.find((f) => f.fixture_id === 'FIX-GOLD-01')!;
    const candidates = collectCandidates(fixture.page_1_input);
    const { outcomes } = expandOutcomes(fixture.page_1_input, candidates);
    const { outputs } = expandOutputs(fixture.page_1_input, outcomes, candidates);

    expect(outputs.length).toBeGreaterThanOrEqual(2);
    for (const op of outputs) {
      expect(op.parent_outcome_id).toMatch(/^OC-\d+$/);
      expect(op.deliverable_type).toBeDefined();
      expect(op.output_name).toBeTruthy();
    }
  });

  test('Outputs in FIX-GOLD-12 must contain OPF-020, OPF-010, or OPF-026', () => {
    const fixture = goldFixtures.find((f) => f.fixture_id === 'FIX-GOLD-12')!;
    const candidates = collectCandidates(fixture.page_1_input);
    const { outcomes } = expandOutcomes(fixture.page_1_input, candidates);
    const { outputs } = expandOutputs(fixture.page_1_input, outcomes, candidates);

    const codes = outputs.map((op) => op.code);
    expect(codes).toContain('OPF-020');
    expect(codes).toContain('OPF-010');
    expect(codes).toContain('OPF-026');
  });
});
