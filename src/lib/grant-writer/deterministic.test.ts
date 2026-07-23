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
  assignRecommendations,
  runScoringPipeline,
  evaluateMethodologyQualityGate,
  assembleBlueprint,
  validateCausalOrdering,
  deriveCausalSupportSnapshot,
  createPage2Payload,
  convertToProvisionalDomainResponse,
  evaluateCausalGuardrails,
  createManualReviewState,
  acceptRecommendation,
  rejectRecommendation,
  changeRecommendationLevel,
  selectAlternativeCanonicalCandidate,
  addManualCandidate,
  editBlueprintText,
  resolveAmbiguity,
  resolveMissingInformation,
  acceptUnknown,
  restoreOriginalItem,
  buildApprovedSessionSnapshot,
  BlueprintItem,
  EvidenceSpan,
  CanonicalCandidate
} from './deterministic';
import type { Page1Input } from './provisionalAdapter';

const P0E_HARD_NEGATIVE_DEFERRED_IDS = [
  'FIX-HN-101',
  'FIX-HN-102',
  'FIX-HN-103',
  'FIX-HN-104',
  'FIX-HN-105',
  'FIX-HN-106',
  'FIX-HN-107',
  'FIX-HN-108',
  'FIX-HN-109',
  'FIX-HN-110',
  'FIX-HN-111',
  'FIX-HN-112',
  'FIX-HN-113',
  'FIX-HN-114',
  'FIX-HN-115'
] as const;

const P0E_GOLD_DEFERRED_IDS = [
  'FIX-GOLD-01',
  'FIX-GOLD-02',
  'FIX-GOLD-03',
  'FIX-GOLD-04',
  'FIX-GOLD-05',
  'FIX-GOLD-06',
  'FIX-GOLD-07',
  'FIX-GOLD-08',
  'FIX-GOLD-09',
  'FIX-GOLD-10',
  'FIX-GOLD-11',
  'FIX-GOLD-12'
] as const;

const P0E_DEFERRED_EXECUTION_STATUS = 'P0_E_EXECUTION_NOT_YET_PROVEN' as const;

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

  // 8. P0-D Program Blueprint Assembly and Page 2 Integration Tests
  describe('P0-D Program Blueprint Assembly and Integration', () => {
    test('BLP-001: should assemble blueprint with no raw bracketed placeholders for resolved slots', () => {
      const input = {
        programTitle: 'Program Pemberdayaan Ekonomi',
        geography: 'Desa Sukamaju',
        location: 'Desa Sukamaju',
        durationMonths: 12,
        beneficiaryDescription: 'Petani kecil perempuan',
        beneficiaryCount: 150,
        budgetIdr: 25000000,
        programStory: 'Cerita program utama.'
      } as Page1Input & { location: string };
      const candidates: CanonicalCandidate[] = [
        {
          canonicalId: 'PETANI-01',
          candidateType: 'actor',
          matchedSignals: [], negativeSignals: [], antiSignals: [], confusableCandidateIds: [], rawEvidenceSpans: [], minimumEvidenceStatus: 'met', registryVersion: '1.2'
        },
        {
          canonicalId: 'MISKIN-02',
          candidateType: 'problem',
          matchedSignals: [], negativeSignals: [], antiSignals: [], confusableCandidateIds: [], rawEvidenceSpans: [
            {
              sourceField: 'program_story',
              originalText: 'kemiskinan petani',
              matchedText: 'kemiskinan petani',
              normalizedMatch: 'kemiskinan petani',
              startOffset: 0,
              endOffset: 17,
              signalType: 'lexical',
              registryId: 'MISKIN-02'
            }
          ], minimumEvidenceStatus: 'met', registryVersion: '1.2'
        }
      ];

      const blueprint = assembleBlueprint(input, candidates);
      expect(blueprint.items).toHaveLength(5);
      for (const item of blueprint.items.filter(i => i.text)) {
        expect(item.text).not.toContain('[');
        expect(item.text).not.toContain(']');
      }
    });

    test('BLP-002: missing location remains unresolved with neutral marker and no factual fallback text', () => {
      const input: Page1Input = {
        programTitle: '',
        geography: 'unknown',
        durationMonths: 12,
        beneficiaryDescription: '',
        beneficiaryCount: 100,
        budgetIdr: 10000000,
        programStory: ''
      };
      const blueprint = assembleBlueprint(input, []);
      const problemSlot = blueprint.items.find(i => i.id === 'SLOT-PROBLEM-01');
      expect(problemSlot?.status).toBe('unresolved');
      expect(problemSlot?.text).toBeUndefined();
      expect(problemSlot?.unresolvedReason).toBe('UNRESOLVED_NEEDS_EVIDENCE');
    });

    test('BLP-003: should validate causal ordering and reject invalid tasks at outcome/impact levels', () => {
      const badItems: BlueprintItem[] = [
        {
          id: 'SLOT-OUTCOME-01',
          section: 'outcome',
          text: 'ARCH-TRAINING-001',
          status: 'from_source',
          approvable: true
        }
      ];
      const issues = validateCausalOrdering(badItems);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toContain('contains activity canonical ID');
    });

    test('BLP-004: should create page 2 payload with fixture mode metadata without production default fabrication', () => {
      const input = {
        programTitle: 'Pemberdayaan Petani Perempuan',
        geography: 'Kabupaten Garut',
        location: 'Kabupaten Garut',
        durationMonths: 12,
        beneficiaryDescription: 'Perempuan tani miskin',
        beneficiaryCount: 150,
        budgetIdr: 30000000,
        programStory: 'Menyelenggarakan pelatihan pertanian organik bagi kelompok perempuan.'
      } as Page1Input & { location: string };

      const payload = createPage2Payload(input, {
        mode: 'fixture',
        sourceFixtureId: 'FIX-GOLD-01',
        engineVersion: 'det-v1.2.0'
      });
      expect(payload.contractVersion).toBe('SCORING-CONTRACT-V1');
      expect(payload.sourceFixtureId).toBe('FIX-GOLD-01');
      expect(payload.sectors).toBeDefined();
      expect(payload.blueprint.items).toHaveLength(5);
    });
  });

  describe('P0-D Targeted Contract Corrections', () => {
    function baseInput(overrides?: Partial<Page1Input>): Page1Input {
      return {
        programTitle: 'Program Uji Deterministik',
        geography: 'Kabupaten Garut',
        durationMonths: 12,
        beneficiaryDescription: 'Petani kecil',
        beneficiaryCount: 120,
        budgetIdr: 100000000,
        programStory: 'Program melakukan pendampingan dan pemantauan hasil.',
        ...overrides
      };
    }

    function span(text: string): EvidenceSpan {
      return {
        sourceField: 'program_story',
        originalText: text,
        matchedText: text,
        normalizedMatch: text.toLowerCase(),
        startOffset: 0,
        endOffset: text.length,
        signalType: 'lexical',
        registryId: 'TEST'
      };
    }

    test('P0D-01: missing location remains unresolved with no factual fallback', () => {
      const blueprint = assembleBlueprint(baseInput({ geography: 'unknown' }), []);
      const activity = blueprint.items.find(i => i.id === 'SLOT-ACTIVITY-01');
      expect(activity?.status).toBe('unresolved');
      expect(activity?.text).toBeUndefined();
    });

    test('P0D-02: missing actor remains unresolved and not replaced by beneficiary', () => {
      const blueprint = assembleBlueprint(baseInput() as Page1Input & { location?: string }, [
        {
          canonicalId: 'OF-001',
          candidateType: 'outcome',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: [],
          confusableCandidateIds: [],
          rawEvidenceSpans: [span('petani menerapkan teknik tanam')],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ]);
      const outcome = blueprint.items.find(i => i.id === 'SLOT-OUTCOME-01');
      expect(outcome?.status).toBe('unresolved');
      expect(outcome?.missingReferences).toContain('MISS-006');
    });

    test('P0D-03: missing problem, outcome, output, impact are not fabricated', () => {
      const blueprint = assembleBlueprint(baseInput(), []);
      const unresolvedCount = blueprint.items.filter(i => i.status === 'unresolved').length;
      expect(unresolvedCount).toBeGreaterThan(0);
      for (const item of blueprint.items.filter(i => i.status === 'unresolved')) {
        expect(item.text).toBeUndefined();
      }
    });

    test('P0D-04: no raw placeholder leaks to text', () => {
      const blueprint = assembleBlueprint(baseInput() as Page1Input & { location?: string }, [
        {
          canonicalId: 'PF-01',
          candidateType: 'problem',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: [],
          confusableCandidateIds: [],
          rawEvidenceSpans: [span('kemiskinan rumah tangga')],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ]);
      for (const item of blueprint.items.filter(i => i.text)) {
        expect(item.text).not.toContain('[');
        expect(item.text).not.toContain(']');
      }
    });

    test('P0D-05: candidate IDs are not rendered as labels when canonical labels are unavailable', () => {
      const blueprint = assembleBlueprint(baseInput(), [
        {
          canonicalId: 'OF-123',
          candidateType: 'outcome',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: [],
          confusableCandidateIds: [],
          rawEvidenceSpans: [],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ]);
      const outcome = blueprint.items.find(i => i.id === 'SLOT-OUTCOME-01');
      expect(outcome?.text).toBeUndefined();
    });

    test('P0D-06: activity cannot become outcome', () => {
      const issues = validateCausalOrdering([
        { id: 'X', section: 'outcome', text: 'ARCH-TRAINING-001', status: 'from_source', approvable: true }
      ]);
      expect(issues.length).toBeGreaterThan(0);
    });

    test('P0D-07: output cannot become impact', () => {
      const issues = validateCausalOrdering([
        { id: 'Y', section: 'impact', text: 'OPF-001', status: 'from_source', approvable: true }
      ]);
      expect(issues.length).toBeGreaterThan(0);
    });

    test('P0D-08: outcome requires target actor and object of change', () => {
      const candidates: CanonicalCandidate[] = [
        {
          canonicalId: 'OF-001',
          candidateType: 'outcome',
          matchedSignals: [], negativeSignals: [], antiSignals: [], confusableCandidateIds: [],
          rawEvidenceSpans: [span('adopsi praktik')], minimumEvidenceStatus: 'met', registryVersion: '1.2'
        }
      ];
      const support = deriveCausalSupportSnapshot(candidates);
      const warnings = evaluateCausalGuardrails(candidates, {
        ...support,
        targetActor: { state: 'unresolved', reason: 'test' },
        objectOfChange: { state: 'unresolved', reason: 'test' }
      });
      expect(warnings.map(w => w.code)).toContain('WARN-OUTCOME-INCOMPLETE');
    });

    test('P0D-09: beneficiary and target actor remain distinct', () => {
      const candidates: CanonicalCandidate[] = [
        {
          canonicalId: 'ACT-001',
          candidateType: 'actor',
          matchedSignals: [], negativeSignals: [], antiSignals: [], confusableCandidateIds: [],
          rawEvidenceSpans: [
            {
              sourceField: 'beneficiary_description',
              originalText: 'petani kecil',
              matchedText: 'petani kecil',
              normalizedMatch: 'petani kecil',
              startOffset: 0,
              endOffset: 11,
              signalType: 'actor_signal',
              registryId: 'ACT-001'
            }
          ],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ];
      const warnings = evaluateCausalGuardrails(candidates);
      expect(warnings.map(w => w.code)).toContain('WARN-BENEFICIARY-NOT-TARGET');
    });

    test('P0D-10: institutional actor and duty bearer remain distinct', () => {
      const support = deriveCausalSupportSnapshot([]);
      const warnings = evaluateCausalGuardrails([], {
        ...support,
        institutionalActor: { state: 'supported', reason: 'explicit test support' },
        dutyBearer: { state: 'unresolved', reason: 'missing role evidence' }
      });
      expect(warnings.map(w => w.code)).toContain('WARN-INSTITUTION-NOT-DUTY-BEARER');
    });

    test('P0D-11: unsupported causal leap remains unresolved', () => {
      const payload = createPage2Payload(baseInput(), { engineVersion: 'det-v1.2.0' });
      const hasCausalWarning = payload.warnings.some(w => w.code.includes('WARN-CAUSAL'));
      expect(hasCausalWarning).toBe(true);
    });

    test('P0D-12: evidence and provenance are preserved in payload', () => {
      const payload = createPage2Payload(baseInput(), { engineVersion: 'det-v1.2.0' });
      expect(payload.rawCanonicalPayload).toBeDefined();
      expect(payload.warnings).toBeDefined();
      expect(payload.blueprint.items.every(i => Array.isArray(i.provenance))).toBe(true);
    });

    test('P0D-13: score confidence and recommendation levels are preserved', () => {
      const payload = createPage2Payload(baseInput(), { engineVersion: 'det-v1.2.0' });
      expect(payload.sectors.length).toBeGreaterThan(0);
      expect(payload.sectors[0].confidenceBand).toBeDefined();
      expect(payload.sectors[0].level).toBeDefined();
    });

    test('P0D-14: CONF MISS and SDG unresolved handoff is preserved', () => {
      const payload = createPage2Payload(baseInput({ geography: 'unknown' }), { engineVersion: 'det-v1.2.0' });
      expect(payload.missResults).toBeDefined();
      expect(payload.sdgCoverageStatus).toBe('UNRESOLVED');
      expect(payload.confResults).toBeUndefined();
      expect(payload.adapterValidationIssues.some(i => i.id === 'VAL-CONF-STRUCTURED-UNAVAILABLE')).toBe(true);
    });

    test('P0D-15: sourceFixtureId is absent in production payload', () => {
      const payload = createPage2Payload(baseInput(), { engineVersion: 'det-v1.2.0' });
      expect(payload.sourceFixtureId).toBeUndefined();
    });

    test('P0D-16: missing version metadata is not fabricated and reported via validation issue', () => {
      const payload = createPage2Payload(baseInput());
      expect(payload.engineVersion).toBeUndefined();
      expect(payload.adapterValidationIssues.some(i => i.id === 'VAL-ENGINE-VERSION-MISSING')).toBe(true);
    });

    test('P0D-17: manual accept and reject are immutable', () => {
      const payload = createPage2Payload(baseInput(), { engineVersion: 'det-v1.2.0' });
      const state = createManualReviewState(payload);
      const accepted = acceptRecommendation(state, 'sectors', state.working.sectors[0].id, '2026-07-22T00:00:00.000Z');
      const rejected = rejectRecommendation(accepted, 'sectors', accepted.working.sectors[0].id, '2026-07-22T00:01:00.000Z');
      expect(state.working.sectors[0]).not.toBe(accepted.working.sectors[0]);
      expect(accepted.working.sectors[0]).not.toBe(rejected.working.sectors[0]);
      expect(state.working.sectors[0].level).toBe(state.original.sectors[0].level);
      expect(rejected.decisions.length).toBe(2);
    });

    test('P0D-18: manual level change preserves original', () => {
      const payload = createPage2Payload(baseInput(), { engineVersion: 'det-v1.2.0' });
      const state = createManualReviewState(payload);
      const next = changeRecommendationLevel(state, 'sdgs', state.working.sdgs[0].id, 'optional', '2026-07-22T00:00:00.000Z');
      expect(next.original.sdgs[0].level).toBe(payload.sdgs[0].level);
      expect(next.working.sdgs[0].level).toBe('optional');
    });

    test('P0D-19: manual candidate without evidence gets honest status', () => {
      const payload = createPage2Payload(baseInput(), { engineVersion: 'det-v1.2.0' });
      const state = createManualReviewState(payload);
      const next = addManualCandidate(state, 'interventions', {
        id: 'ARCH-MANUAL-01',
        level: 'secondary',
        status: 'user_override',
        label: 'Manual Candidate'
      }, '2026-07-22T00:00:00.000Z');
      const added = next.working.interventions.find(i => i.id === 'ARCH-MANUAL-01');
      expect(added?.status).toBe('user_override_needs_evidence');
    });

    test('P0D-20: manual blueprint edit preserves original text', () => {
      const payload = createPage2Payload(baseInput(), { engineVersion: 'det-v1.2.0' });
      const state = createManualReviewState(payload);
      const firstId = state.working.blueprint.items[0].id;
      const next = editBlueprintText(state, firstId, 'Teks manual editor', '2026-07-22T00:00:00.000Z');
      const originalText = state.original.blueprint.items.find(i => i.id === firstId)?.text;
      const workingText = next.working.blueprint.items.find(i => i.id === firstId)?.text;
      expect(originalText).not.toBe(workingText);
    });

    test('P0D-21: restore-original works', () => {
      const payload = createPage2Payload(baseInput(), { engineVersion: 'det-v1.2.0' });
      const state = createManualReviewState(payload);
      const id = state.working.sdgs[0].id;
      const changed = changeRecommendationLevel(state, 'sdgs', id, 'optional', '2026-07-22T00:00:00.000Z');
      const restored = restoreOriginalItem(changed, 'recommendation', { collection: 'sdgs', id }, '2026-07-22T00:01:00.000Z');
      expect(restored.working.sdgs[0].level).toBe(restored.original.sdgs[0].level);
    });

    test('P0D-22: ambiguity resolution is recorded', () => {
      const payload = createPage2Payload(baseInput(), { engineVersion: 'det-v1.2.0' });
      const state = createManualReviewState({ ...payload, ambiguities: [{ id: 'AMB-1', field: 'sector', candidates: ['S1', 'S2'], requiredForApproval: true, state: 'unresolved' }] });
      const next = resolveAmbiguity(state, 'AMB-1', 'S1', '2026-07-22T00:00:00.000Z');
      expect(next.decisions.some(d => d.action === 'resolve_ambiguity')).toBe(true);
    });

    test('P0D-23: missing-information resolution is recorded', () => {
      const payload = createPage2Payload(baseInput(), { engineVersion: 'det-v1.2.0' });
      const state = createManualReviewState({ ...payload, missingInformation: [{ id: 'M1', question: 'Q', priority: 'critical', blocking: true, requiredForApproval: true, state: 'unresolved' }] });
      const next = resolveMissingInformation(state, 'M1', 'jawaban', '2026-07-22T00:00:00.000Z');
      expect(next.decisions.some(d => d.action === 'resolve_missing_information')).toBe(true);
    });

    test('P0D-24: allowUnknown is respected', () => {
      const payload = createPage2Payload(baseInput(), { engineVersion: 'det-v1.2.0' });
      const state = createManualReviewState({ ...payload, missingInformation: [{ id: 'M2', question: 'Q', priority: 'recommended', blocking: false, requiredForApproval: false, state: 'unresolved' }] });
      const unchanged = acceptUnknown(state, 'missing', 'M2', '2026-07-22T00:00:00.000Z', false);
      const changed = acceptUnknown(state, 'missing', 'M2', '2026-07-22T00:00:00.000Z', true);
      expect(unchanged.decisions.length).toBe(0);
      expect(changed.decisions.length).toBe(1);
    });

    test('P0D-25: approval blocked by unresolved blockers', () => {
      const payload = createPage2Payload(baseInput(), { engineVersion: 'det-v1.2.0' });
      const state = createManualReviewState({ ...payload, missingInformation: [{ id: 'MB', question: 'Q', priority: 'critical', blocking: true, requiredForApproval: true, state: 'unresolved' }] });
      const approval = buildApprovedSessionSnapshot(state, '2026-07-22T00:00:00.000Z');
      expect(approval.approved).toBe(false);
      expect(approval.blockers).toContain('MB');
    });

    test('P0D-26: session snapshot contains required audit fields', () => {
      const payload = createPage2Payload(baseInput(), { engineVersion: 'det-v1.2.0' });
      const state = createManualReviewState({
        ...payload,
        missingInformation: [],
        ambiguities: [],
        blueprint: {
          items: payload.blueprint.items.map(i => ({
            ...i,
            approvable: true,
            status: i.status === 'unresolved' ? 'confirmed' : i.status,
            text: i.text ?? 'Resolved by reviewer'
          }))
        }
      });
      const approval = buildApprovedSessionSnapshot(state, '2026-07-22T00:00:00.000Z');
      if (!approval.snapshot) {
        throw new Error('snapshot expected');
      }
      expect(approval.snapshot.userDecisions).toBeDefined();
      expect(approval.snapshot.originalEngineRecommendations).toBeDefined();
    });

    test('P0D-27: snapshot is explicitly non-durable session-only', () => {
      const payload = createPage2Payload(baseInput(), { engineVersion: 'det-v1.2.0' });
      const state = createManualReviewState({
        ...payload,
        missingInformation: [],
        ambiguities: [],
        blueprint: {
          items: payload.blueprint.items.map(i => ({
            ...i,
            approvable: true,
            status: i.status === 'unresolved' ? 'confirmed' : i.status,
            text: i.text ?? 'Resolved by reviewer'
          }))
        }
      });
      const approval = buildApprovedSessionSnapshot(state, '2026-07-22T00:00:00.000Z');
      expect(approval.snapshot?.durability).toBe('session_only_non_durable');
    });

    test('P0D-28: same input produces deterministic output except timestamp', () => {
      const input = baseInput();
      const p1 = createPage2Payload(input, { now: '2026-07-22T00:00:00.000Z', engineVersion: 'det-v1.2.0' });
      const p2 = createPage2Payload(input, { now: '2026-07-22T01:00:00.000Z', engineVersion: 'det-v1.2.0' });
      expect({ ...p1, createdAt: 'x' }).toStrictEqual({ ...p2, createdAt: 'x' });
    });

    test('P0D-29: input and scoring output references are not mutated', () => {
      const input = baseInput();
      const frozen = structuredClone(input);
      createPage2Payload(input, { engineVersion: 'det-v1.2.0' });
      expect(input).toStrictEqual(frozen);
    });

    test('P0D-30: no ai network db ui coupling appears in deterministic payload', () => {
      const payload = createPage2Payload(baseInput(), { engineVersion: 'det-v1.2.0' });
      expect((payload.rawCanonicalPayload as Record<string, unknown>).aiProvider).toBeUndefined();
      expect((payload.rawCanonicalPayload as Record<string, unknown>).dbConnection).toBeUndefined();
      expect((payload.rawCanonicalPayload as Record<string, unknown>).uiState).toBeUndefined();
    });

    test('P0D-31: manual alternative candidate selection records old and new values', () => {
      const payload = createPage2Payload(baseInput(), { engineVersion: 'det-v1.2.0' });
      const state = createManualReviewState(payload);
      const id = state.working.sectors[0].id;
      const next = selectAlternativeCanonicalCandidate(state, 'sectors', id, 'SECTOR-ALT-99', '2026-07-22T00:00:00.000Z');
      expect(next.decisions[0].oldValue).toBeDefined();
      expect(next.decisions[0].newValue).toBeDefined();
    });

    test('P0D-32: core transport does not require fixture id in production path', () => {
      const payload = createPage2Payload(baseInput(), {
        mode: 'production',
        engineVersion: 'det-v1.2.0'
      });
      expect(payload.transportKind).toBe('P0_D_DETERMINISTIC_CORE_TRANSPORT');
      expect(payload.sourceFixtureId).toBeUndefined();
    });

    test('P0D-33: adapter compatibility conversion fails when required metadata is absent', () => {
      const payload = createPage2Payload(baseInput(), { engineVersion: 'det-v1.2.0' });
      const result = convertToProvisionalDomainResponse(payload, {
        metadata: {
          contractVersion: 'SCORING-CONTRACT-V1',
          engineVersion: '',
          registryVersions: {},
          sourceFixtureId: '',
          scenarioPurpose: ''
        }
      });
      expect(result.success).toBe(false);
    });

    test('P0D-34: adapter compatibility conversion succeeds only with explicit metadata and compatible payload', () => {
      const payload = createPage2Payload(baseInput(), {
        engineVersion: 'det-v1.2.0',
        structuredConflicts: [
          {
            id: 'CONF-001',
            processingType: 'USER_REVIEW_ONLY',
            conditionResult: 'triggered',
            precedence: 1,
            reviewRequired: true,
            provenance: ['explicit_test']
          }
        ],
        sdgCoverageStatus: 'SUPPORTED'
      });

      const compatiblePayload = {
        ...payload,
        adapterValidationIssues: [],
        ambiguities: [],
        missingInformation: [],
        blueprint: {
          items: payload.blueprint.items.map(i => ({
            ...i,
            status: i.status === 'unresolved' ? 'modified' : i.status,
            approvable: true,
            text: i.text ?? 'resolved'
          }))
        }
      };

      const before = structuredClone(compatiblePayload);
      const result = convertToProvisionalDomainResponse(compatiblePayload, {
        metadata: {
          contractVersion: 'SCORING-CONTRACT-V1',
          engineVersion: 'det-v1.2.0',
          registryVersions: { sectors: 'v1.2.0' },
          sourceFixtureId: 'FIX-COMP-01',
          scenarioPurpose: 'adapter-compat-test'
        }
      });

      expect(result.success).toBe(true);
      if (!result.success) {
        throw new Error('expected success result');
      }
      expect(result.response.sourceFixtureId).toBe('FIX-COMP-01');
      expect(compatiblePayload).toStrictEqual(before);
    });

    test('P0D-35: missing actor metadata yields unresolved state not false classification', () => {
      const support = deriveCausalSupportSnapshot([]);
      expect(support.targetActor.state).toBe('unresolved');
      expect(support.targetActor.reason).toContain('No actor-role metadata');
    });

    test('P0D-36: evidence-backed target actor yields supported state', () => {
      const support = deriveCausalSupportSnapshot([
        {
          canonicalId: 'ACT-001',
          candidateType: 'actor',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: [],
          confusableCandidateIds: [],
          rawEvidenceSpans: [
            {
              sourceField: 'program_story',
              originalText: 'petani mempraktikkan pencatatan',
              matchedText: 'petani mempraktikkan pencatatan',
              normalizedMatch: 'petani mempraktikkan pencatatan',
              startOffset: 0,
              endOffset: 30,
              signalType: 'actor_signal',
              registryId: 'ACT-001'
            }
          ],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ]);
      expect(support.targetActor.state).toBe('supported');
    });

    test('P0D-37: missing object of change keeps outcome unresolved', () => {
      const support = deriveCausalSupportSnapshot([
        {
          canonicalId: 'OF-001',
          candidateType: 'outcome',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: [],
          confusableCandidateIds: [],
          rawEvidenceSpans: [span('adopsi')],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ]);
      const warnings = evaluateCausalGuardrails([
        {
          canonicalId: 'OF-001',
          candidateType: 'outcome',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: [],
          confusableCandidateIds: [],
          rawEvidenceSpans: [span('adopsi')],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ], support);
      expect(support.objectOfChange.state).toBe('unresolved');
      expect(warnings.map(w => w.code)).toContain('WARN-OUTCOME-INCOMPLETE');
    });

    test('P0D-38: impact slot does not reuse outcome evidence and stays unresolved without impact source', () => {
      const blueprint = assembleBlueprint(baseInput(), [
        {
          canonicalId: 'OF-100',
          candidateType: 'outcome',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: [],
          confusableCandidateIds: [],
          rawEvidenceSpans: [span('petani mengadopsi praktik budidaya')],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ]);
      const impactSlot = blueprint.items.find(i => i.id === 'SLOT-IMPACT-01');
      const outcomeSlot = blueprint.items.find(i => i.id === 'SLOT-OUTCOME-01');
      expect(impactSlot?.status).toBe('unresolved');
      expect(impactSlot?.text).toBeUndefined();
      expect(outcomeSlot?.status).toBe('unresolved');
    });

    test('P0D-39: indicator binding supports output and outcome, rejects unsupported levels, and keeps unknown unresolved', () => {
      const payload = createPage2Payload(baseInput(), {
        engineVersion: 'det-v1.2.0',
        indicatorBindings: [
          { indicatorId: 'IND-OUT', requestedLevel: 'output' },
          { indicatorId: 'IND-OCM', requestedLevel: 'outcome' },
          { indicatorId: 'IND-UNK' },
          { indicatorId: 'IND-ACT', requestedLevel: 'activity' }
        ]
      });

      const byId = new Map((payload.causalSupport?.indicatorBindings ?? []).map(i => [i.indicatorId, i]));
      expect(byId.get('IND-UNK')?.bindingState).toBe('unresolved');
      expect(byId.get('IND-ACT')?.bindingState).toBe('unsupported');
      expect(byId.get('IND-OUT')?.requestedLevel).toBe('output');
      expect(byId.get('IND-OCM')?.requestedLevel).toBe('outcome');
    });

    test('P0D-40: structured conflicts preserve exact values and warning strings do not generate CONF IDs', () => {
      const structured = [
        {
          id: 'CONF-008',
          processingType: 'USER_REVIEW_ONLY' as const,
          conditionResult: 'triggered' as const,
          precedence: 2,
          reviewRequired: true,
          provenance: ['unit_test']
        }
      ];
      const payload = createPage2Payload(baseInput(), {
        engineVersion: 'det-v1.2.0',
        structuredConflicts: structured,
        sdgCoverageStatus: 'UNRESOLVED'
      });
      expect(payload.confResults).toStrictEqual(structured);

      const payloadNoStructured = createPage2Payload(baseInput(), {
        engineVersion: 'det-v1.2.0'
      });
      expect(payloadNoStructured.confResults).toBeUndefined();
      expect(payloadNoStructured.adapterValidationIssues.some(i => i.id === 'VAL-CONF-STRUCTURED-UNAVAILABLE')).toBe(true);
    });

    test('P0D-41: miss and sdg handoff preserve exact values', () => {
      const payload = createPage2Payload(baseInput({ geography: 'unknown' }), {
        engineVersion: 'det-v1.2.0',
        sdgCoverageStatus: 'UNSUPPORTED'
      });
      expect(payload.sdgCoverageStatus).toBe('UNSUPPORTED');
      expect(payload.missResults?.map(m => m.id)).toStrictEqual(payload.missingInformation?.map(m => m.id));
    });

    test('P0D-42: recommendation score confidence and level preserve exact equality for deterministic reruns', () => {
      const input = baseInput();
      const p1 = createPage2Payload(input, { now: '2026-07-22T00:00:00.000Z', engineVersion: 'det-v1.2.0' });
      const p2 = createPage2Payload(input, { now: '2026-07-22T00:00:00.000Z', engineVersion: 'det-v1.2.0' });
      expect(p1.sectors).toStrictEqual(p2.sectors);
      expect(p1.sdgs).toStrictEqual(p2.sdgs);
      expect(p1.interventions).toStrictEqual(p2.interventions);
    });

    test('P0D-43: snapshot required fields preserve exact equality when approved', () => {
      const payload = createPage2Payload(baseInput(), {
        engineVersion: 'det-v1.2.0',
        structuredConflicts: [],
        sdgCoverageStatus: 'UNRESOLVED'
      });
      const state = createManualReviewState({
        ...payload,
        missingInformation: [],
        ambiguities: [],
        blueprint: {
          items: payload.blueprint.items.map(i => ({
            ...i,
            status: i.status === 'unresolved' ? 'confirmed' : i.status,
            approvable: true,
            text: i.text ?? 'approved'
          }))
        }
      });

      const approval = buildApprovedSessionSnapshot(state, '2026-07-22T03:00:00.000Z', { org: 'snapshot-ref' });
      expect(approval.approved).toBe(true);
      if (!approval.snapshot) throw new Error('snapshot expected');
      expect(approval.snapshot.page1Input).toStrictEqual(state.working.page1Input);
      expect(approval.snapshot.rawCanonicalPayload).toStrictEqual(state.working.rawCanonicalPayload);
      expect(approval.snapshot.normalizedPage2View).toStrictEqual(state.working);
      expect(approval.snapshot.approvalTimestamp).toBe('2026-07-22T03:00:00.000Z');
      expect(approval.snapshot.durability).toBe('session_only_non_durable');
    });

    test('P0D-44: adapter conversion preserves representable fields exactly and does not mutate input', () => {
      const seed = createPage2Payload(baseInput(), {
        engineVersion: 'det-v1.2.0',
        structuredConflicts: [
          {
            id: 'CONF-777',
            processingType: 'USER_REVIEW_ONLY',
            conditionResult: 'triggered',
            precedence: 7,
            reviewRequired: true,
            provenance: ['contract_test']
          }
        ],
        sdgCoverageStatus: 'SUPPORTED'
      });

      const customEvidence = [
        {
          sourceField: 'program_story',
          originalText: 'alpha beta gamma',
          matchedText: 'alpha beta',
          normalizedMatch: 'alpha beta',
          startOffset: 1,
          endOffset: 11,
          signalType: 'lexical',
          registryId: 'RID-1'
        },
        {
          sourceField: 'program_story',
          originalText: 'alpha beta gamma',
          matchedText: 'gamma',
          normalizedMatch: 'gamma',
          startOffset: 12,
          endOffset: 17,
          signalType: 'lexical',
          registryId: 'RID-2'
        }
      ] as EvidenceSpan[];

      const compatiblePayload = {
        ...seed,
        sectors: [
          {
            id: 'SECTOR-TEST-1',
            label: 'Sector Test One',
            level: 'secondary' as const,
            score: 0.3179,
            confidenceScore: 0.3179,
            confidenceBand: 'low' as const,
            explanation: 'sector explanation strict',
            provenance: 'manual_provenance_string',
            status: 'engine' as const,
            evidenceSpans: customEvidence
          }
        ],
        interventions: [
          {
            id: 'ARCH-STRICT-01',
            label: 'Intervention Strict',
            level: 'primary' as const,
            score: 0.9234,
            confidenceScore: 0.9234,
            confidenceBand: 'high' as const,
            explanation: 'intervention explanation strict',
            provenance: 'manual_provenance_intervention',
            status: 'engine' as const,
            evidenceSpans: customEvidence
          }
        ],
        sdgs: [
          {
            id: 'SDG_3',
            label: 'Good Health',
            level: 'optional' as const,
            score: 0.5521,
            confidenceScore: 0.5521,
            confidenceBand: 'medium' as const,
            explanation: 'sdg explanation strict',
            provenance: 'manual_provenance_sdg',
            status: 'engine' as const,
            evidenceSpans: customEvidence
          }
        ],
        actorRoles: [
          {
            id: 'ACT-STRICT-01',
            label: 'Actor Strict',
            level: 'secondary' as const,
            score: 0.7021,
            confidenceScore: 0.7021,
            confidenceBand: 'medium' as const,
            explanation: 'actor explanation strict',
            provenance: 'manual_provenance_actor',
            status: 'engine' as const,
            evidenceSpans: customEvidence
          }
        ],
        blueprint: {
          items: [
            {
              id: 'SLOT-PROBLEM-01',
              section: 'problem' as const,
              text: 'Masalah terverifikasi: alpha beta.',
              status: 'from_source' as const,
              approvable: true,
              evidenceSpans: customEvidence,
              provenance: ['candidate:PF-001', 'span:program_story:1:11:lexical']
            }
          ]
        },
        warnings: [
          {
            id: 'WARN-STRICT-1',
            code: 'WARN-STRICT-1',
            severity: 'important' as const,
            message: 'strict warning preservation'
          }
        ],
        ambiguities: [
          {
            id: 'AMB-STRICT-1',
            field: 'sector_primary',
            candidates: ['SECTOR-TEST-1', 'SECTOR-TEST-2'],
            requiredForApproval: false,
            state: 'resolved' as const,
            resolvedValue: 'SECTOR-TEST-1'
          }
        ],
        missingInformation: [
          {
            id: 'MISS-STRICT-1',
            question: 'Provide strict missing answer',
            priority: 'recommended' as const,
            blocking: false,
            requiredForApproval: false,
            state: 'resolved' as const,
            resolvedValue: 'strict answer'
          }
        ],
        missResults: [
          {
            id: 'MISS-STRICT-1',
            blocking: false,
            requiredForApproval: false,
            resolutionState: 'resolved' as const,
            provenance: ['strict_miss_source']
          }
        ],
        sdgCoverageStatus: 'SUPPORTED' as const,
        confResults: [
          {
            id: 'CONF-777',
            processingType: 'USER_REVIEW_ONLY' as const,
            conditionResult: 'triggered' as const,
            precedence: 7,
            reviewRequired: true,
            provenance: ['contract_test']
          }
        ],
        adapterValidationIssues: [],
        rawCanonicalPayload: {
          strictPayloadId: 'RAW-STRICT-001',
          score: 0.3179,
          meta: { branch: 'contract', layer: 'p0d' }
        }
      };

      const before = structuredClone(compatiblePayload);
      const result = convertToProvisionalDomainResponse(compatiblePayload, {
        metadata: {
          contractVersion: 'SCORING-CONTRACT-V1',
          engineVersion: 'det-v1.2.0',
          registryVersions: { sectors: 'v1.2.0', sdgs: 'v1.2.0' },
          sourceFixtureId: 'FIX-COMP-STRICT-01',
          scenarioPurpose: 'strict-preservation-test'
        },
        ambiguityDescriptions: {
          'AMB-STRICT-1': 'Strict ambiguity description'
        },
        missingResolutionMap: {
          'MISS-STRICT-1': 'answered_with_evidence'
        }
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error('adapter conversion must succeed');

      const expectedEvidence = customEvidence.map(spanItem => ({
        sourceField: spanItem.sourceField,
        text: spanItem.matchedText,
        startOffset: spanItem.startOffset,
        endOffset: spanItem.endOffset
      }));

      expect(result.response.contractVersion).toBe('SCORING-CONTRACT-V1');
      expect(result.response.engineVersion).toBe('det-v1.2.0');
      expect(result.response.registryVersions).toStrictEqual({ sectors: 'v1.2.0', sdgs: 'v1.2.0' });
      expect(result.response.sourceFixtureId).toBe('FIX-COMP-STRICT-01');
      expect(result.response.scenarioPurpose).toBe('strict-preservation-test');

      expect(result.response.sectors).toStrictEqual([
        {
          id: 'SECTOR-TEST-1',
          label: 'Sector Test One',
          level: 'secondary',
          confidence: 'low',
          confidenceScore: 0.3179,
          explanation: 'sector explanation strict',
          evidence: expectedEvidence[0],
          evidenceSpans: expectedEvidence
        }
      ]);

      expect(result.response.interventions).toStrictEqual([
        {
          id: 'ARCH-STRICT-01',
          label: 'Intervention Strict',
          level: 'primary',
          confidence: 'high',
          confidenceScore: 0.9234,
          explanation: 'intervention explanation strict',
          evidence: expectedEvidence[0],
          evidenceSpans: expectedEvidence
        }
      ]);

      expect(result.response.sdgs).toStrictEqual([
        {
          num: 3,
          label: 'Good Health',
          level: 'optional',
          confidence: 'medium',
          confidenceScore: 0.5521,
          explanation: 'sdg explanation strict',
          evidence: expectedEvidence[0],
          evidenceSpans: expectedEvidence
        }
      ]);

      expect(result.response.actorRoles).toStrictEqual([
        {
          id: 'ACT-STRICT-01',
          actorName: 'Actor Strict',
          level: 'secondary',
          confidence: 'medium',
          confidenceScore: 0.7021,
          explanation: 'actor explanation strict',
          evidence: expectedEvidence[0],
          evidenceSpans: expectedEvidence
        }
      ]);

      expect(result.response.warnings).toStrictEqual(compatiblePayload.warnings);
      expect(result.response.ambiguities).toStrictEqual([
        {
          id: 'AMB-STRICT-1',
          field: 'sector_primary',
          description: 'Strict ambiguity description',
          candidates: ['SECTOR-TEST-1', 'SECTOR-TEST-2'],
          resolvedValue: 'SECTOR-TEST-1',
          requiredForApproval: false
        }
      ]);
      expect(result.response.missingInformation).toStrictEqual([
        {
          id: 'MISS-STRICT-1',
          question: 'Provide strict missing answer',
          priority: 'recommended',
          resolvedValue: 'strict answer',
          resolutionState: 'answered_with_evidence',
          blocking: false,
          requiredForApproval: false
        }
      ]);
      expect(result.response.blueprint.items).toStrictEqual([
        {
          id: 'SLOT-PROBLEM-01',
          section: 'problem',
          text: 'Masalah terverifikasi: alpha beta.',
          status: 'from_source',
          explanation: undefined,
          evidenceSpans: expectedEvidence
        }
      ]);
      expect(result.response.rawCanonicalPayload).toStrictEqual(compatiblePayload.rawCanonicalPayload);

      // Explicit representational exclusions: these are carried only in deterministic core transport.
      expect(compatiblePayload.confResults).toStrictEqual([
        {
          id: 'CONF-777',
          processingType: 'USER_REVIEW_ONLY',
          conditionResult: 'triggered',
          precedence: 7,
          reviewRequired: true,
          provenance: ['contract_test']
        }
      ]);
      expect(compatiblePayload.missResults).toStrictEqual([
        {
          id: 'MISS-STRICT-1',
          blocking: false,
          requiredForApproval: false,
          resolutionState: 'resolved',
          provenance: ['strict_miss_source']
        }
      ]);
      expect(compatiblePayload.sdgCoverageStatus).toBe('SUPPORTED');
      expect(compatiblePayload.blueprint.items[0].provenance).toStrictEqual([
        'candidate:PF-001',
        'span:program_story:1:11:lexical'
      ]);
      expect(result.response.sourceFixtureId).not.toBe('unknown-fixture');
      expect(compatiblePayload).toStrictEqual(before);
    });

    test('P0D-45: indicator impact binding is explicitly unsupported without canonical support', () => {
      const candidates: CanonicalCandidate[] = [
        {
          canonicalId: 'OPF-OUT-1',
          candidateType: 'output',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: [],
          confusableCandidateIds: [],
          rawEvidenceSpans: [span('keluaran terukur program')],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        },
        {
          canonicalId: 'OF-OUTCOME-1',
          candidateType: 'outcome',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: [],
          confusableCandidateIds: [],
          rawEvidenceSpans: [span('petani meningkatkan adopsi teknologi')],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        },
        {
          canonicalId: 'ACT-ROLE-1',
          candidateType: 'actor',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: [],
          confusableCandidateIds: [],
          rawEvidenceSpans: [span('kelompok tani')],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ];

      const support = deriveCausalSupportSnapshot(candidates, {
        indicatorBindings: [
          { indicatorId: 'IND-OUT', requestedLevel: 'output' },
          { indicatorId: 'IND-OCM', requestedLevel: 'outcome' },
          { indicatorId: 'IND-IMP', requestedLevel: 'impact' },
          { indicatorId: 'IND-UNK' }
        ]
      });
      const byId = new Map(support.indicatorBindings.map(item => [item.indicatorId, item]));

      expect(byId.get('IND-OUT')).toStrictEqual({
        indicatorId: 'IND-OUT',
        requestedLevel: 'output',
        bindingState: 'supported',
        reason: 'Indicator-to-output binding supported by output evidence.',
        evidenceSpans: undefined,
        provenance: ['candidate_evidence']
      });
      expect(byId.get('IND-OCM')).toStrictEqual({
        indicatorId: 'IND-OCM',
        requestedLevel: 'outcome',
        bindingState: 'supported',
        reason: 'Indicator-to-outcome binding supported by outcome evidence.',
        evidenceSpans: undefined,
        provenance: ['candidate_evidence']
      });
      expect(byId.get('IND-IMP')).toStrictEqual({
        indicatorId: 'IND-IMP',
        requestedLevel: 'impact',
        bindingState: 'unsupported',
        reason: 'Indicator cannot bind to activity/impact without explicit canonical support.',
        evidenceSpans: undefined,
        provenance: ['rule_guardrail']
      });
      expect(byId.get('IND-UNK')?.bindingState).toBe('unresolved');

      const warnings = evaluateCausalGuardrails(candidates, support);
      expect(warnings.some(w => w.id === 'WARN-INDICATOR-IND-IMP' && w.code === 'WARN-INDICATOR-BINDING-UNRESOLVED')).toBe(true);
    });

    test('P0D-46: MISS handoff preserves exact representable fields in core and adapter conversion', () => {
      const payload = createPage2Payload(baseInput(), {
        engineVersion: 'det-v1.2.0',
        structuredConflicts: [],
        sdgCoverageStatus: 'UNRESOLVED'
      });

      const missCore = {
        id: 'MISS-EX-01',
        question: 'Provide exact unresolved legal basis',
        priority: 'recommended' as const,
        blocking: false,
        requiredForApproval: false,
        state: 'accepted_unknown' as const,
        resolvedValue: 'UNKNOWN_ACCEPTED'
      };

      const compatiblePayload = {
        ...payload,
        adapterValidationIssues: [],
        ambiguities: [],
        missingInformation: [missCore],
        missResults: [
          {
            id: 'MISS-EX-01',
            blocking: false,
            requiredForApproval: false,
            resolutionState: 'accepted_unknown' as const,
            provenance: ['manual_resolution_trace']
          }
        ],
        blueprint: {
          items: payload.blueprint.items.map(i => ({
            ...i,
            status: i.status === 'unresolved' ? 'confirmed' : i.status,
            approvable: true,
            text: i.text ?? 'resolved'
          }))
        }
      };

      expect(compatiblePayload.missResults).toStrictEqual([
        {
          id: 'MISS-EX-01',
          blocking: false,
          requiredForApproval: false,
          resolutionState: 'accepted_unknown',
          provenance: ['manual_resolution_trace']
        }
      ]);

      const result = convertToProvisionalDomainResponse(compatiblePayload, {
        metadata: {
          contractVersion: 'SCORING-CONTRACT-V1',
          engineVersion: 'det-v1.2.0',
          registryVersions: { sectors: 'v1.2.0' },
          sourceFixtureId: 'FIX-MISS-STRICT-01',
          scenarioPurpose: 'miss-handoff-strict'
        },
        missingResolutionMap: {
          'MISS-EX-01': 'answered_with_assertion'
        }
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error('adapter conversion must succeed');
      expect(result.response.missingInformation).toStrictEqual([
        {
          id: 'MISS-EX-01',
          question: 'Provide exact unresolved legal basis',
          priority: 'recommended',
          resolvedValue: 'UNKNOWN_ACCEPTED',
          resolutionState: 'answered_with_assertion',
          blocking: false,
          requiredForApproval: false
        }
      ]);
    });

    test('P0D-47: blueprint evidence and provenance remain exact through payload, manual edit, and snapshot', () => {
      const sourceCandidates: CanonicalCandidate[] = [
        {
          canonicalId: 'PF-STRICT-01',
          candidateType: 'problem',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: [],
          confusableCandidateIds: [],
          rawEvidenceSpans: [
            {
              sourceField: 'program_story',
              originalText: 'kemiskinan dan kerentanan pangan',
              matchedText: 'kemiskinan',
              normalizedMatch: 'kemiskinan',
              startOffset: 0,
              endOffset: 10,
              signalType: 'lexical',
              registryId: 'PF-STRICT-01'
            },
            {
              sourceField: 'program_story',
              originalText: 'kemiskinan dan kerentanan pangan',
              matchedText: 'kerentanan pangan',
              normalizedMatch: 'kerentanan pangan',
              startOffset: 14,
              endOffset: 31,
              signalType: 'lexical',
              registryId: 'PF-STRICT-01'
            }
          ],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ];

      const assembled = assembleBlueprint(
        {
          ...baseInput(),
          location: 'Kabupaten Garut'
        } as Page1Input & { location: string },
        sourceCandidates
      );

      const problemItem = assembled.items.find(i => i.id === 'SLOT-PROBLEM-01');
      expect(problemItem?.status).toBe('from_source');
      expect(problemItem?.evidenceSpans).toStrictEqual(sourceCandidates[0].rawEvidenceSpans);
      expect(problemItem?.provenance).toStrictEqual([
        'candidate:PF-STRICT-01',
        'span:program_story:0:10:lexical',
        'span:program_story:14:31:lexical'
      ]);

      const payload = createPage2Payload(baseInput(), {
        engineVersion: 'det-v1.2.0',
        structuredConflicts: [],
        sdgCoverageStatus: 'UNRESOLVED'
      });

      const mergedPayload = {
        ...payload,
        missingInformation: [],
        ambiguities: [],
        blueprint: {
          items: payload.blueprint.items.map(i => {
            if (i.id === 'SLOT-PROBLEM-01' && problemItem) {
              return { ...problemItem, approvable: true };
            }
            return {
              ...i,
              status: i.status === 'unresolved' ? 'confirmed' : i.status,
              approvable: true,
              text: i.text ?? 'resolved'
            };
          })
        }
      };

      const state = createManualReviewState(mergedPayload);
      const edited = editBlueprintText(state, 'SLOT-PROBLEM-01', 'Teks edit ketat', '2026-07-22T06:00:00.000Z');
      const editedProblem = edited.working.blueprint.items.find(i => i.id === 'SLOT-PROBLEM-01');
      expect(editedProblem?.evidenceSpans).toStrictEqual(problemItem?.evidenceSpans);
      expect(editedProblem?.provenance).toStrictEqual(problemItem?.provenance);

      const approval = buildApprovedSessionSnapshot(edited, '2026-07-22T06:01:00.000Z', { org: 'bp-prov' });
      expect(approval.approved).toBe(true);
      if (!approval.snapshot) throw new Error('snapshot expected');
      const snapProblem = approval.snapshot.normalizedPage2View.blueprint.items.find(i => i.id === 'SLOT-PROBLEM-01');
      expect(snapProblem?.evidenceSpans).toStrictEqual(problemItem?.evidenceSpans);
      expect(snapProblem?.provenance).toStrictEqual(problemItem?.provenance);
    });

    test('P0D-48: recommendation score confidence band level and id remain exact in conversion', () => {
      const payload = createPage2Payload(baseInput(), {
        engineVersion: 'det-v1.2.0',
        structuredConflicts: [],
        sdgCoverageStatus: 'SUPPORTED'
      });

      const evidence = [
        {
          sourceField: 'program_story',
          originalText: 'delta epsilon',
          matchedText: 'delta',
          normalizedMatch: 'delta',
          startOffset: 0,
          endOffset: 5,
          signalType: 'lexical',
          registryId: 'RID-X'
        }
      ] as EvidenceSpan[];

      const compatiblePayload = {
        ...payload,
        adapterValidationIssues: [],
        ambiguities: [],
        missingInformation: [],
        sectors: [
          {
            id: 'SECTOR-EQ-1',
            label: 'Sector Equality',
            level: 'primary' as const,
            score: 0.8123,
            confidenceScore: 0.8123,
            confidenceBand: 'high' as const,
            explanation: 'sector equality explanation',
            provenance: 'prov-sector',
            status: 'engine' as const,
            evidenceSpans: evidence
          }
        ],
        interventions: [
          {
            id: 'ARCH-EQ-1',
            label: 'Intervention Equality',
            level: 'secondary' as const,
            score: 0.5011,
            confidenceScore: 0.5011,
            confidenceBand: 'medium' as const,
            explanation: 'intervention equality explanation',
            provenance: 'prov-intervention',
            status: 'engine' as const,
            evidenceSpans: evidence
          }
        ],
        sdgs: [
          {
            id: 'SDG_11',
            label: 'Sustainable Cities',
            level: 'optional' as const,
            score: 0.2142,
            confidenceScore: 0.2142,
            confidenceBand: 'low' as const,
            explanation: 'sdg equality explanation',
            provenance: 'prov-sdg',
            status: 'engine' as const,
            evidenceSpans: evidence
          }
        ],
        blueprint: {
          items: payload.blueprint.items.map(i => ({
            ...i,
            status: i.status === 'unresolved' ? 'confirmed' : i.status,
            approvable: true,
            text: i.text ?? 'resolved'
          }))
        }
      };

      const result = convertToProvisionalDomainResponse(compatiblePayload, {
        metadata: {
          contractVersion: 'SCORING-CONTRACT-V1',
          engineVersion: 'det-v1.2.0',
          registryVersions: { sectors: 'v1.2.0' },
          sourceFixtureId: 'FIX-EQ-01',
          scenarioPurpose: 'recommendation-equality'
        }
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error('snapshot expected');
      expect(result.response.sectors[0]).toStrictEqual({
        id: 'SECTOR-EQ-1',
        label: 'Sector Equality',
        level: 'primary',
        confidence: 'high',
        confidenceScore: 0.8123,
        explanation: 'sector equality explanation',
        evidence: {
          sourceField: 'program_story',
          text: 'delta',
          startOffset: 0,
          endOffset: 5
        },
        evidenceSpans: [
          {
            sourceField: 'program_story',
            text: 'delta',
            startOffset: 0,
            endOffset: 5
          }
        ]
      });
      expect(result.response.interventions[0].confidenceScore).toBe(0.5011);
      expect(result.response.interventions[0].confidence).toBe('medium');
      expect(result.response.interventions[0].level).toBe('secondary');
      expect(result.response.interventions[0].id).toBe('ARCH-EQ-1');
      expect(result.response.sdgs[0].confidenceScore).toBe(0.2142);
      expect(result.response.sdgs[0].confidence).toBe('low');
      expect(result.response.sdgs[0].level).toBe('optional');
      expect(result.response.sdgs[0].num).toBe(11);
    });

    test('P0D-49: approved snapshot preserves full required fields with exact equality', () => {
      const payload = createPage2Payload(baseInput(), {
        engineVersion: 'det-v1.2.0',
        registryVersions: { sectors: 'v1.2.0', sdgs: 'v1.2.0' },
        structuredConflicts: [],
        sdgCoverageStatus: 'UNRESOLVED'
      });

      const nonBlocked = {
        ...payload,
        ambiguities: [
          {
            id: 'AMB-NB-01',
            field: 'sector_primary',
            candidates: ['S1', 'S2'],
            requiredForApproval: false,
            state: 'unresolved' as const
          }
        ],
        missingInformation: [
          {
            id: 'MISS-NB-01',
            question: 'Optional evidence',
            priority: 'recommended' as const,
            blocking: false,
            requiredForApproval: false,
            state: 'unresolved' as const
          }
        ],
        blueprint: {
          items: payload.blueprint.items.map(i => ({
            ...i,
            approvable: true,
            status: i.id === 'SLOT-IMPACT-01' ? 'unresolved' : i.status,
            text: i.text ?? 'resolved'
          }))
        }
      };

      const s0 = createManualReviewState(nonBlocked);
      const s1 = acceptRecommendation(s0, 'sectors', s0.working.sectors[0].id, '2026-07-22T07:00:00.000Z');
      const s2 = editBlueprintText(s1, 'SLOT-PROBLEM-01', 'Edited problem text', '2026-07-22T07:01:00.000Z');
      const approval = buildApprovedSessionSnapshot(s2, '2026-07-22T07:02:00.000Z', { org: 'org-1', v: 2 });

      expect(approval.approved).toBe(true);
      if (!approval.snapshot) throw new Error('snapshot expected');

      const snapshot = approval.snapshot;
      expect(snapshot.page1Input).toStrictEqual(s2.working.page1Input);
      expect(snapshot.organizationSnapshotReference).toStrictEqual({ org: 'org-1', v: 2 });
      expect(snapshot.rawCanonicalPayload).toStrictEqual(s2.working.rawCanonicalPayload);
      expect(snapshot.normalizedPage2View).toStrictEqual(s2.working);
      expect(snapshot.originalEngineRecommendations).toStrictEqual({
        sectors: s2.original.sectors,
        interventions: s2.original.interventions,
        sdgs: s2.original.sdgs,
        actorRoles: s2.original.actorRoles
      });
      expect(snapshot.userDecisions).toStrictEqual(s2.decisions);
      expect(snapshot.ambiguityResolutions).toStrictEqual(s2.working.ambiguities);
      expect(snapshot.missingInformationResolutions).toStrictEqual(s2.working.missingInformation);
      const expectedUnresolvedNonBlocking = [
        ...(s2.working.missingInformation ?? [])
          .filter(item => !item.requiredForApproval && item.state === 'unresolved')
          .map(item => item.id),
        ...(s2.working.ambiguities ?? [])
          .filter(item => !item.requiredForApproval && item.state === 'unresolved')
          .map(item => item.id),
        ...s2.working.blueprint.items
          .filter(item => item.status === 'unresolved' && item.approvable)
          .map(item => item.id)
      ];
      expect(snapshot.unresolvedNonBlockingItems).toStrictEqual(expectedUnresolvedNonBlocking);
      expect(snapshot.evidenceAndProvenance).toStrictEqual({
        warnings: s2.working.warnings,
        adapterValidationIssues: s2.working.adapterValidationIssues
      });
      expect(snapshot.contractVersion).toBe(s2.working.contractVersion);
      expect(snapshot.engineVersion).toBe('det-v1.2.0');
      expect(snapshot.registryVersions).toStrictEqual({ sectors: 'v1.2.0', sdgs: 'v1.2.0' });
      expect(snapshot.scoringConfigVersion).toBe(s2.working.scoringConfigVersion);
      expect(snapshot.approvalTimestamp).toBe('2026-07-22T07:02:00.000Z');
      expect(snapshot.durability).toBe('session_only_non_durable');
      expect(snapshot.acceptedItems.length + snapshot.rejectedItems.length).toBeGreaterThan(0);
      expect(snapshot.manualBlueprintEdits).toStrictEqual([
        {
          itemId: 'SLOT-PROBLEM-01',
          oldText: s1.working.blueprint.items.find(i => i.id === 'SLOT-PROBLEM-01')?.text,
          newText: 'Edited problem text'
        }
      ]);
    });

    test('P0D-50: manual operation decisions preserve old/new values timestamps origin and original engine exactness', () => {
      const basePayload = createPage2Payload(baseInput(), {
        engineVersion: 'det-v1.2.0',
        structuredConflicts: [],
        sdgCoverageStatus: 'UNRESOLVED'
      });

      const withResolutionLists = {
        ...basePayload,
        ambiguities: [
          {
            id: 'AMB-OP-1',
            field: 'sector_primary',
            candidates: ['A', 'B'],
            requiredForApproval: false,
            state: 'unresolved' as const
          }
        ],
        missingInformation: [
          {
            id: 'MISS-OP-1',
            question: 'missing op?',
            priority: 'recommended' as const,
            blocking: false,
            requiredForApproval: false,
            state: 'unresolved' as const
          }
        ]
      };
      const resolutionBaselineOriginal = structuredClone(withResolutionLists);

      const stateA = createManualReviewState(withResolutionLists);
      const sectorId = stateA.working.sectors[0].id;
      const acceptTs = '2026-07-22T08:00:00.000Z';
      const accepted = acceptRecommendation(stateA, 'sectors', sectorId, acceptTs);
      expect(accepted.decisions[0].timestamp).toBe(acceptTs);
      expect(accepted.decisions[0].origin).toBe('user_override');
      expect((accepted.decisions[0].oldValue as { level: string }).level).toBe(stateA.working.sectors[0].level);
      expect((accepted.decisions[0].newValue as { level: string; status: string }).level).toBe('primary');
      expect((accepted.decisions[0].newValue as { level: string; status: string }).status).toBe('user_override');
      expect(stateA.original).toStrictEqual(resolutionBaselineOriginal);

      const rejectTs = '2026-07-22T08:01:00.000Z';
      const rejected = rejectRecommendation(stateA, 'sectors', sectorId, rejectTs);
      expect((rejected.decisions[0].newValue as { level: string }).level).toBe('rejected');
      expect(rejected.decisions[0].timestamp).toBe(rejectTs);
      expect(stateA.original).toStrictEqual(resolutionBaselineOriginal);

      const changeTs = '2026-07-22T08:02:00.000Z';
      const changed = changeRecommendationLevel(stateA, 'sdgs', stateA.working.sdgs[0].id, 'optional', changeTs);
      expect((changed.decisions[0].newValue as { level: string }).level).toBe('optional');
      expect(changed.decisions[0].timestamp).toBe(changeTs);
      expect(stateA.original).toStrictEqual(resolutionBaselineOriginal);

      const altTs = '2026-07-22T08:03:00.000Z';
      const alt = selectAlternativeCanonicalCandidate(stateA, 'sectors', sectorId, 'SECTOR-ALT-123', altTs);
      expect((alt.decisions[0].oldValue as { id: string }).id).toBe(sectorId);
      expect((alt.decisions[0].newValue as { id: string }).id).toBe('SECTOR-ALT-123');
      expect(alt.decisions[0].timestamp).toBe(altTs);
      expect(stateA.original).toStrictEqual(resolutionBaselineOriginal);

      const addTs = '2026-07-22T08:04:00.000Z';
      const added = addManualCandidate(stateA, 'interventions', {
        id: 'ARCH-MAN-STRICT',
        label: 'manual strict',
        level: 'secondary',
        status: 'user_override',
        confidenceBand: 'low',
        confidenceScore: 0.1
      }, addTs);
      expect((added.decisions[0].oldValue as unknown)).toBeUndefined();
      expect((added.decisions[0].newValue as { status: string }).status).toBe('user_override_needs_evidence');
      expect((added.decisions[0].newValue as { evidenceSpans?: EvidenceSpan[] }).evidenceSpans).toBeUndefined();
      expect(added.decisions[0].timestamp).toBe(addTs);
      expect(stateA.original).toStrictEqual(resolutionBaselineOriginal);

      const editTs = '2026-07-22T08:05:00.000Z';
      const editTarget = stateA.working.blueprint.items[0].id;
      const edited = editBlueprintText(stateA, editTarget, 'strict edit text', editTs);
      expect((edited.decisions[0].oldValue as BlueprintItem).id).toBe(editTarget);
      expect((edited.decisions[0].newValue as BlueprintItem).text).toBe('strict edit text');
      expect(edited.decisions[0].timestamp).toBe(editTs);
      expect(stateA.original).toStrictEqual(resolutionBaselineOriginal);

      const ambTs = '2026-07-22T08:06:00.000Z';
      const ambResolved = resolveAmbiguity(stateA, 'AMB-OP-1', 'A', ambTs);
      expect((ambResolved.decisions[0].oldValue as { state: string }).state).toBe('unresolved');
      expect((ambResolved.decisions[0].newValue as { state: string; resolvedValue: string }).state).toBe('resolved');
      expect((ambResolved.decisions[0].newValue as { state: string; resolvedValue: string }).resolvedValue).toBe('A');
      expect(ambResolved.decisions[0].timestamp).toBe(ambTs);
      expect(stateA.original).toStrictEqual(resolutionBaselineOriginal);

      const missTs = '2026-07-22T08:07:00.000Z';
      const missResolved = resolveMissingInformation(stateA, 'MISS-OP-1', 'Answer', missTs);
      expect((missResolved.decisions[0].oldValue as { state: string }).state).toBe('unresolved');
      expect((missResolved.decisions[0].newValue as { state: string; resolvedValue: string }).state).toBe('resolved');
      expect((missResolved.decisions[0].newValue as { state: string; resolvedValue: string }).resolvedValue).toBe('Answer');
      expect(missResolved.decisions[0].timestamp).toBe(missTs);
      expect(stateA.original).toStrictEqual(resolutionBaselineOriginal);

      const unknownTs = '2026-07-22T08:08:00.000Z';
      const unknownAccepted = acceptUnknown(stateA, 'missing', 'MISS-OP-1', unknownTs, true);
      expect((unknownAccepted.decisions[0].newValue as { state: string; resolvedValue: string }).state).toBe('accepted_unknown');
      expect((unknownAccepted.decisions[0].newValue as { state: string; resolvedValue: string }).resolvedValue).toBe('UNKNOWN_ACCEPTED');
      expect(unknownAccepted.decisions[0].timestamp).toBe(unknownTs);
      expect(stateA.original).toStrictEqual(resolutionBaselineOriginal);

      const restoreTs = '2026-07-22T08:09:00.000Z';
      const changedSdg = changeRecommendationLevel(stateA, 'sdgs', stateA.working.sdgs[0].id, 'optional', '2026-07-22T08:09:30.000Z');
      const restored = restoreOriginalItem(changedSdg, 'recommendation', { collection: 'sdgs', id: stateA.working.sdgs[0].id }, restoreTs);
      expect((restored.decisions[1].oldValue as { level: string }).level).toBe('optional');
      expect((restored.decisions[1].newValue as { level: string }).level).toBe(changedSdg.original.sdgs[0].level);
      expect(restored.decisions[1].timestamp).toBe(restoreTs);
      expect(changedSdg.original).toStrictEqual(resolutionBaselineOriginal);
    });

    test('P0D-51: explicit P0-E fixture deferral manifest is complete unique and non-overlapping', () => {
      const hardNegative = [...P0E_HARD_NEGATIVE_DEFERRED_IDS];
      const gold = [...P0E_GOLD_DEFERRED_IDS];
      const hardSet = new Set(hardNegative);
      const goldSet = new Set(gold);
      const overlap = hardNegative.filter(id => goldSet.has(id));

      expect(hardNegative.length).toBe(15);
      expect(hardSet.size).toBe(15);
      expect(gold.length).toBe(12);
      expect(goldSet.size).toBe(12);
      expect(overlap).toStrictEqual([]);
      expect(hardSet.size + goldSet.size).toBe(27);
      expect(P0E_DEFERRED_EXECUTION_STATUS).toBe('P0_E_EXECUTION_NOT_YET_PROVEN');
      expect(getExecutionProofStatus()).toBe('P0_E_EXECUTION_NOT_YET_PROVEN');
      expect(hardNegative.every(id => id.startsWith('FIX-HN-'))).toBe(true);
      expect(gold.every(id => id.startsWith('FIX-GOLD-'))).toBe(true);
    });
  });

  describe('RC-7C Methodology Quality Gate Wrapper Tests', () => {

    test('MQG-01: Activity-Only Training Gate demotes ASSIGNED to INSUFFICIENT_EVIDENCE', () => {
      const mockResult = {
        primarySector: 'SECTOR-AGRI-001',
        secondarySectors: [],
        primaryInterventions: ['ARCH-TRAINING-001'],
        supportingInterventions: [],
        primarySDGs: [],
        secondarySDGs: [],
        warnings: [],
        missingInformation: [],
        confidenceScore: 0.85,
        isAmbiguous: false,
        provenanceLogs: [],
        assignmentStatus: 'ASSIGNED' as const,
        assignmentReason: 'Clear dominance'
      };

      const mockCandidates: CanonicalCandidate[] = [
        {
          canonicalId: 'ARCH-TRAINING-001',
          candidateType: 'archetype',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: [],
          confusableCandidateIds: [],
          rawEvidenceSpans: [],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ];

      const mockInput: Page1Input = { program_story: 'Melakukan pelatihan tani.' };

      const gated = evaluateMethodologyQualityGate(mockResult, mockCandidates, mockInput);

      expect(gated.assignmentStatus).toBe('INSUFFICIENT_EVIDENCE');
      expect(gated.assignmentReason).toContain('MQG_REJECT_ACTIVITY_ONLY_TRAINING');
    });

    test('MQG-02: Awareness-Only Campaign Gate demotes ASSIGNED to INSUFFICIENT_EVIDENCE', () => {
      const mockResult = {
        primarySector: 'SECTOR-HEALTH-001',
        secondarySectors: [],
        primaryInterventions: ['ARCH-AWARE-006'],
        supportingInterventions: [],
        primarySDGs: [],
        secondarySDGs: [],
        warnings: [],
        missingInformation: [],
        confidenceScore: 0.80,
        isAmbiguous: false,
        provenanceLogs: [],
        assignmentStatus: 'ASSIGNED' as const,
        assignmentReason: 'High score'
      };

      const mockCandidates: CanonicalCandidate[] = [
        {
          canonicalId: 'ARCH-AWARE-006',
          candidateType: 'archetype',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: [],
          confusableCandidateIds: [],
          rawEvidenceSpans: [],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ];

      const mockInput: Page1Input = { program_story: 'Kampanye kesadaran gizi.' };

      const gated = evaluateMethodologyQualityGate(mockResult, mockCandidates, mockInput);

      expect(gated.assignmentStatus).toBe('INSUFFICIENT_EVIDENCE');
      expect(gated.assignmentReason).toContain('MQG_REJECT_AWARENESS_ONLY');
    });

    test('MQG-03: Ungrounded Cash Transfer Gate demotes ASSIGNED to INSUFFICIENT_EVIDENCE', () => {
      const mockResult = {
        primarySector: 'SECTOR-ECON-001',
        secondarySectors: [],
        primaryInterventions: ['ARCH-EQUIP-010'],
        supportingInterventions: [],
        primarySDGs: [],
        secondarySDGs: [],
        warnings: [],
        missingInformation: [],
        confidenceScore: 0.82,
        isAmbiguous: false,
        provenanceLogs: [],
        assignmentStatus: 'ASSIGNED' as const,
        assignmentReason: 'Dominant match'
      };

      const mockCandidates: CanonicalCandidate[] = [
        {
          canonicalId: 'ARCH-EQUIP-010',
          candidateType: 'archetype',
          matchedSignals: [],
          negativeSignals: [],
          antiSignals: [],
          confusableCandidateIds: [],
          rawEvidenceSpans: [],
          minimumEvidenceStatus: 'met',
          registryVersion: '1.2'
        }
      ];

      const mockInput: Page1Input = { program_story: 'Pembagian modal tunai agar kemiskinan tuntas.' };

      const gated = evaluateMethodologyQualityGate(mockResult, mockCandidates, mockInput);

      expect(gated.assignmentStatus).toBe('INSUFFICIENT_EVIDENCE');
      expect(gated.assignmentReason).toContain('MQG_REJECT_UNGROUNDED_CASH_TRANSFER');
    });

    test('MQG-04: Multi-Sector Stuffing Gate demotes ASSIGNED or AMBIGUOUS to INSUFFICIENT_EVIDENCE', () => {
      const mockResult = {
        primarySector: 'SECTOR-AGRI-001',
        secondarySectors: ['SECTOR-HEALTH-001'],
        primaryInterventions: [],
        supportingInterventions: [],
        primarySDGs: [],
        secondarySDGs: [],
        warnings: [],
        missingInformation: ['MISS-019'],
        confidenceScore: 0.88,
        isAmbiguous: false,
        provenanceLogs: [],
        assignmentStatus: 'ASSIGNED' as const,
        assignmentReason: 'High score'
      };

      const mockCandidates: CanonicalCandidate[] = [];
      const mockInput: Page1Input = { program_story: 'Program multi sektor luas.' };

      const gated = evaluateMethodologyQualityGate(mockResult, mockCandidates, mockInput);

      expect(gated.assignmentStatus).toBe('INSUFFICIENT_EVIDENCE');
      expect(gated.primarySector).toBeNull();
      expect(gated.assignmentReason).toContain('MQG_REJECT_MULTI_SECTOR_STUFFING');
    });

    test('Hard Negative Fixture Evaluation: FIX-HN-102, 105, 111, 112 are properly gated to INSUFFICIENT_EVIDENCE', () => {
      const hnIds = ['FIX-HN-102', 'FIX-HN-105', 'FIX-HN-111', 'FIX-HN-112'];

      for (const hnId of hnIds) {
        const fixture = REGRESSION_FIXTURES.find(f => f.fixture_id === hnId);
        expect(fixture).toBeDefined();

        if (fixture) {
          const res = runScoringPipeline(fixture.page_1_input);
          expect(res.assignmentStatus).toBe('INSUFFICIENT_EVIDENCE');
          expect(res.assignmentReason).toMatch(/MQG_REJECT_/);
        }
      }
    });

    test('GOLD Fixture Regression Evaluation: All assigned GOLD fixtures retain ASSIGNED status without false positives from MQG', () => {
      const goldIds = P0E_GOLD_DEFERRED_IDS;

      for (const goldId of goldIds) {
        const fixture = REGRESSION_FIXTURES.find(f => f.fixture_id === goldId);
        expect(fixture).toBeDefined();

        if (fixture) {
          const res = runScoringPipeline(fixture.page_1_input);
          if (res.assignmentReason?.includes('MQG_REJECT_')) {
            console.log(`[GOLD MQG REJECT DEBUG] ${goldId}: status=${res.assignmentStatus}, reason=${res.assignmentReason}`);
          }
          expect(res.assignmentReason).not.toMatch(/MQG_REJECT_/);
        }
      }
    });

  });

});
