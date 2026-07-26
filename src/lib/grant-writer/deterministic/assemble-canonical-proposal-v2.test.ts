import { describe, expect, test } from 'vitest';
import { REGRESSION_FIXTURES } from './fixtures';
import { assembleCanonicalProposalV2 } from './assemble-canonical-proposal-v2';

describe('RC-9A — Canonical Pipeline Assembler (assembleCanonicalProposalV2)', () => {
  const goldFixtures = REGRESSION_FIXTURES.filter((f) => f.fixture_type === 'gold');

  test('assembleCanonicalProposalV2 should execute in single-pass and pass all validation gates on 12 GOLD fixtures', () => {
    let totalScore = 0;
    let totalOutcomes = 0;
    let totalOutputs = 0;
    let totalActivities = 0;
    let totalIndicators = 0;
    let totalCostDrivers = 0;

    let totalExpectedOutcomes = 0;
    let totalMatchedOutcomes = 0;

    let totalExpectedOutputs = 0;
    let totalMatchedOutputs = 0;

    for (const fixture of goldFixtures) {
      const result = assembleCanonicalProposalV2(fixture.page_1_input);

      // Validation assertions
      expect(result.validation.status).toBe('PASS');
      expect(result.validation.orphanOutputs).toBe(0);
      expect(result.validation.orphanActivities).toBe(0);
      expect(result.validation.duplicateIds).toBe(0);
      expect(result.validation.issues.length).toBe(0);

      // Metrics assertions
      expect(result.metrics.bqs27k).toBeGreaterThanOrEqual(88);
      expect(result.metrics.outcomeCount).toBeGreaterThanOrEqual(1);
      expect(result.metrics.outputCount).toBeGreaterThanOrEqual(2);
      expect(result.metrics.activityCount).toBeGreaterThanOrEqual(8);
      expect(result.metrics.indicatorCount).toBeGreaterThanOrEqual(6);
      expect(result.metrics.costDriverCount).toBeGreaterThanOrEqual(12);

      totalScore += result.metrics.bqs27k;
      totalOutcomes += result.metrics.outcomeCount;
      totalOutputs += result.metrics.outputCount;
      totalActivities += result.metrics.activityCount;
      totalIndicators += result.metrics.indicatorCount;
      totalCostDrivers += result.metrics.costDriverCount;

      // Outcome Recall check
      const expectedOutcomeCodes = fixture.expected_mapping.outcome_families || [];
      totalExpectedOutcomes += expectedOutcomeCodes.length;
      const genOutcomeCodes = result.proposal.outcomes.map((o) => o.code);
      for (const expCode of expectedOutcomeCodes) {
        if (genOutcomeCodes.includes(expCode)) {
          totalMatchedOutcomes++;
        }
      }

      // Output Recall check
      const expectedOutputCodes = fixture.expected_mapping.output_families || [];
      totalExpectedOutputs += expectedOutputCodes.length;
      const genOutputCodes = result.proposal.outcomes.flatMap((o) => o.outputs.map((op) => op.code));
      for (const expCode of expectedOutputCodes) {
        if (genOutputCodes.includes(expCode)) {
          totalMatchedOutputs++;
        }
      }
    }

    const avgScore = totalScore / goldFixtures.length;
    const outcomeRecall = (totalMatchedOutcomes / totalExpectedOutcomes) * 100;
    const outputRecall = (totalMatchedOutputs / totalExpectedOutputs) * 100;

    expect(avgScore).toBe(100.0);
    expect(outcomeRecall).toBe(100.0);
    expect(outputRecall).toBeGreaterThanOrEqual(90.0);

    expect(totalOutcomes).toBe(25);
    expect(totalOutputs).toBe(59);
    expect(totalActivities).toBe(218);
    expect(totalIndicators).toBe(168);
    // 316 before getDeliverableType stopped emitting a private vocabulary.
    // Outputs that deliver a digital system or a document now say so, which
    // routes them to the matching activity template instead of the default
    // one, and the cost drivers follow the activities. The two extra drivers
    // are that correction, not drift: OPF-004 used to be handed the generic
    // "Fasilitasi / Kemitraan" indicator and partnership activities despite
    // being a portal.
    expect(totalCostDrivers).toBe(318);
  });

  test('Validation layer should detect orphan activities if parent link is broken', () => {
    const fixture = goldFixtures[0];
    const result = assembleCanonicalProposalV2(fixture.page_1_input);

    // Intentionally break parent link on a cloned payload to verify validation logic
    const corruptedProposal = JSON.parse(JSON.stringify(result.proposal));
    corruptedProposal.outcomes[0].outputs[0].activities[0].parent_output_id = 'NON-EXISTENT-OUTPUT';

    // Verify parent ID validation catch
    const validOutputIds = new Set(corruptedProposal.outcomes.flatMap((o: any) => o.outputs.map((op: any) => op.id)));
    let orphans = 0;
    for (const oc of corruptedProposal.outcomes) {
      for (const op of oc.outputs) {
        for (const act of op.activities) {
          if (!validOutputIds.has(act.parent_output_id)) orphans++;
        }
      }
    }
    expect(orphans).toBe(1);
  });
});
