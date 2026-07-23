import { describe, expect, test } from 'vitest';
import { expandOutcomes } from './outcome-expansion';
import { expandOutputs } from './output-expansion';
import { decomposeActivities } from './activity-decomposition';
import { collectCandidates } from './candidates';
import { REGRESSION_FIXTURES } from './fixtures';

describe('27.5k Brain — Activity Decomposition Engine (RC-8N)', () => {
  const goldFixtures = REGRESSION_FIXTURES.filter((f) => f.fixture_type === 'gold');

  test('Activity decomposition across all 12 GOLD fixtures must achieve 100% Guardrail PASS rate and 0 orphans', () => {
    let totalOutputs = 0;
    let totalActivities = 0;
    let totalOrphans = 0;
    let totalPass = 0;

    for (const fixture of goldFixtures) {
      const candidates = collectCandidates(fixture.page_1_input);
      const { outcomes } = expandOutcomes(fixture.page_1_input, candidates);
      const { outputs } = expandOutputs(fixture.page_1_input, outcomes, candidates);
      const { activities, guardrail_status } = decomposeActivities(fixture.page_1_input, outputs, candidates);

      totalOutputs += outputs.length;
      totalActivities += activities.length;

      if (guardrail_status === 'PASS') {
        totalPass++;
      }

      const validOutputIds = new Set(outputs.map((op) => op.id));
      for (const act of activities) {
        if (!act.parent_output_id || !validOutputIds.has(act.parent_output_id)) {
          totalOrphans++;
        }
      }
    }

    expect(totalPass).toBe(goldFixtures.length);
    expect(totalOrphans).toBe(0);

    const avgActivitiesPerOutput = totalActivities / totalOutputs;
    expect(avgActivitiesPerOutput).toBeGreaterThanOrEqual(2.0);
    expect(avgActivitiesPerOutput).toBeLessThanOrEqual(4.0);
  });

  test('Activities in FIX-GOLD-01 must have valid parent_output_id, operational type, and non-empty owner_role', () => {
    const fixture = goldFixtures.find((f) => f.fixture_id === 'FIX-GOLD-01')!;
    const candidates = collectCandidates(fixture.page_1_input);
    const { outcomes } = expandOutcomes(fixture.page_1_input, candidates);
    const { outputs } = expandOutputs(fixture.page_1_input, outcomes, candidates);
    const { activities, outputsWithActivities } = decomposeActivities(fixture.page_1_input, outputs, candidates);

    expect(activities.length).toBeGreaterThanOrEqual(6);
    expect(outputsWithActivities.length).toBe(outputs.length);

    for (const act of activities) {
      expect(act.parent_output_id).toMatch(/^OP-\d+$/);
      expect(act.activity_type).toBeDefined();
      expect(act.owner_role).toBeTruthy();
      expect(act.cost_drivers).toEqual([]);
    }
  });

  test('Activities in FIX-GOLD-12 (Software Dev) must assign software_dev or workshop type', () => {
    const fixture = goldFixtures.find((f) => f.fixture_id === 'FIX-GOLD-12')!;
    const candidates = collectCandidates(fixture.page_1_input);
    const { outcomes } = expandOutcomes(fixture.page_1_input, candidates);
    const { outputs } = expandOutputs(fixture.page_1_input, outcomes, candidates);
    const { activities } = decomposeActivities(fixture.page_1_input, outputs, candidates);

    const types = activities.map((act) => act.activity_type);
    expect(types).toContain('software_dev');
  });
});
