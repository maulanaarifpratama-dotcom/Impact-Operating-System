import { describe, test, expect } from 'vitest';
import { REGRESSION_FIXTURES } from './fixtures';
import { collectCandidates } from './candidates';
import { expandOutcomes } from './outcome-expansion';

describe('27.5k Brain — Outcome Expansion Engine Tests', () => {
  const goldFixtures = REGRESSION_FIXTURES.filter(f => f.fixture_type === 'gold');

  test('OE-001: Should extract and expand outcomes with >= 90% recall across 12 GOLD fixtures', () => {
    let totalExpected = 0;
    let totalHits = 0;

    for (const fixture of goldFixtures) {
      const candidates = collectCandidates(fixture.page_1_input);
      const { outcomes, guardrailStatus } = expandOutcomes(fixture.page_1_input, candidates);

      expect(guardrailStatus).not.toBe('FAIL');
      expect(outcomes.length).toBeGreaterThanOrEqual(1);
      expect(outcomes.length).toBeLessThanOrEqual(3);

      const expandedCodes = outcomes.map(o => o.code);
      const expectedCodes = fixture.expected_mapping.outcome_families || [];

      const hits = expectedCodes.filter(id => expandedCodes.includes(id));
      totalExpected += expectedCodes.length;
      totalHits += hits.length;
    }

    const recall = (totalHits / totalExpected) * 100;
    console.log(`[OE-001 Verification] Outcome Recall: ${recall.toFixed(1)}% (${totalHits}/${totalExpected})`);
    expect(recall).toBeGreaterThanOrEqual(90.0);
  });

  test('OE-002: Every expanded outcome must satisfy CanonicalOutcomeV2 contract', () => {
    for (const fixture of goldFixtures) {
      const candidates = collectCandidates(fixture.page_1_input);
      const { outcomes } = expandOutcomes(fixture.page_1_input, candidates);

      for (const outcome of outcomes) {
        expect(outcome.id).toMatch(/^OC-[1-3]$/);
        expect(outcome.code).toMatch(/^OF-\d{3}$/);
        expect(outcome.outcome_name).toBeTruthy();
        expect(outcome.description).toBeTruthy();
        expect(['economic', 'health', 'education', 'environment', 'governance']).toContain(outcome.impact_category);
        expect(Array.isArray(outcome.indicators)).toBe(true);
        expect(Array.isArray(outcome.outputs)).toBe(true);
      }
    }
  });

  test('OE-003: FIX-GOLD-01 must produce 3 expected canonical outcomes (OF-003, OF-008, OF-010)', () => {
    const fix01 = goldFixtures.find(f => f.fixture_id === 'FIX-GOLD-01');
    expect(fix01).toBeDefined();

    if (fix01) {
      const candidates = collectCandidates(fix01.page_1_input);
      const { outcomes, guardrailStatus } = expandOutcomes(fix01.page_1_input, candidates);

      expect(guardrailStatus).toBe('PASS');
      expect(outcomes).toHaveLength(3);

      const codes = outcomes.map(o => o.code);
      expect(codes).toContain('OF-003');
      expect(codes).toContain('OF-008');
      expect(codes).toContain('OF-010');
    }
  });

  test('OE-004: FIX-GOLD-06 must produce 3 expected canonical outcomes (OF-003, OF-006, OF-025)', () => {
    const fix06 = goldFixtures.find(f => f.fixture_id === 'FIX-GOLD-06');
    expect(fix06).toBeDefined();

    if (fix06) {
      const candidates = collectCandidates(fix06.page_1_input);
      const { outcomes, guardrailStatus } = expandOutcomes(fix06.page_1_input, candidates);

      expect(guardrailStatus).toBe('PASS');
      expect(outcomes).toHaveLength(3);

      const codes = outcomes.map(o => o.code);
      expect(codes).toContain('OF-003');
      expect(codes).toContain('OF-006');
      expect(codes).toContain('OF-025');
    }
  });
});
