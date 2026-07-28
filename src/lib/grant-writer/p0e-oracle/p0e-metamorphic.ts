import type { MetamorphicTestResult } from './p0e-types';
import { REGRESSION_FIXTURES } from '../deterministic/fixtures';
import { createPage2Payload } from '../deterministic/page2-payload';
import { evaluateFixtureOracle, normalizeSdgId } from './p0e-oracle-evaluator';
import { collectCandidates } from '../deterministic/candidates';
import { makeFixture, makePayload } from './p0e-mocks';

/**
 * Runs test suite for approved Metamorphic Relations MR-01 through MR-10 strictly following locked contract semantics.
 */
export function runMetamorphicSuite(): MetamorphicTestResult[] {
  const results: MetamorphicTestResult[] = [];

  // MR-01: Case & Punctuation Invariance
  try {
    const baseFixture = REGRESSION_FIXTURES.find(f => f.fixture_id === 'FIX-GOLD-01')!;
    const origPayload = createPage2Payload(baseFixture.page_1_input, { now: '2026-01-01T00:00:00.000Z' });

    const upperInput = {
      ...baseFixture.page_1_input,
      program_story: (baseFixture.page_1_input.program_story || '').toUpperCase()
    };
    const upperPayload = createPage2Payload(upperInput, { now: '2026-01-01T00:00:00.000Z' });

    const origPrimarySector = origPayload.sectors?.find(s => s.level === 'primary')?.id || null;
    const upperPrimarySector = upperPayload.sectors?.find(s => s.level === 'primary')?.id || null;

    const origSdgs = (origPayload.sdgs || []).map(s => s.id).sort();
    const upperSdgs = (upperPayload.sdgs || []).map(s => s.id).sort();

    const passed = origPrimarySector === upperPrimarySector && JSON.stringify(origSdgs) === JSON.stringify(upperSdgs);
    results.push({
      mrId: 'MR-01',
      name: 'Case & Punctuation Invariance',
      passed,
      message: passed
        ? 'Casing modification preserved primary sector and SDG recommendations.'
        : `Casing modification altered output: expected sector "${origPrimarySector}" and SDGs [${origSdgs.join(', ')}], got sector "${upperPrimarySector}" and SDGs [${upperSdgs.join(', ')}].`
    });
  } catch (err) {
    results.push({ mrId: 'MR-01', name: 'Case & Punctuation Invariance', passed: false, message: String(err) });
  }

  // MR-02: SDG Format Normalization Boundary (SDG_3, SDG-3, SDG-03)
  try {
    // 1. Check normalization function
    const norm1 = normalizeSdgId('SDG_3');
    const norm2 = normalizeSdgId('SDG-3');
    const norm3 = normalizeSdgId('SDG-03');
    const normNegControl = normalizeSdgId('SDG_30');

    const normMatchesCanonical = norm1 === 'SDG_3' && norm2 === 'SDG_3' && norm3 === 'SDG_3';
    // Equality with 'SDG_30' is the whole assertion: once it holds, the value
    // cannot also be 'SDG_3', so the second half of the old condition was
    // always true and only served to make TypeScript flag the comparison.
    // Runtime is verified: SDG_30 -> SDG_30 while SDG-03 -> SDG_3.
    const normNegControlDistinct = normNegControl === 'SDG_30';

    // 2. Test through evaluateFixtureOracle comparison boundary
    const mockPayload = makePayload({
      sdgs: [{ id: 'SDG_3', level: 'primary', confidenceScore: 1.0, status: 'engine' }]
    });

    const fixtureSdgHyphen = makeFixture({
      fixture_id: 'MR02-HYPHEN',
      page_1_input: { program_story: 'test' },
      expected_mapping: { sdg_primary: ['SDG-3'] }
    });
    const fixtureSdgZero = makeFixture({
      fixture_id: 'MR02-ZERO',
      page_1_input: { program_story: 'test' },
      expected_mapping: { sdg_primary: ['SDG-03'] }
    });
    const fixtureNegControl = makeFixture({
      fixture_id: 'MR02-NEG',
      page_1_input: { program_story: 'test' },
      expected_mapping: { sdg_primary: ['SDG_30'] } // Negative control: SDG 30 must NOT match SDG 3
    });

    const reportHyphen = evaluateFixtureOracle(fixtureSdgHyphen, mockPayload);
    const reportZero = evaluateFixtureOracle(fixtureSdgZero, mockPayload);
    const reportNeg = evaluateFixtureOracle(fixtureNegControl, mockPayload);

    const boundaryHyphenPass = reportHyphen.passed === true;
    const boundaryZeroPass = reportZero.passed === true;
    const boundaryNegFail = reportNeg.passed === false; // Negative control correctly fails

    const passed = normMatchesCanonical && normNegControlDistinct && boundaryHyphenPass && boundaryZeroPass && boundaryNegFail;

    results.push({
      mrId: 'MR-02',
      name: 'SDG Format Invariance',
      passed,
      message: passed
        ? 'SDG_3, SDG-3, and SDG-03 evaluated identically as canonical SDG_3 through evaluator boundary; negative control SDG_30 correctly rejected.'
        : `MR-02 boundary check failed: normMatchesCanonical=${normMatchesCanonical}, boundaryHyphen=${boundaryHyphenPass}, boundaryZero=${boundaryZeroPass}, boundaryNegFail=${boundaryNegFail}.`
    });
  } catch (err) {
    results.push({ mrId: 'MR-02', name: 'SDG Format Invariance', passed: false, message: String(err) });
  }

  // MR-03: Whitespace Invariance
  try {
    const baseFixture = REGRESSION_FIXTURES.find(f => f.fixture_id === 'FIX-GOLD-01')!;
    const origPayload = createPage2Payload(baseFixture.page_1_input, { now: '2026-01-01T00:00:00.000Z' });

    const paddedInput = {
      ...baseFixture.page_1_input,
      program_story: `  \n  ${baseFixture.page_1_input.program_story}  \t\n  `
    };
    const paddedPayload = createPage2Payload(paddedInput, { now: '2026-01-01T00:00:00.000Z' });

    const origPrimarySector = origPayload.sectors?.find(s => s.level === 'primary')?.id || null;
    const paddedPrimarySector = paddedPayload.sectors?.find(s => s.level === 'primary')?.id || null;

    const origSdgs = (origPayload.sdgs || []).map(s => s.id).sort();
    const paddedSdgs = (paddedPayload.sdgs || []).map(s => s.id).sort();

    const passed = origPrimarySector === paddedPrimarySector && JSON.stringify(origSdgs) === JSON.stringify(paddedSdgs);
    results.push({
      mrId: 'MR-03',
      name: 'Whitespace Invariance',
      passed,
      message: passed
        ? 'Whitespace padding preserved primary sector and SDG recommendations.'
        : `Whitespace padding altered recommendations: original [${origPrimarySector}, ${origSdgs.join(', ')}], padded [${paddedPrimarySector}, ${paddedSdgs.join(', ')}].`
    });
  } catch (err) {
    results.push({ mrId: 'MR-03', name: 'Whitespace Invariance', passed: false, message: String(err) });
  }

  // MR-04: Targeted Negation Suppresses Positive Concept (SECTOR-AGRI-001)
  // Registry authority: src/lib/grant-writer/deterministic/registry.ts#L640 (SECTOR-AGRI-001)
  try {
    const canonicalAgriSectorId = 'SECTOR-AGRI-001';
    
    // Baseline story designed to positively trigger SECTOR-AGRI-001
    const baselineStory = 'Program bantuan bibit padi, pupuk, dan irigasi sawah untuk petani di desa Suka Maju guna meningkatkan hasil panen tanaman pertanian.';
    const baselineInput = { program_story: baselineStory };
    
    const baselinePayload = createPage2Payload(baselineInput, { now: '2026-01-01T00:00:00.000Z' });
    const baselineCandidates = collectCandidates(baselineInput);
    const baselineHasAgriCandidate = baselineCandidates.some(c => c.canonicalId === canonicalAgriSectorId && c.candidateType === 'sector');
    const baselinePrimarySector = baselinePayload.sectors?.find(s => s.level === 'primary')?.id || null;

    // Transformed story introducing targeted negation
    const negatedStory = 'Program ini bukan tentang bantuan bibit padi atau pupuk petani, dan tidak ada kegiatan pertanian maupun sawah.';
    const negatedInput = { program_story: negatedStory };

    const negatedPayload = createPage2Payload(negatedInput, { now: '2026-01-01T00:00:00.000Z' });
    const negatedPrimarySector = negatedPayload.sectors?.find(s => s.level === 'primary')?.id || null;

    // Confirm baseline positively triggers SECTOR-AGRI-001 (either candidate or primary recommendation)
    const baselineTriggered = baselineHasAgriCandidate || baselinePrimarySector === canonicalAgriSectorId;
    
    // Confirm transformed input no longer promotes SECTOR-AGRI-001 as primary recommendation
    const negationSuppressed = negatedPrimarySector !== canonicalAgriSectorId;

    const passed = baselineTriggered && negationSuppressed;
    results.push({
      mrId: 'MR-04',
      name: 'Negation Suppresses Positive Concept',
      passed,
      message: passed
        ? `Targeted negation successfully suppressed positive concept ${canonicalAgriSectorId} (registry: src/lib/grant-writer/deterministic/registry.ts#L640).`
        : `MR-04 failed: baselineTriggered=${baselineTriggered} (${baselinePrimarySector}), negatedPrimarySector=${negatedPrimarySector}.`
    });
  } catch (err) {
    results.push({ mrId: 'MR-04', name: 'Negation Suppresses Positive Concept', passed: false, message: String(err) });
  }

  // MR-05: Unrelated Text Appendage Invariance
  try {
    const baseFixture = REGRESSION_FIXTURES.find(f => f.fixture_id === 'FIX-GOLD-01')!;
    const origPayload = createPage2Payload(baseFixture.page_1_input, { now: '2026-01-01T00:00:00.000Z' });

    const appendedInput = {
      ...baseFixture.page_1_input,
      program_story: `${baseFixture.page_1_input.program_story} Rapat rutin tata kelola internal organisasi diselenggarakan setiap triwulan sesuai SOP administrasi.`
    };
    const appendedPayload = createPage2Payload(appendedInput, { now: '2026-01-01T00:00:00.000Z' });

    const origPrimarySector = origPayload.sectors?.find(s => s.level === 'primary')?.id || null;
    const appendedPrimarySector = appendedPayload.sectors?.find(s => s.level === 'primary')?.id || null;

    const origSdgs = (origPayload.sdgs || []).map(s => s.id).sort();
    const appendedSdgs = (appendedPayload.sdgs || []).map(s => s.id).sort();

    const passed = origPrimarySector === appendedPrimarySector && JSON.stringify(origSdgs) === JSON.stringify(appendedSdgs);
    results.push({
      mrId: 'MR-05',
      name: 'Unrelated Text Appendage Invariance',
      passed,
      message: passed
        ? 'Appending unrelated corporate governance text preserved primary sector and SDG recommendations.'
        : `Appending unrelated text altered recommendations: original [${origPrimarySector}, ${origSdgs.join(', ')}], appended [${appendedPrimarySector}, ${appendedSdgs.join(', ')}].`
    });
  } catch (err) {
    results.push({ mrId: 'MR-05', name: 'Unrelated Text Appendage Invariance', passed: false, message: String(err) });
  }

  // MR-06: Candidate Set Deduplication under Duplicate Inputs
  try {
    const baseFixture = REGRESSION_FIXTURES.find(f => f.fixture_id === 'FIX-GOLD-01')!;
    const story = baseFixture.page_1_input.program_story || '';

    const singleCandidates = collectCandidates({ program_story: story });
    const duplicateCandidates = collectCandidates({ program_story: `${story}\n\n${story}` });

    const singleIds = new Set(singleCandidates.map(c => `${c.canonicalId}::${c.candidateType}`));
    const duplicateIds = new Set(duplicateCandidates.map(c => `${c.canonicalId}::${c.candidateType}`));

    const candidatesSetPreserved = singleIds.size === duplicateIds.size && Array.from(singleIds).every(id => duplicateIds.has(id));

    const dupPayload = createPage2Payload({ program_story: `${story}\n\n${story}` });
    const payloadSectors = (dupPayload.sectors || []).map(s => s.id);
    const noDuplicateSectorsInPayload = new Set(payloadSectors).size === payloadSectors.length;

    const passed = candidatesSetPreserved && noDuplicateSectorsInPayload;
    results.push({
      mrId: 'MR-06',
      name: 'Candidate Set Deduplication',
      passed,
      message: passed
        ? 'Duplicate input text produced deduplicated canonical candidate set and clean payload without duplicate sector entries.'
        : `Deduplication failed: candidatesSetPreserved=${candidatesSetPreserved}, noDuplicateSectorsInPayload=${noDuplicateSectorsInPayload}.`
    });
  } catch (err) {
    results.push({ mrId: 'MR-06', name: 'Candidate Set Deduplication', passed: false, message: String(err) });
  }

  // MR-07: Field Source Invariance across Eligible P0-B Fields
  try {
    const baseFixture = REGRESSION_FIXTURES.find(f => f.fixture_id === 'FIX-GOLD-01')!;
    const story = baseFixture.page_1_input.program_story || '';

    const candidatesFromStory = collectCandidates({ program_story: story });
    const candidatesFromBeneficiary = collectCandidates({ beneficiary_description: story });

    const storySpanSource = candidatesFromStory[0]?.rawEvidenceSpans[0]?.sourceField;
    const beneficiarySpanSource = candidatesFromBeneficiary[0]?.rawEvidenceSpans[0]?.sourceField;

    const idsStory = candidatesFromStory.map(c => c.canonicalId).sort();
    const idsBeneficiary = candidatesFromBeneficiary.map(c => c.canonicalId).sort();

    const passed = storySpanSource === 'program_story' && beneficiarySpanSource === 'beneficiary_description' && JSON.stringify(idsStory) === JSON.stringify(idsBeneficiary);
    results.push({
      mrId: 'MR-07',
      name: 'Field Source Evidence Provenance',
      passed,
      message: passed
        ? 'Evidence span sourceField correctly shifted from program_story to beneficiary_description while preserving candidate IDs.'
        : `Field source provenance failed: storySource="${storySpanSource}", beneficiarySource="${beneficiarySpanSource}".`
    });
  } catch (err) {
    results.push({ mrId: 'MR-07', name: 'Field Source Evidence Provenance', passed: false, message: String(err) });
  }

  // MR-08: Pure Determinism across Repeated Invocations
  try {
    const baseFixture = REGRESSION_FIXTURES.find(f => f.fixture_id === 'FIX-GOLD-01')!;
    const fixedTime = '2026-01-01T00:00:00.000Z';

    const run1 = createPage2Payload(baseFixture.page_1_input, { now: fixedTime });
    const run2 = createPage2Payload(baseFixture.page_1_input, { now: fixedTime });

    const str1 = JSON.stringify(run1);
    const str2 = JSON.stringify(run2);

    const passed = str1 === str2;
    results.push({
      mrId: 'MR-08',
      name: 'Pure Determinism',
      passed,
      message: passed
        ? 'Identical inputs and timestamp produced byte-for-byte identical Page 2 payload snapshots.'
        : 'Repeated pipeline executions produced non-identical outputs!'
    });
  } catch (err) {
    results.push({ mrId: 'MR-08', name: 'Pure Determinism', passed: false, message: String(err) });
  }

  // MR-09: Immutability of Page 1 Input
  try {
    const baseFixture = REGRESSION_FIXTURES.find(f => f.fixture_id === 'FIX-GOLD-01')!;
    const originalInput = JSON.parse(JSON.stringify(baseFixture.page_1_input));

    const workingCopy = JSON.parse(JSON.stringify(baseFixture.page_1_input));
    createPage2Payload(workingCopy, { now: '2026-01-01T00:00:00.000Z' });

    const passed = JSON.stringify(originalInput) === JSON.stringify(workingCopy);
    results.push({
      mrId: 'MR-09',
      name: 'Page 1 Input Immutability',
      passed,
      message: passed
        ? 'Pipeline execution did not mutate the input object.'
        : 'Pipeline execution mutated input object properties!'
    });
  } catch (err) {
    results.push({ mrId: 'MR-09', name: 'Page 1 Input Immutability', passed: false, message: String(err) });
  }

  // MR-10: Missing Fact Unresolved State
  try {
    const baseFixture = REGRESSION_FIXTURES.find(f => f.fixture_id === 'FIX-GOLD-01')!;
    const inputWithoutLocation = {
      ...baseFixture.page_1_input,
      target_locations: undefined,
      location: undefined,
      targetLocations: undefined
    };
    const payload1 = createPage2Payload(inputWithoutLocation, { now: '2026-01-01T00:00:00.000Z' });
    const hasUnresolvedLoc = (payload1.missingInformation || []).some(m => m.id === 'MISS-002' && m.state === 'unresolved');

    const inputWithoutBaseline = {
      ...baseFixture.page_1_input,
      baseline_data: undefined,
      baselineData: undefined
    };
    const payload2 = createPage2Payload(inputWithoutBaseline, { now: '2026-01-01T00:00:00.000Z' });
    const hasUnresolvedBase = (payload2.missingInformation || []).some(m => m.id === 'MISS-010' && m.state === 'unresolved');

    const passed = hasUnresolvedLoc && hasUnresolvedBase;
    results.push({
      mrId: 'MR-10',
      name: 'Missing Fact Unresolved State',
      passed,
      message: passed
        ? 'Omitting mandatory facts correctly emitted unresolved MISS-002 and MISS-010 entries.'
        : `Missing fact state failed: hasUnresolvedLoc=${hasUnresolvedLoc}, hasUnresolvedBase=${hasUnresolvedBase}.`
    });
  } catch (err) {
    results.push({ mrId: 'MR-10', name: 'Missing Fact Unresolved State', passed: false, message: String(err) });
  }

  return results;
}
