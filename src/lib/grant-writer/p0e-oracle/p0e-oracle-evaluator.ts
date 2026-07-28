import type { Fixture } from '../deterministic/types';
import type { DeterministicPage2Payload } from '../deterministic/blueprint-types';
import type { AssertionResult, FixtureOracleReport } from './p0e-types';
import { collectCandidates } from '../deterministic/candidates';

/**
 * Normalizes SDG strings to canonical format 'SDG_X' (e.g., 'SDG_3' -> 'SDG_3', 'SDG-03' -> 'SDG_3')
 */
export function normalizeSdgId(sdg: string): string {
  const digits = sdg.replace(/[^0-9]/g, '');
  if (!digits) return sdg.toUpperCase();
  return `SDG_${parseInt(digits, 10)}`;
}

/**
 * Narrow canonicalization for anti-signal IDs:
 * SDG-ANTI-FARMER-001 -> ANTI-FARMER-001
 * ANTI-FARMER-001 -> ANTI-FARMER-001
 */
export function canonicalizeAntiSignalId(id: string): string {
  if (id.startsWith('SDG-ANTI-')) {
    return id.replace(/^SDG-/, '');
  }
  return id;
}

function areSetsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

/**
 * Evaluates a single fixture against its actual pipeline payload strictly following P0-E-MINIMAL-MANIFEST-V1.
 */
export function evaluateFixtureOracle(
  fixture: Fixture,
  actualPayload: DeterministicPage2Payload,
  customCandidates?: any[]
): FixtureOracleReport {
  const assertions: AssertionResult[] = [];
  const fid = fixture.fixture_id;
  const m = fixture.expected_mapping || {};

  const addAssertion = (
    assertionId: string,
    stage: 'P0_B' | 'P0_C' | 'P0_D' | 'CROSS_STAGE',
    assertionType: string,
    passed: boolean,
    message: string,
    expected: unknown,
    actual: unknown,
    category?: string,
    actualField?: string
  ) => {
    assertions.push({
      assertionId,
      stage,
      assertionType,
      category,
      executed: true,
      expectedSource: 'expected_mapping',
      actualField: actualField || 'payload',
      passed,
      message,
      expected,
      actual
    });
  };

  // Helper extracts
  const primarySectorItem = actualPayload.sectors?.find(s => s.level === 'primary');
  const actualPrimarySectorId = primarySectorItem?.id || null;

  const actualSecondarySectorIds = (actualPayload.sectors || [])
    .filter(s => s.level === 'secondary')
    .map(s => s.id);

  const actualPrimaryInterventions = (actualPayload.interventions || [])
    .filter(i => i.level === 'primary')
    .map(i => i.id);

  const actualPrimarySdgs = (actualPayload.sdgs || [])
    .filter(s => s.level === 'primary')
    .map(s => normalizeSdgId(s.id));

  const actualSecondarySdgs = (actualPayload.sdgs || [])
    .filter(s => s.level === 'secondary')
    .map(s => normalizeSdgId(s.id));

  const actualMissRuleIds = (actualPayload.missingInformation || []).map(m => m.id);
  const actualWarningCodes = (actualPayload.warnings || []).map(w => w.code);

  // =========================================================================
  // STAGE P0-B ASSERTIONS: Extraction & Provenance
  // =========================================================================
  const candidates = customCandidates || collectCandidates(fixture.page_1_input);

  let p0bSpanPassed = true;
  let p0bSpanMsg = 'All extracted candidates have valid character offsets and matching slices.';
  for (const candidate of candidates) {
    if (candidate.rawEvidenceSpans.length === 0) {
      p0bSpanPassed = false;
      p0bSpanMsg = `Candidate ${candidate.canonicalId} has empty rawEvidenceSpans.`;
      break;
    }
    for (const span of candidate.rawEvidenceSpans) {
      if (span.startOffset < 0 || span.endOffset < span.startOffset) {
        p0bSpanPassed = false;
        p0bSpanMsg = `Candidate ${candidate.canonicalId} has invalid offset range [${span.startOffset}, ${span.endOffset}].`;
        break;
      }
      let rawSource = '';
      if (span.sourceField === 'program_story') {
        rawSource = fixture.page_1_input.program_story || fixture.page_1_input.programStory || '';
      } else if (span.sourceField === 'beneficiary_description') {
        rawSource = fixture.page_1_input.beneficiary_description || fixture.page_1_input.beneficiaryDescription || '';
      } else if (span.sourceField === 'program_title') {
        rawSource = fixture.page_1_input.program_title || fixture.page_1_input.programTitle || '';
      }
      if (rawSource) {
        const sliced = rawSource.slice(span.startOffset, span.endOffset);
        if (sliced !== span.matchedText) {
          p0bSpanPassed = false;
          p0bSpanMsg = `Offset slice mismatch for ${candidate.canonicalId}: expected "${span.matchedText}", got "${sliced}".`;
          break;
        }
      }
    }
    if (!p0bSpanPassed) break;
  }
  addAssertion(
    `P0E-${fid}-B-001`,
    'P0_B',
    'EVIDENCE_PROVENANCE',
    p0bSpanPassed,
    p0bSpanMsg,
    'Valid evidence spans and character offsets',
    p0bSpanPassed ? 'Valid' : p0bSpanMsg,
    'EVIDENCE_SLICE_ASSERTION'
  );

  // P0B-2: Anti-Signals Extracted
  if (fixture.anti_signal_ids && fixture.anti_signal_ids.length > 0) {
    const rawActualAntiSignals = candidates
      .map(c => c.canonicalId)
      .filter(id => id.startsWith('SDG-ANTI-') || id.startsWith('ANTI-'));
    const canonicalActualAntiSignals = rawActualAntiSignals.map(canonicalizeAntiSignalId);

    const rawExpectedAnti = fixture.anti_signal_ids;
    const canonicalExpectedAnti = rawExpectedAnti.map(canonicalizeAntiSignalId);
    
    const passed = areSetsEqual(canonicalActualAntiSignals, canonicalExpectedAnti);

    addAssertion(
      `P0E-${fid}-B-002`,
      'P0_B',
      'INVARIANT_RULE',
      passed,
      passed
        ? `Anti-signals match exact expected set [${rawExpectedAnti.join(', ')}].`
        : `Expected anti-signals [${rawExpectedAnti.join(', ')}], got [${rawActualAntiSignals.join(', ')}].`,
      rawExpectedAnti,
      rawActualAntiSignals,
      'ANTI_SIGNAL_ORACLE'
    );
  }

  // =========================================================================
  // STAGE P0-C ASSERTIONS: Scoring & Recommendation Level
  // =========================================================================

  // P0C-1: Sector Primary Recommendation
  if (m.sector_primary !== undefined) {
    if (m.sector_primary === null) {
      const passed = actualPrimarySectorId === null;
      addAssertion(
        `P0E-${fid}-C-001`,
        'P0_C',
        'EXACT_ID',
        passed,
        passed ? 'Primary sector is explicitly null as expected.' : `Expected null primary sector, got "${actualPrimarySectorId}".`,
        null,
        actualPrimarySectorId,
        'EXACT_PRIMARY_SECTOR_ORACLE'
      );
    } else {
      const passed = actualPrimarySectorId === m.sector_primary;
      addAssertion(
        `P0E-${fid}-C-001`,
        'P0_C',
        'EXACT_ID',
        passed,
        passed ? `Primary sector matches exact expected "${m.sector_primary}".` : `Expected primary sector "${m.sector_primary}", got "${actualPrimarySectorId}".`,
        m.sector_primary,
        actualPrimarySectorId,
        'EXACT_PRIMARY_SECTOR_ORACLE'
      );
    }
  }

  // P0C-2: Secondary Sectors Recommendation
  if (m.sector_secondary !== undefined) {
    if (m.sector_secondary.length === 0) {
      const passed = actualSecondarySectorIds.length === 0;
      addAssertion(
        `P0E-${fid}-C-002`,
        'P0_C',
        'EXACT_ID',
        passed,
        passed ? 'Secondary sectors explicitly empty as expected.' : `Expected empty secondary sectors, got [${actualSecondarySectorIds.join(', ')}].`,
        [],
        actualSecondarySectorIds,
        'EXACT_SECONDARY_SECTOR_ORACLE'
      );
    } else {
      const expectedSecs = m.sector_secondary;
      const passed = areSetsEqual(actualSecondarySectorIds, expectedSecs);
      addAssertion(
        `P0E-${fid}-C-002`,
        'P0_C',
        'EXACT_ID',
        passed,
        passed ? `Secondary sectors match exact expected set [${expectedSecs.join(', ')}].` : `Expected secondary sectors [${expectedSecs.join(', ')}], got [${actualSecondarySectorIds.join(', ')}].`,
        expectedSecs,
        actualSecondarySectorIds,
        'EXACT_SECONDARY_SECTOR_ORACLE'
      );
    }
  }

  // P0C-3: Primary Interventions Recommendation
  if (m.interventions_primary !== undefined) {
    if (m.interventions_primary.length === 0) {
      const passed = actualPrimaryInterventions.length === 0;
      addAssertion(
        `P0E-${fid}-C-003`,
        'P0_C',
        'EXACT_ID',
        passed,
        passed ? 'Primary interventions explicitly empty as expected.' : `Expected empty primary interventions, got [${actualPrimaryInterventions.join(', ')}].`,
        [],
        actualPrimaryInterventions,
        'EXACT_PRIMARY_INTERVENTION_ORACLE'
      );
    } else {
      const expectedArchs = m.interventions_primary;
      const passed = areSetsEqual(actualPrimaryInterventions, expectedArchs);
      addAssertion(
        `P0E-${fid}-C-003`,
        'P0_C',
        'EXACT_ID',
        passed,
        passed ? `Primary interventions match exact expected set [${expectedArchs.join(', ')}].` : `Expected primary interventions [${expectedArchs.join(', ')}], got [${actualPrimaryInterventions.join(', ')}].`,
        expectedArchs,
        actualPrimaryInterventions,
        'EXACT_PRIMARY_INTERVENTION_ORACLE'
      );
    }
  }

  // P0C-4: Primary SDG Recommendation
  if (m.sdg_primary !== undefined) {
    if (m.sdg_primary.length === 0) {
      const passed = actualPrimarySdgs.length === 0;
      addAssertion(
        `P0E-${fid}-C-004`,
        'P0_C',
        'SDG_COVERAGE',
        passed,
        passed ? 'Primary SDGs explicitly empty as expected.' : `Expected empty primary SDGs, got [${actualPrimarySdgs.join(', ')}].`,
        [],
        actualPrimarySdgs,
        'EXACT_PRIMARY_SDG_ORACLE'
      );
    } else {
      const expectedSdgs = m.sdg_primary.map(normalizeSdgId);
      const passed = areSetsEqual(actualPrimarySdgs, expectedSdgs);
      addAssertion(
        `P0E-${fid}-C-004`,
        'P0_C',
        'SDG_COVERAGE',
        passed,
        passed ? `Primary SDGs match exact expected set [${expectedSdgs.join(', ')}].` : `Expected primary SDGs [${expectedSdgs.join(', ')}], got [${actualPrimarySdgs.join(', ')}].`,
        expectedSdgs,
        actualPrimarySdgs,
        'EXACT_PRIMARY_SDG_ORACLE'
      );
    }
  }

  // P0C-5: Secondary SDGs Recommendation
  if (m.sdg_secondary !== undefined) {
    if (m.sdg_secondary.length === 0) {
      const passed = actualSecondarySdgs.length === 0;
      addAssertion(
        `P0E-${fid}-C-005`,
        'P0_C',
        'SDG_COVERAGE',
        passed,
        passed ? 'Secondary SDGs explicitly empty as expected.' : `Expected empty secondary SDGs, got [${actualSecondarySdgs.join(', ')}].`,
        [],
        actualSecondarySdgs,
        'EXACT_SECONDARY_SDG_ORACLE'
      );
    } else {
      const expectedSecSdgs = m.sdg_secondary.map(normalizeSdgId);
      const passed = areSetsEqual(actualSecondarySdgs, expectedSecSdgs);
      addAssertion(
        `P0E-${fid}-C-005`,
        'P0_C',
        'SDG_COVERAGE',
        passed,
        passed ? `Secondary SDGs match exact expected set [${expectedSecSdgs.join(', ')}].` : `Expected secondary SDGs [${expectedSecSdgs.join(', ')}], got [${actualSecondarySdgs.join(', ')}].`,
        expectedSecSdgs,
        actualSecondarySdgs,
        'EXACT_SECONDARY_SDG_ORACLE'
      );
    }
  }

  // P0C-6: Rejected Primary SDGs
  if (m.sdg_rejected_as_primary !== undefined && m.sdg_rejected_as_primary.length > 0) {
    const rejectedExpected = m.sdg_rejected_as_primary.map(normalizeSdgId);
    const noneSelectedAsPrimary = rejectedExpected.every(sdg => !actualPrimarySdgs.includes(sdg));
    addAssertion(
      `P0E-${fid}-C-006`,
      'P0_C',
      'REJECTED_PRIMARY_SDG',
      noneSelectedAsPrimary,
      noneSelectedAsPrimary ? `SDGs [${rejectedExpected.join(', ')}] were successfully rejected as primary.` : `Rejection failed: [${rejectedExpected.join(', ')}] appeared in primary SDGs.`,
      `Rejected as primary: [${rejectedExpected.join(', ')}]`,
      actualPrimarySdgs,
      'REJECTED_PRIMARY_SDG_ORACLE'
    );
  }

  // P0C-7: Exact Missing Information (MISS) Rules
  if (m.missing_information_expected !== undefined) {
    if (m.missing_information_expected.length === 0) {
      const passed = actualMissRuleIds.length === 0;
      addAssertion(
        `P0E-${fid}-C-007`,
        'P0_C',
        'EXACT_MISS_CODE',
        passed,
        passed ? 'Missing information items explicitly empty as expected.' : `Expected zero MISS rules, got [${actualMissRuleIds.join(', ')}].`,
        [],
        actualMissRuleIds,
        'EXACT_MISS_RULE_ORACLE'
      );
    } else {
      const expectedMiss = m.missing_information_expected;
      const passed = areSetsEqual(actualMissRuleIds, expectedMiss);
      addAssertion(
        `P0E-${fid}-C-007`,
        'P0_C',
        'EXACT_MISS_CODE',
        passed,
        passed ? `Exact MISS rules match expected set [${expectedMiss.join(', ')}].` : `Expected exact MISS rules [${expectedMiss.join(', ')}], got [${actualMissRuleIds.join(', ')}].`,
        expectedMiss,
        actualMissRuleIds,
        'EXACT_MISS_RULE_ORACLE'
      );
    }
  }

  // P0C-8: Exact Warnings (CONF) Codes
  if (m.warnings_expected !== undefined) {
    if (m.warnings_expected.length === 0) {
      const passed = actualWarningCodes.length === 0;
      addAssertion(
        `P0E-${fid}-C-008`,
        'P0_C',
        'EXACT_WARNING_CODE',
        passed,
        passed ? 'Warnings explicitly empty as expected.' : `Expected zero warnings, got [${actualWarningCodes.join(', ')}].`,
        [],
        actualWarningCodes,
        'EXACT_WARNING_CODE_ORACLE'
      );
    } else {
      const expectedWarns = m.warnings_expected;
      const passed = areSetsEqual(actualWarningCodes, expectedWarns);
      addAssertion(
        `P0E-${fid}-C-008`,
        'P0_C',
        'EXACT_WARNING_CODE',
        passed,
        passed ? `Exact warning codes match expected set [${expectedWarns.join(', ')}].` : `Expected exact warnings [${expectedWarns.join(', ')}], got [${actualWarningCodes.join(', ')}].`,
        expectedWarns,
        actualWarningCodes,
        'EXACT_WARNING_CODE_ORACLE'
      );
    }
  }

  // =========================================================================
  // STAGE P0-D ASSERTIONS: Blueprint Assembly & Conditional Slot Rules
  // =========================================================================

  // P0D-1: Conditional Unresolved Slot Assertion
  if (m.missing_information_expected && m.missing_information_expected.length > 0) {
    const missingInfoItems = actualPayload.missingInformation || [];
    const expectedMissIds = m.missing_information_expected;
    const allExpectedUnresolved = expectedMissIds.every(expId => {
      const found = missingInfoItems.find(item => item.id === expId);
      return found !== undefined && found.state === 'unresolved';
    });
    addAssertion(
      `P0E-${fid}-D-001`,
      'P0_D',
      'UNRESOLVED_SLOT',
      allExpectedUnresolved,
      allExpectedUnresolved
        ? 'Unresolved slots correctly present for all expected missing information items.'
        : 'Expected unresolved slots for missing information items, but some were resolved or missing from output.',
      expectedMissIds.map(id => ({ id, state: 'unresolved' })),
      missingInfoItems.map(i => ({ id: i.id, state: i.state })),
      'UNRESOLVED_SLOT_ORACLE'
    );
  }

  // P0D-2: Non-Leakage of Fixture ID in Payload
  const payloadJson = JSON.stringify(actualPayload);
  const containsFixtureId = payloadJson.includes(fid);
  addAssertion(
    `P0E-${fid}-D-002`,
    'P0_D',
    'BLUEPRINT_NON_LEAKAGE',
    !containsFixtureId,
    !containsFixtureId ? 'Payload contains zero fixture ID leakage.' : `Payload contains leaked fixture ID "${fid}".`,
    'Zero leakage',
    containsFixtureId ? 'Leaked' : 'Clean',
    'RUNTIME_COUPLING_GATE'
  );

  // =========================================================================
  // CROSS-STAGE ASSERTIONS: Input Immutability
  // =========================================================================
  const inputBefore = JSON.stringify(fixture.page_1_input);
  const inputAfter = JSON.stringify(fixture.page_1_input);
  const isImmutable = inputBefore === inputAfter;
  addAssertion(
    `P0E-${fid}-CROSS-001`,
    'CROSS_STAGE',
    'INPUT_SNAPSHOT_IMMUTABILITY',
    isImmutable,
    isImmutable ? 'Page 1 input object remained completely unmutated.' : 'Page 1 input object was mutated during execution.',
    '100% Immutable',
    isImmutable ? 'Immutable' : 'Mutated',
    'IMMUTABILITY_INDEPENDENCE_GATE'
  );

  const passedCount = assertions.filter(a => a.passed).length;
  const failedCount = assertions.filter(a => !a.passed).length;

  return {
    fixtureId: fid,
    passed: failedCount === 0,
    assertionsCount: assertions.length,
    passedAssertionsCount: passedCount,
    failedAssertionsCount: failedCount,
    assertions
  };
}
