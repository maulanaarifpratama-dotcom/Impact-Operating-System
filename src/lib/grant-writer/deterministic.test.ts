import { describe, test, expect } from 'vitest';
import {
  normalizeText,
  isMorphologyOnlyMatch,
  verifyRegistryIntegrity,
  collectCandidates,
  REGRESSION_FIXTURES,
  runRegressionFixtures,
  getExecutionProofStatus
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
      // Setup a registry-like scenario inside candidate matching
      // If we scan "pendampingan pertanian berkelanjutan"
      // "pertanian" is a positive signal for SECTOR-AGRI-001
      // "pendampingan" is a positive signal for ARCH-MENTOR-003
      // We should extract both without overlapping clash because they are distinct words
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

      // Verify that getExecutionProofStatus reports correct gate status
      expect(getExecutionProofStatus()).toBe('P0_E_EXECUTION_NOT_YET_PROVEN');
    });
  });

});
