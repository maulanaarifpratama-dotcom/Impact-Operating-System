import { describe, it, expect } from 'vitest';
import { assembleCanonicalProposalV2 } from '../grant-writer/deterministic/assemble-canonical-proposal-v2';
import { REGRESSION_FIXTURES } from '../grant-writer/deterministic/fixtures';
import {
  materializeCanonicalProposalToLfaView,
  mapCanonicalProposalToRawEntries,
  extractCanonicalOutputs,
  extractCanonicalActivities,
  extractCanonicalIndicators,
  extractCanonicalCostDrivers,
} from './readAdapter';

describe('RC-9B — Materializer Cutover to Canonical Proposal V2', () => {
  const goldFixtures = REGRESSION_FIXTURES.filter((f) => f.fixture_type === 'gold');

  it('should find all 12 GOLD fixtures in REGRESSION_FIXTURES', () => {
    expect(goldFixtures.length).toBe(12);
  });

  it('should materialize CanonicalProposalPayloadV2 directly into CanonicalLfaView for FIX-GOLD-01', () => {
    const fixture = goldFixtures.find((f) => f.fixture_id === 'FIX-GOLD-01');
    expect(fixture).toBeDefined();

    const { proposal } = assembleCanonicalProposalV2(fixture!.page_1_input);
    expect(proposal).toBeDefined();

    const lfaView = materializeCanonicalProposalToLfaView(proposal);

    // Verify Direct Node Counts
    expect(lfaView.outcomes.length).toBe(proposal.outcomes.length);
    expect(lfaView.outputs.length).toBe(extractCanonicalOutputs(proposal).length);
    expect(lfaView.activities.length).toBe(extractCanonicalActivities(proposal).length);

    // Verify 0 Orphans & Structural Complete
    expect(lfaView.unusedOutcomes.length).toBe(0);
    expect(lfaView.unassignedOutputs.length).toBe(0);
    expect(lfaView.orphanedActivities.length).toBe(0);
    expect(lfaView.structuralStatus).toBe('COMPLETE');
    expect(lfaView.presentationMode).toBe('EXPANDED_CONFIRMED');

    // Verify Indicator and Cost Driver Counts
    const indicators = extractCanonicalIndicators(proposal);
    const costDrivers = extractCanonicalCostDrivers(proposal);
    expect(indicators.length).toBeGreaterThan(0);
    expect(costDrivers.length).toBeGreaterThan(0);

    // Verify Hierarchy
    lfaView.outputs.forEach((opNode) => {
      expect(opNode.parentRef).not.toBeNull();
      expect(opNode.parentRef?.nodeType).toBe('outcome');
      // Parent outcome exists in lfaView.outcomes
      const parentOutcomeExists = lfaView.outcomes.some(
        (o) => `raw:${o.rawEntryId}` === opNode.parentRef?.viewNodeId
      );
      expect(parentOutcomeExists).toBe(true);
    });

    lfaView.activities.forEach((actNode) => {
      expect(actNode.parentRef).not.toBeNull();
      expect(actNode.parentRef?.nodeType).toBe('output');
      // Parent output exists in lfaView.outputs
      const parentOutputExists = lfaView.outputs.some(
        (op) => `raw:${op.rawEntryId}` === actNode.parentRef?.viewNodeId
      );
      expect(parentOutputExists).toBe(true);
    });
  });

  it('should materialize CanonicalProposalPayloadV2 directly into CanonicalLfaView for FIX-GOLD-06', () => {
    const fixture = goldFixtures.find((f) => f.fixture_id === 'FIX-GOLD-06');
    expect(fixture).toBeDefined();

    const { proposal } = assembleCanonicalProposalV2(fixture!.page_1_input);
    expect(proposal).toBeDefined();

    const lfaView = materializeCanonicalProposalToLfaView(proposal);

    expect(lfaView.outcomes.length).toBe(proposal.outcomes.length);
    expect(lfaView.outputs.length).toBe(extractCanonicalOutputs(proposal).length);
    expect(lfaView.activities.length).toBe(extractCanonicalActivities(proposal).length);
    expect(lfaView.unusedOutcomes.length).toBe(0);
    expect(lfaView.unassignedOutputs.length).toBe(0);
    expect(lfaView.orphanedActivities.length).toBe(0);
  });

  it('should materialize CanonicalProposalPayloadV2 directly into CanonicalLfaView for FIX-GOLD-12', () => {
    const fixture = goldFixtures.find((f) => f.fixture_id === 'FIX-GOLD-12');
    expect(fixture).toBeDefined();

    const { proposal } = assembleCanonicalProposalV2(fixture!.page_1_input);
    expect(proposal).toBeDefined();

    const lfaView = materializeCanonicalProposalToLfaView(proposal);

    expect(lfaView.outcomes.length).toBe(proposal.outcomes.length);
    expect(lfaView.outputs.length).toBe(extractCanonicalOutputs(proposal).length);
    expect(lfaView.activities.length).toBe(extractCanonicalActivities(proposal).length);
    expect(lfaView.unusedOutcomes.length).toBe(0);
    expect(lfaView.unassignedOutputs.length).toBe(0);
    expect(lfaView.orphanedActivities.length).toBe(0);
  });

  it('should map CanonicalProposalPayloadV2 directly into RawLfaEntry[] without loss for all 12 GOLD fixtures', () => {
    goldFixtures.forEach((fixture) => {
      const { proposal } = assembleCanonicalProposalV2(fixture.page_1_input);
      const rawEntries = mapCanonicalProposalToRawEntries(proposal);

      const expectedTotalEntries =
        1 /* goal */ +
        1 /* purpose */ +
        proposal.outcomes.length +
        extractCanonicalOutputs(proposal).length +
        extractCanonicalActivities(proposal).length;

      expect(rawEntries.length).toBe(expectedTotalEntries);

      // Unique ID check
      const idSet = new Set(rawEntries.map((e) => e.id));
      expect(idSet.size).toBe(rawEntries.length);
    });
  });
});
