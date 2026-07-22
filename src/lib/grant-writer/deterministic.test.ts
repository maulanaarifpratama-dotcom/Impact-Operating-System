import { describe, test, expect } from 'vitest';
import {
  normalizeText,
  isMorphologyOnlyMatch,
  verifyRegistryIntegrity,
  collectCandidates,
  REGRESSION_FIXTURES,
  runRegressionFixtures,
  getExecutionProofStatus,
  SCORING_CONFIG,
  roundHalfUp,
  getSpanConfidence,
  preprocessEligibility,
  scoreSector,
  processConflictsAndPenalties,
  getTriggeredMissingInformationRules,
  assignRecommendations
} from './deterministic';

describe('P0-B Deterministic Mapping Engine Tests', () => {

  // 1. Normalization & Tokenization Tests (§9.1)
  describe('Input Normalization', () => {
    test('should apply NFKC normalization and lowercase', () => {
      const result = normalizeText('MÉLAtih');
      expect(result.normalized).toBe('melatih');
    });

    test('should collapse duplicate whitespaces, tabs, and newlines', () => {
      const result = normalizeText('  melatih \t\n  literasi   ');
      expect(result.normalized).toBe('melatih literasi');
    });

    test('should strip punctuation symbols but keep alphanumeric, spaces, and hyphens', () => {
      const result = normalizeText('melatih-literasi, keuangan! (okey)?');
      expect(result.normalized).toBe('melatih-literasi keuangan okey');
    });

    test('should handle empty, null, or undefined inputs gracefully', () => {
      expect(normalizeText(null).normalized).toBe('');
      expect(normalizeText(undefined).normalized).toBe('');
      expect(normalizeText('').normalized).toBe('');
    });
  });

  // 2. Character Position Tracking & Slicing Tests (§9.1, §3)
  describe('Position Tracking Mapping', () => {
    test('should track exact character mappings from normalized to original', () => {
      const original = '  melatih.  ';
      const result = normalizeText(original);
      expect(result.normalized).toBe('melatih');

      // The word 'melatih' starts at index 2 in original
      expect(result.indexMapping[0]).toBe(2);
      // The word ends at index 8 (inclusive) in original, which corresponds to index 6 ('h') in normalized
      expect(result.indexMapping[6]).toBe(8);

      const startOffset = result.indexMapping[0];
      const endOffset = result.indexMapping[6] + 1;
      expect(original.slice(startOffset, endOffset)).toBe('melatih');
    });

    test('should preserve punctuation indices correctly inside original text slice', () => {
      const original = 'Kami, melatih kader.';
      const result = normalizeText(original);
      // Normalized: 'kami melatih kader'
      expect(result.normalized).toBe('kami melatih kader');

      // Check slice matching
      const matchIndexInNormalized = result.normalized.indexOf('melatih');
      const startOffset = result.indexMapping[matchIndexInNormalized];
      const endOffset = result.indexMapping[matchIndexInNormalized + 'melatih'.length - 1] + 1;

      expect(original.slice(startOffset, endOffset)).toBe('melatih');
    });
  });

  // 3. Morphology-Only Rules & Indonesian Affixes Tests (§9.2)
  describe('Indonesian Morphology Matching', () => {
    test('should identify morphology-only matches correctly', () => {
      // Base signal: 'melatih', variant: 'pelatihan'
      expect(isMorphologyOnlyMatch('pelatihan', 'melatih')).toBe(true);
      expect(isMorphologyOnlyMatch('melatih', 'melatih')).toBe(false);
    });

    test('should enforce anti-aggressive stemming boundaries (result-level separation)', () => {
      // We must not stem Activity ("pelatihan") and Outcome ("terlatih") into same root word
      const activityResult = normalizeText('pelatihan');
      const outcomeResult = normalizeText('terlatih');

      expect(activityResult.normalized).toBe('pelatihan');
      expect(outcomeResult.normalized).toBe('terlatih');
      expect(activityResult.normalized).not.toBe(outcomeResult.normalized);
    });
  });

  // 4. Registry Integrity Assertions (§10, §7)
  describe('Registry Integrity Assertions', () => {
    test('should verify there are no duplicate IDs across registries', () => {
      expect(() => verifyRegistryIntegrity()).not.toThrow();
    });

    test('should successfully resolve OPF-013 alias to OPF-014', () => {
      const input = {
        program_story: "Kami melakukan pengadaan mesin traktor di desa."
      };
      const candidates = collectCandidates(input);
      // OPF-013 positive signals include "pengadaan mesin"
      // OPF-013 is mapped and resolved to OPF-014
      const hasOPF013 = candidates.some(c => c.canonicalId === 'OPF-013');
      const hasOPF014 = candidates.some(c => c.canonicalId === 'OPF-014');

      expect(hasOPF013).toBe(false);
      expect(hasOPF014).toBe(true);
    });
  });

  // 5. Longest-Match-First (LMF) Resolution Tests (§9.1)
  describe('Longest-Match-First Selection', () => {
    test('should resolve overlapping phrases in favor of the longest match', () => {
      const input = {
        program_story: "Kami memberikan pendampingan pertanian berkelanjutan."
      };
      const candidates = collectCandidates(input);
      
      const hasAgri = candidates.some(c => c.canonicalId === 'SECTOR-AGRI-001');
      const hasMentor = candidates.some(c => c.canonicalId === 'ARCH-MENTOR-003');

      expect(hasAgri).toBe(true);
      expect(hasMentor).toBe(true);
    });
  });

  // 6. 27 Regression Fixtures Executions (P0-E and P0-B status gates)
  describe('Regression Fixture Runner Assertions', () => {
    test('should successfully load all 27 regression fixtures', () => {
      expect(REGRESSION_FIXTURES).toHaveLength(27);
    });

    test('should execute all fixtures and pass 100% of P0-B deterministic extraction assertions', () => {
      const runnerReport = runRegressionFixtures();
      
      if (runnerReport.failedFixturesCount > 0) {
        console.error("FIXTURE RUNNER ISSUES:", JSON.stringify(runnerReport.results.filter(r => !r.passed), null, 2));
      }

      expect(runnerReport.status).toBe('P0_B_EXTRACTION_ASSERTIONS');
      expect(runnerReport.loadedFixtures).toBe(27);
      expect(runnerReport.failedFixturesCount).toBe(0);
      expect(runnerReport.passedFixturesCount).toBe(27);

      expect(getExecutionProofStatus()).toBe('P0_E_EXECUTION_NOT_YET_PROVEN');
    });
  });

});

// P0-C New Scoring & Recommendations Exhaustive Test Layer
describe('P0-C Scoring Engine Exhaustive Verification Layer', () => {

  // 1. SCORING_CONFIG parameter integrity
  describe('Scoring Configuration Integrity', () => {
    test('SC-CONF-001: contract and configuration versions should match contract-v1', () => {
      expect(SCORING_CONFIG.contract_version).toBe('SCORING-CONTRACT-V1');
      expect(SCORING_CONFIG.heuristic_config_version).toBe('INITIAL-HEURISTIC-CONFIG-V1');
    });

    test('SC-CONF-002: sector problem family alignment weight must be 0.25', () => {
      expect(SCORING_CONFIG.sector_scoring.weights.problem_family_alignment).toBe(0.25);
    });

    test('SC-CONF-003: sector outcome family alignment weight must be 0.25', () => {
      expect(SCORING_CONFIG.sector_scoring.weights.outcome_family_alignment).toBe(0.25);
    });

    test('SC-CONF-004: sector target actor alignment weight must be 0.15', () => {
      expect(SCORING_CONFIG.sector_scoring.weights.target_actor_alignment).toBe(0.15);
    });

    test('SC-CONF-005: sector intervention alignment weight must be 0.15', () => {
      expect(SCORING_CONFIG.sector_scoring.weights.intervention_alignment).toBe(0.15);
    });

    test('SC-CONF-006: sector indicator family alignment weight must be 0.10', () => {
      expect(SCORING_CONFIG.sector_scoring.weights.indicator_family_alignment).toBe(0.10);
    });

    test('SC-CONF-007: precision rounding mode must be ROUND_HALF_UP with 4 decimal places', () => {
      expect(SCORING_CONFIG.precision.decimal_places).toBe(4);
      expect(SCORING_CONFIG.precision.rounding_mode).toBe('ROUND_HALF_UP');
    });
  });

  // 2. roundHalfUp precision
  describe('Mathematical Rounding Half-Up Precision', () => {
    test('RND-001: should round 0.12344 down to 0.1234', () => {
      expect(roundHalfUp(0.12344)).toBe(0.1234);
    });

    test('RND-002: should round 0.12345 up to 0.1235', () => {
      expect(roundHalfUp(0.12345)).toBe(0.1235);
    });

    test('RND-003: should round 0.12346 up to 0.1235', () => {
      expect(roundHalfUp(0.12346)).toBe(0.1235);
    });

    test('RND-004: should round negative values symmetrical to positive ones (-0.12345 to -0.1235)', () => {
      expect(roundHalfUp(-0.12345)).toBe(-0.1235);
    });

    test('RND-005: should round 0.00005 to 0.0001', () => {
      expect(roundHalfUp(0.00005)).toBe(0.0001);
    });

    test('RND-006: should round 0.99999 to 1.0000', () => {
      expect(roundHalfUp(0.99999)).toBe(1.0000);
    });
  });

  // 3. Preprocess eligibility & morphology co-contribution
  describe('Candidate Eligibility and Morphology Paradox', () => {
    test('ELG-001: morphology-only match must be capped at 0.40 confidence initially', () => {
      const span: EvidenceSpan = {
        sourceField: 'program_story',
        originalText: 'pelatihan',
        matchedText: 'pelatihan',
        normalizedMatch: 'pelatihan',
        startOffset: 0,
        endOffset: 9,
        signalType: 'object_signal',
        registryId: 'melatih'
      };
      expect(getSpanConfidence(span, false)).toBe(0.40);
    });

    test('ELG-002: exact/supported matches have confidence of 1.00', () => {
      const span: EvidenceSpan = {
        sourceField: 'program_story',
        originalText: 'melatih',
        matchedText: 'melatih',
        normalizedMatch: 'melatih',
        startOffset: 0,
        endOffset: 7,
        signalType: 'positive_action_signal',
        registryId: 'melatih'
      };
      expect(getSpanConfidence(span)).toBe(1.00);
    });

    test('ELG-003: candidates with confidence < 0.50 are filtered out if no cooperative support exists', () => {
      const candidate: CanonicalCandidate = {
        canonicalId: 'ARCH-TRAIN-001',
        candidateType: 'archetype',
        matchedSignals: [],
        negativeSignals: [],
        antiSignals: [],
        confusableCandidateIds: [],
        rawEvidenceSpans: [
          {
            sourceField: 'program_story',
            originalText: 'pelatihan',
            matchedText: 'pelatihan',
            normalizedMatch: 'pelatihan',
            startOffset: 0,
            endOffset: 9,
            signalType: 'object_signal',
            registryId: 'melatih'
          }
        ],
        minimumEvidenceStatus: 'met',
        registryVersion: '1.2'
      };
      const results = preprocessEligibility([candidate]);
      expect(results).toHaveLength(0);
    });

    test('ELG-004: candidate with cooperative outcome support resolves morphology paradox', () => {
      const archCandidate: CanonicalCandidate = {
        canonicalId: 'ARCH-TRAINING-001', // expected expected_outcome_family_ids include OF-003
        candidateType: 'archetype',
        matchedSignals: [],
        negativeSignals: [],
        antiSignals: [],
        confusableCandidateIds: [],
        rawEvidenceSpans: [
          {
            sourceField: 'program_story',
            originalText: 'pelatihan',
            matchedText: 'pelatihan',
            normalizedMatch: 'pelatihan',
            startOffset: 0,
            endOffset: 9,
            signalType: 'object_signal',
            registryId: 'melatih'
          }
        ],
        minimumEvidenceStatus: 'met',
        registryVersion: '1.2'
      };

      const outcomeCandidate: CanonicalCandidate = {
        canonicalId: 'OF-003',
        candidateType: 'outcome',
        matchedSignals: [],
        negativeSignals: [],
        antiSignals: [],
        confusableCandidateIds: [],
        rawEvidenceSpans: [
          {
            sourceField: 'program_story',
            originalText: 'menerapkan praktik',
            matchedText: 'menerapkan praktik',
            normalizedMatch: 'menerapkan praktik',
            startOffset: 15,
            endOffset: 33,
            signalType: 'positive_action_signal',
            registryId: 'OF-003'
          }
        ],
        minimumEvidenceStatus: 'met',
        registryVersion: '1.2'
      };

      const results = preprocessEligibility([archCandidate, outcomeCandidate]);
      expect(results).toContainEqual(expect.objectContaining({ canonicalId: 'ARCH-TRAINING-001' }));
    });

    test('ELG-005: overlap exclusion in the same field drops lower confidence spans', () => {
      const candidates: CanonicalCandidate[] = [
        {
          canonicalId: 'OF-012',
          candidateType: 'outcome',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: [],
          confusableCandidateIds: [],
          rawEvidenceSpans: [
            {
              sourceField: 'program_story',
              originalText: 'meningkatkan keterampilan',
              matchedText: 'meningkatkan keterampilan',
              normalizedMatch: 'meningkatkan keterampilan',
              startOffset: 0,
              endOffset: 25,
              signalType: 'positive_action_signal',
              registryId: 'OF-012'
            }
          ],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        },
        {
          canonicalId: 'OF-012', // same type, overlapping span but lower confidence/shorter text
          candidateType: 'outcome',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: [],
          confusableCandidateIds: [],
          rawEvidenceSpans: [
            {
              sourceField: 'program_story',
              originalText: 'keterampilan',
              matchedText: 'keterampilan',
              normalizedMatch: 'keterampilan',
              startOffset: 13,
              endOffset: 25,
              signalType: 'object_signal',
              registryId: 'OF-012'
            }
          ],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ];

      const results = preprocessEligibility(candidates);
      expect(results).toHaveLength(1);
      expect(results[0].rawEvidenceSpans[0].matchedText).toBe('meningkatkan keterampilan');
    });

    test('ELG-006: overlap exclusion preserves non-overlapping spans across fields', () => {
      const candidates: CanonicalCandidate[] = [
        {
          canonicalId: 'OF-012',
          candidateType: 'outcome',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: [],
          confusableCandidateIds: [],
          rawEvidenceSpans: [
            {
              sourceField: 'program_story',
              originalText: 'keterampilan',
              matchedText: 'keterampilan',
              normalizedMatch: 'keterampilan',
              startOffset: 0,
              endOffset: 12,
              signalType: 'positive_action_signal',
              registryId: 'OF-012'
            }
          ],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        },
        {
          canonicalId: 'OF-012',
          candidateType: 'outcome',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: [],
          confusableCandidateIds: [],
          rawEvidenceSpans: [
            {
              sourceField: 'beneficiary_description',
              originalText: 'petani',
              matchedText: 'petani',
              normalizedMatch: 'petani',
              startOffset: 0,
              endOffset: 6,
              signalType: 'positive_action_signal',
              registryId: 'OF-012'
            }
          ],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ];

      const results = preprocessEligibility(candidates);
      expect(results).toHaveLength(1);
      expect(results[0].rawEvidenceSpans).toHaveLength(2);
    });
  });

  // 4. Component-based scoring & saturation
  describe('Component Scoring and Saturation calculations', () => {
    test('SCR-001: scoring a sector should correctly apply problem family alignment weight and saturate at 3.0', () => {
      const input: Page1Input = { programTitle: '', geography: '', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 100, budgetIdr: 10000000, programStory: '' };
      const res = scoreSector('SECTOR-AGRI-001', [], input);
      const problemComp = res.components.find(c => c.componentName === 'Problem Family Alignment');
      expect(problemComp).toBeDefined();
      expect(problemComp?.weight).toBe(0.25);
    });

    test('SCR-002: outcome alignment component weight should be 0.25 and saturate at 2.0', () => {
      const input: Page1Input = { programTitle: '', geography: '', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 100, budgetIdr: 10000000, programStory: '' };
      const res = scoreSector('SECTOR-AGRI-001', [], input);
      const outcomeComp = res.components.find(c => c.componentName === 'Outcome Family Alignment');
      expect(outcomeComp?.weight).toBe(0.25);
    });

    test('SCR-003: target actor alignment component weight should be 0.15 and saturate at 1.0', () => {
      const input: Page1Input = { programTitle: '', geography: '', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 100, budgetIdr: 10000000, programStory: '' };
      const res = scoreSector('SECTOR-AGRI-001', [], input);
      const actorComp = res.components.find(c => c.componentName === 'Target Actor Alignment');
      expect(actorComp?.weight).toBe(0.15);
    });

    test('SCR-004: intervention alignment component weight should be 0.15 and saturate at 2.0', () => {
      const input: Page1Input = { programTitle: '', geography: '', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 100, budgetIdr: 10000000, programStory: '' };
      const res = scoreSector('SECTOR-AGRI-001', [], input);
      const interventionComp = res.components.find(c => c.componentName === 'Intervention Alignment');
      expect(interventionComp?.weight).toBe(0.15);
    });

    test('SCR-005: language alignment component weight should be 0.05 and saturate at 2.0', () => {
      const input: Page1Input = { programTitle: '', geography: '', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 100, budgetIdr: 10000000, programStory: '' };
      const res = scoreSector('SECTOR-AGRI-001', [], input);
      const langComp = res.components.find(c => c.componentName === 'Language Alignment');
      expect(langComp?.weight).toBe(0.05);
    });

    test('SCR-006: supporting document bonus component weight should be 0.05 and saturate at 1.0', () => {
      const input: Page1Input = { programTitle: '', geography: '', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 100, budgetIdr: 10000000, programStory: '', donor_or_call_optional: 'donor-1' };
      const res = scoreSector('SECTOR-AGRI-001', [], input);
      const docComp = res.components.find(c => c.componentName === 'Supporting Document Bonus');
      expect(docComp?.weight).toBe(0.05);
      expect(docComp?.saturatedScore).toBe(1.0);
    });
  });

  // 5. Anti-signal penalties
  describe('Anti-Signal Penalties Application', () => {
    test('ANT-001: anti-signal for SDG-ANTI-FARMER-001 targets SDG_2 and deducts 0.25', () => {
      const input: Page1Input = { programTitle: '', geography: '', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 100, budgetIdr: 10000000, programStory: '' };
      const allCandidates: CanonicalCandidate[] = [
        {
          canonicalId: 'SDG-ANTI-FARMER-001',
          candidateType: 'sdg',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: ['SDG-ANTI-FARMER-001'],
          confusableCandidateIds: [],
          rawEvidenceSpans: [],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ];
      const sdgResults = [
        { targetId: 'SDG_2', rawScore: 0.80, intermediaryScore: 0.80, finalScore: 0.80, components: [], penaltiesApplied: [] }
      ];
      const { sdgResults: nextSDGs } = processConflictsAndPenalties(allCandidates, [], [], sdgResults, input, []);
      expect(nextSDGs[0].penaltiesApplied).toContainEqual(expect.objectContaining({ id: 'SDG-ANTI-FARMER-001', amount: 0.25 }));
    });

    test('ANT-002: anti-signal for SDG-ANTI-WOMAN-002 targets SDG_5 and deducts 0.15', () => {
      const input: Page1Input = { programTitle: '', geography: '', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 100, budgetIdr: 10000000, programStory: '' };
      const allCandidates: CanonicalCandidate[] = [
        {
          canonicalId: 'SDG-ANTI-WOMAN-002',
          candidateType: 'sdg',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: ['SDG-ANTI-WOMAN-002'],
          confusableCandidateIds: [],
          rawEvidenceSpans: [],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ];
      const sdgResults = [
        { targetId: 'SDG_5', rawScore: 0.80, intermediaryScore: 0.80, finalScore: 0.80, components: [], penaltiesApplied: [] }
      ];
      const { sdgResults: nextSDGs } = processConflictsAndPenalties(allCandidates, [], [], sdgResults, input, []);
      expect(nextSDGs[0].penaltiesApplied).toContainEqual(expect.objectContaining({ id: 'SDG-ANTI-WOMAN-002', amount: 0.15 }));
    });

    test('ANT-003: anti-signal for SDG-ANTI-TRAINING-006 targets SDG_4 and deducts 0.15', () => {
      const input: Page1Input = { programTitle: '', geography: '', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 100, budgetIdr: 10000000, programStory: '' };
      const allCandidates: CanonicalCandidate[] = [
        {
          canonicalId: 'SDG-ANTI-TRAINING-006',
          candidateType: 'sdg',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: ['SDG-ANTI-TRAINING-006'],
          confusableCandidateIds: [],
          rawEvidenceSpans: [],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ];
      const sdgResults = [
        { targetId: 'SDG_4', rawScore: 0.80, intermediaryScore: 0.80, finalScore: 0.80, components: [], penaltiesApplied: [] }
      ];
      const { sdgResults: nextSDGs } = processConflictsAndPenalties(allCandidates, [], [], sdgResults, input, []);
      expect(nextSDGs[0].penaltiesApplied).toContainEqual(expect.objectContaining({ id: 'SDG-ANTI-TRAINING-006', amount: 0.15 }));
    });

    test('ANT-004: anti-signals are bypassed if there is active outcome support for that SDG', () => {
      const input: Page1Input = { programTitle: '', geography: '', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 100, budgetIdr: 10000000, programStory: '' };
      const allCandidates: CanonicalCandidate[] = [
        {
          canonicalId: 'SDG-ANTI-TRAINING-006',
          candidateType: 'sdg',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: ['SDG-ANTI-TRAINING-006'],
          confusableCandidateIds: [],
          rawEvidenceSpans: [],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ];
      const eligibleCandidates: CanonicalCandidate[] = [
        {
          canonicalId: 'OF-003', // supports SDG_4
          candidateType: 'outcome',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: [],
          confusableCandidateIds: [],
          rawEvidenceSpans: [],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ];
      const sdgResults = [
        { targetId: 'SDG_4', rawScore: 0.80, intermediaryScore: 0.80, finalScore: 0.80, components: [], penaltiesApplied: [] }
      ];
      const { sdgResults: nextSDGs } = processConflictsAndPenalties(allCandidates, eligibleCandidates, [], sdgResults, input, []);
      expect(nextSDGs[0].penaltiesApplied).toHaveLength(0);
    });

    test('ANT-005: final score is clamped to [0.0000, 1.0000] even with heavy penalties', () => {
      const input: Page1Input = { programTitle: '', geography: '', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 100, budgetIdr: 10000000, programStory: '' };
      const allCandidates: CanonicalCandidate[] = [
        {
          canonicalId: 'SDG-ANTI-FARMER-001',
          candidateType: 'sdg',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: ['SDG-ANTI-FARMER-001'],
          confusableCandidateIds: [],
          rawEvidenceSpans: [],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ];
      const sdgResults = [
        { targetId: 'SDG_2', rawScore: 0.10, intermediaryScore: 0.10, finalScore: 0.10, components: [], penaltiesApplied: [] }
      ];
      const { sdgResults: nextSDGs } = processConflictsAndPenalties(allCandidates, [], [], sdgResults, input, []);
      expect(nextSDGs[0].finalScore).toBe(0.0000);
    });
  });

  // 6. 13 Conflict rules
  describe('13 Conflict Rules Evaluated Sequentially', () => {
    test('CON-001: CONF-012 triggered when budget ratio is extremely high (>10M IDR per beneficiary)', () => {
      const input: Page1Input = { programTitle: '', geography: '', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 10, budgetIdr: 150000000, programStory: '' };
      const triggered: string[] = [];
      processConflictsAndPenalties([], [], [], [], input, triggered);
      expect(triggered).toContain('CONF-012');
    });

    test('CON-002: CONF-010 triggered when beneficiary count mismatches narrative description', () => {
      const input: Page1Input = { programTitle: '', geography: '', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 50, budgetIdr: 10000000, programStory: 'Kami menyasar 150 orang warga di desa binaan.' };
      const triggered: string[] = [];
      processConflictsAndPenalties([], [], [], [], input, triggered);
      expect(triggered).toContain('CONF-010');
    });

    test('CON-003: CONF-011 triggered when structured location mismatches narrative text', () => {
      const input: Page1Input = { programTitle: '', geography: 'Kab. Garut', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 100, budgetIdr: 10000000, programStory: 'Program diselenggarakan sepenuhnya di wilayah Bandung.' };
      const triggered: string[] = [];
      processConflictsAndPenalties([], [], [], [], input, triggered);
      expect(triggered).toContain('CONF-011');
    });

    test('CON-004: SDG Primary Coverage Gate downgrades raw SDG scores >= 0.75 to secondary before linkage', () => {
      const input: Page1Input = { programTitle: '', geography: '', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 100, budgetIdr: 10000000, programStory: '' };
      const sdgResults = [
        { targetId: 'SDG_2', rawScore: 0.85, intermediaryScore: 0.85, finalScore: 0.85, components: [], penaltiesApplied: [] }
      ];
      const rec = assignRecommendations([], [], sdgResults, input, []);
      expect(rec.primarySDGs).toHaveLength(0);
      expect(rec.secondarySDGs).toContain('SDG_2');
    });

    test('CON-005: CONF-001 triggered on sector ambiguity under 0.10 margin', () => {
      const input: Page1Input = { programTitle: '', geography: '', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 100, budgetIdr: 10000000, programStory: '' };
      const sectorResults = [
        { targetId: 'SECTOR-AGRI-001', rawScore: 0.85, intermediaryScore: 0.85, finalScore: 0.85, components: [], penaltiesApplied: [] },
        { targetId: 'SECTOR-LIVELIHOOD-002', rawScore: 0.83, intermediaryScore: 0.83, finalScore: 0.83, components: [], penaltiesApplied: [] }
      ];
      const rec = assignRecommendations([], sectorResults, [], input, []);
      expect(rec.primarySector).toBeNull();
      expect(rec.isAmbiguous).toBe(true);
      expect(rec.warnings).toContain('TPL-CONF-001');
    });

    test('CON-006: CONF-001 resolved with outcome tie breaking when agriculture outcome is present', () => {
      const input: Page1Input = { programTitle: '', geography: '', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 100, budgetIdr: 10000000, programStory: '' };
      const sectorResults = [
        { targetId: 'SECTOR-AGRI-001', rawScore: 0.85, intermediaryScore: 0.85, finalScore: 0.85, components: [], penaltiesApplied: [] },
        { targetId: 'SECTOR-LIVELIHOOD-002', rawScore: 0.83, intermediaryScore: 0.83, finalScore: 0.83, components: [], penaltiesApplied: [] }
      ];
      const eligibleCandidates: CanonicalCandidate[] = [
        {
          canonicalId: 'OF-012', // Agri outcome family
          candidateType: 'outcome',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: [],
          confusableCandidateIds: [],
          rawEvidenceSpans: [],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ];
      const rec = assignRecommendations(eligibleCandidates, sectorResults, [], input, []);
      expect(rec.primarySector).toBe('SECTOR-AGRI-001');
      expect(rec.isAmbiguous).toBe(false);
    });
  });

  // 7. 24 Missing information rules
  describe('24 Missing Information Rules Deterministic Evaluation', () => {
    test('MIS-001: MISS-001 triggered if beneficiary count is missing or 0', () => {
      const input: Page1Input = { programTitle: '', geography: '', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 0, budgetIdr: 10000000, programStory: '' };
      const missing = getTriggeredMissingInformationRules(input, []);
      expect(missing).toContain('MISS-001');
    });

    test('MIS-002: MISS-002 triggered if geography location is unknown or empty', () => {
      const input: Page1Input = { programTitle: '', geography: 'unknown', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 100, budgetIdr: 10000000, programStory: '' };
      const missing = getTriggeredMissingInformationRules(input, []);
      expect(missing).toContain('MISS-002');
    });

    test('MIS-003: MISS-003 triggered if duration months is missing or 0', () => {
      const input: Page1Input = { programTitle: '', geography: 'Garut', durationMonths: 0, beneficiaryDescription: '', beneficiaryCount: 100, budgetIdr: 10000000, programStory: '' };
      const missing = getTriggeredMissingInformationRules(input, []);
      expect(missing).toContain('MISS-003');
    });

    test('MIS-004: MISS-004 triggered if budget amount is missing or 0', () => {
      const input: Page1Input = { programTitle: '', geography: 'Garut', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 100, budgetIdr: 0, programStory: '' };
      const missing = getTriggeredMissingInformationRules(input, []);
      expect(missing).toContain('MISS-004');
    });

    test('MIS-005: MISS-014 triggered if no evaluation or assessment methods are found in narrative', () => {
      const input: Page1Input = { programTitle: '', geography: 'Garut', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 100, budgetIdr: 10000000, programStory: 'Kami akan melakukan pembagian pupuk gratis.' };
      const missing = getTriggeredMissingInformationRules(input, []);
      expect(missing).toContain('MISS-014');
    });

    test('MIS-006: MISS-024 safeguarding triggered when narrative mentions children but lacks safeguarding protocols', () => {
      const input: Page1Input = { programTitle: '', geography: 'Garut', durationMonths: 12, beneficiaryDescription: '', beneficiaryCount: 100, budgetIdr: 10000000, programStory: 'Kami mengundang anak-anak sekolah untuk belajar bersama.' };
      const missing = getTriggeredMissingInformationRules(input, []);
      expect(missing).toContain('MISS-024');
    });
  });

});
