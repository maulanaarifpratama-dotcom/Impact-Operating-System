import type { DeterministicPage2Payload, ProgramBlueprint } from '../deterministic/blueprint-types';
import type { Fixture } from '../deterministic/types';

/**
 * Builders for the minimal fixtures and payloads the oracle suites feed to
 * `evaluateFixtureOracle`.
 *
 * Each assertion exercises one comparison, so callers set only the fields under
 * test. Spelling out the required remainder in one place keeps those call sites
 * honest against the real types rather than casting the shape away — the
 * imports here previously named `RegressionFixture` and
 * `Page2ProvisionalPayload`, neither of which exists, so TypeScript gave up on
 * every file that used them and checked none of their contents.
 */

export function makeFixture(over: Partial<Fixture>): Fixture {
  return {
    fixture_id: 'UNIT-000',
    fixture_type: 'gold',
    language: 'id',
    page_1_input: {},
    expected_mapping: {},
    ...over,
  };
}

export function makePayload(over: Partial<DeterministicPage2Payload>): DeterministicPage2Payload {
  return {
    transportKind: 'P0_D_DETERMINISTIC_CORE_TRANSPORT',
    page1Input: {},
    createdAt: '1970-01-01T00:00:00.000Z',
    sectors: [],
    interventions: [],
    sdgs: [],
    // The oracle never reads the blueprint, and assembling a valid one would be
    // a second engine's worth of fixture. Empty is the honest placeholder.
    blueprint: {} as ProgramBlueprint,
    warnings: [],
    adapterValidationIssues: [],
    rawCanonicalPayload: {},
    ...over,
  };
}
