import { describe, test, expect } from 'vitest';
import { REGRESSION_FIXTURES } from './deterministic/fixtures';
import { createPage2Payload } from './deterministic/page2-payload';
import { evaluateFixtureOracle, normalizeSdgId, canonicalizeAntiSignalId } from './p0e-oracle/p0e-oracle-evaluator';
import { runMetamorphicSuite } from './p0e-oracle/p0e-metamorphic';
import { runMutationKillerSuite } from './p0e-oracle/p0e-mutation-killer';
import { makeFixture, makePayload } from './p0e-oracle/p0e-mocks';

describe('P0-E Oracle Integrity & Conformance Test Suite', () => {

  // =========================================================================
  // SECTION A: ORACLE IMPLEMENTATION INTEGRITY TESTS
  // Controlled unit tests proving the oracle evaluator is honest, exact,
  // non-vacuous, non-fallback, and non-tautological.
  // =========================================================================
  describe('SECTION A: ORACLE_IMPLEMENTATION_INTEGRITY', () => {

    describe('A.1 Controlled Evaluator Unit Tests', () => {
      test('Exact match passes primary sector assertion', () => {
        const mockFixture = makeFixture({
          fixture_id: 'UNIT-001',
          page_1_input: { program_story: 'pertanian' },
          expected_mapping: { sector_primary: 'SECTOR-AGRI-001' }
        });
        const mockPayload = makePayload({
          sectors: [{ id: 'SECTOR-AGRI-001', level: 'primary', confidenceScore: 1.0, status: 'engine' }]
        });
        const report = evaluateFixtureOracle(mockFixture, mockPayload);
        expect(report.passed).toBe(true);
        const primaryAssertion = report.assertions.find(a => a.assertionId.endsWith('-C-001'));
        expect(primaryAssertion?.passed).toBe(true);
        expect(primaryAssertion?.category).toBe('EXACT_PRIMARY_SECTOR_ORACLE');
      });

      test('Wrong value fails primary sector assertion (no candidate fallback)', () => {
        const mockFixture = makeFixture({
          fixture_id: 'UNIT-002',
          page_1_input: { program_story: 'pertanian' },
          expected_mapping: { sector_primary: 'SECTOR-AGRI-001' }
        });
        const mockPayload = makePayload({
          sectors: [{ id: 'SECTOR-EDU-006', level: 'primary', confidenceScore: 0.9, status: 'engine' }]
        });
        const report = evaluateFixtureOracle(mockFixture, mockPayload);
        expect(report.passed).toBe(false);
        const primaryAssertion = report.assertions.find(a => a.assertionId.endsWith('-C-001'));
        expect(primaryAssertion?.passed).toBe(false);
      });

      test('Null actual primary sector fails when expected is non-null (no candidate fallback)', () => {
        const mockFixture = makeFixture({
          fixture_id: 'UNIT-003',
          page_1_input: { program_story: 'pertanian' },
          expected_mapping: { sector_primary: 'SECTOR-AGRI-001' }
        });
        const mockPayload = makePayload({
          sectors: [] // actual primary is null
        });
        const report = evaluateFixtureOracle(mockFixture, mockPayload);
        expect(report.passed).toBe(false);
        const primaryAssertion = report.assertions.find(a => a.assertionId.endsWith('-C-001'));
        expect(primaryAssertion?.passed).toBe(false);
      });

      test('Gold fixture_type does NOT auto-pass mismatched secondary sectors or MISS rules', () => {
        const mockFixture = makeFixture({
          fixture_id: 'UNIT-004',
          fixture_type: 'gold',
          page_1_input: { program_story: 'test' },
          expected_mapping: {
            sector_secondary: ['SECTOR-EDU-006'],
            missing_information_expected: ['MISS-002']
          }
        });
        const mockPayload = makePayload({
          sectors: [],
          missingInformation: []
        });
        const report = evaluateFixtureOracle(mockFixture, mockPayload);
        expect(report.passed).toBe(false);
        const secSectorAssertion = report.assertions.find(a => a.assertionId.endsWith('-C-002'));
        const missAssertion = report.assertions.find(a => a.assertionId.endsWith('-C-007'));
        expect(secSectorAssertion?.passed).toBe(false);
        expect(missAssertion?.passed).toBe(false);
      });

      test('Hard negative fixture_type does NOT auto-pass empty actual when expected is non-empty', () => {
        const mockFixture = makeFixture({
          fixture_id: 'UNIT-005',
          fixture_type: 'hard_negative',
          page_1_input: { program_story: 'test' },
          expected_mapping: {
            sdg_primary: ['SDG_3'],
            warnings_expected: ['CONF-001']
          }
        });
        const mockPayload = makePayload({
          sdgs: [],
          warnings: []
        });
        const report = evaluateFixtureOracle(mockFixture, mockPayload);
        expect(report.passed).toBe(false);
        const sdgAssertion = report.assertions.find(a => a.assertionId.endsWith('-C-004'));
        const warnAssertion = report.assertions.find(a => a.assertionId.endsWith('-C-008'));
        expect(sdgAssertion?.passed).toBe(false);
        expect(warnAssertion?.passed).toBe(false);
      });

      test('Empty expected ([]) expects exact [] whereas absent (undefined) creates zero assertion', () => {
        const mockFixtureEmpty = makeFixture({
          fixture_id: 'UNIT-006A',
          page_1_input: { program_story: 'test' },
          expected_mapping: { warnings_expected: [] }
        });
        const mockFixtureAbsent = makeFixture({
          fixture_id: 'UNIT-006B',
          page_1_input: { program_story: 'test' },
          expected_mapping: {}
        });
        const mockPayloadWithWarnings = makePayload({
          warnings: [{ id: 'w1', code: 'CONF-001', severity: 'important', message: 'warn' }]
        });

        const reportEmpty = evaluateFixtureOracle(mockFixtureEmpty, mockPayloadWithWarnings);
        expect(reportEmpty.passed).toBe(false);

        const reportAbsent = evaluateFixtureOracle(mockFixtureAbsent, mockPayloadWithWarnings);
        const warnAssertionAbsent = reportAbsent.assertions.find(a => a.assertionId.endsWith('-C-008'));
        expect(warnAssertionAbsent).toBeUndefined();
      });

      test('Rejected SDG cannot pass as primary SDG', () => {
        const mockFixture = makeFixture({
          fixture_id: 'UNIT-007',
          page_1_input: { program_story: 'test' },
          expected_mapping: {
            sdg_primary: ['SDG_1'],
            sdg_rejected_as_primary: ['SDG_3']
          }
        });
        const mockPayload = makePayload({
          sdgs: [{ id: 'SDG_3', level: 'primary', confidenceScore: 0.9, status: 'engine' }]
        });
        const report = evaluateFixtureOracle(mockFixture, mockPayload);
        expect(report.passed).toBe(false);
        const rejectedAssertion = report.assertions.find(a => a.assertionId.endsWith('-C-006'));
        expect(rejectedAssertion?.passed).toBe(false);
      });

      test('Anti-signal narrow canonicalization (SDG-ANTI-X -> ANTI-X)', () => {
        expect(canonicalizeAntiSignalId('SDG-ANTI-FARMER-001')).toBe('ANTI-FARMER-001');
        expect(canonicalizeAntiSignalId('ANTI-FARMER-001')).toBe('ANTI-FARMER-001');
      });

      test('SDG format canonicalization', () => {
        expect(normalizeSdgId('SDG_3')).toBe('SDG_3');
        expect(normalizeSdgId('SDG-3')).toBe('SDG_3');
        expect(normalizeSdgId('SDG-03')).toBe('SDG_3');
      });
    });

    describe('A.2 Metamorphic Relations Suite (MR-01 .. MR-10)', () => {
      const mrResults = runMetamorphicSuite();
      for (const mr of mrResults) {
        test(`Metamorphic Relation ${mr.mrId}: ${mr.name}`, () => {
          if (!mr.passed) {
            expect.fail(`Metamorphic relation ${mr.mrId} failed: ${mr.message}`);
          }
          expect(mr.passed).toBe(true);
        });
      }
    });

    describe('A.3 Mutation Killer Suite (MUT-01 .. MUT-12)', () => {
      const mutResults = runMutationKillerSuite();
      for (const mut of mutResults) {
        test(`Mutation Killer ${mut.targetId}: ${mut.name} (Killed by ${mut.killingAssertionId})`, () => {
          if (!mut.killed) {
            expect.fail(`Mutation ${mut.targetId} escaped oracle checks: ${mut.message}`);
          }
          expect(mut.killed).toBe(true);
        });
      }
    });
  });

  // =========================================================================
  // SECTION B: ENGINE CONFORMANCE TO LOCKED FIXTURES
  // Runs all 27 canonical fixtures against the actual runtime.
  // Note: If runtime does NOT satisfy canonical fixtures, this section
  // will honestly show failures without compromising oracle integrity.
  // =========================================================================
  describe('SECTION B: ENGINE_CONFORMANCE_TO_LOCKED_FIXTURES', () => {
    for (const fixture of REGRESSION_FIXTURES) {
      test(`Engine Conformance: Fixture ${fixture.fixture_id}`, () => {
        const payload = createPage2Payload(fixture.page_1_input, { now: '2026-01-01T00:00:00.000Z' });
        const report = evaluateFixtureOracle(fixture, payload);

        if (!report.passed) {
          const failedDetails = report.assertions
            .filter(a => !a.passed)
            .map(a => `[${a.assertionId} | ${a.category}] Expected: ${JSON.stringify(a.expected)}, Actual: ${JSON.stringify(a.actual)} -> ${a.message}`)
            .join('\n');
          expect.fail(`Fixture ${fixture.fixture_id} engine conformance failure:\n${failedDetails}`);
        }
        expect(report.passed).toBe(true);
      });
    }
  });

});
