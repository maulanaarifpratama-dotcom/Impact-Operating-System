import type { FixtureRunnerOutput } from './types';
import { REGRESSION_FIXTURES } from './fixtures';
import { collectCandidates } from './candidates';

/**
 * Executes P0-B deterministic extraction assertions across all 27 regression fixtures.
 */
export function runRegressionFixtures(): FixtureRunnerOutput {
  const results: { fixtureId: string; passed: boolean; issues: string[] }[] = [];
  let passedFixturesCount = 0;
  let failedFixturesCount = 0;

  for (const fixture of REGRESSION_FIXTURES) {
    const issues: string[] = [];

    try {
      // 1. Run deterministic candidate collection
      const candidates = collectCandidates(fixture.page_1_input);

      // Assertion A: Evidence Spans Integrity
      for (const candidate of candidates) {
        // Every extracted candidate must have at least one valid evidence span (no synthetic evidence)
        if (candidate.rawEvidenceSpans.length === 0) {
          issues.push(`Candidate "${candidate.canonicalId}" has empty rawEvidenceSpans.`);
        }

        for (const span of candidate.rawEvidenceSpans) {
          if (span.startOffset < 0 || span.endOffset < span.startOffset) {
            issues.push(`Candidate "${candidate.canonicalId}" has invalid offsets [${span.startOffset}, ${span.endOffset}].`);
          }
          // Verify end-exclusive character slicing match
          const storyContent = fixture.page_1_input.program_story || fixture.page_1_input.programStory || '';
          const beneficiaryContent = fixture.page_1_input.beneficiary_description || fixture.page_1_input.beneficiaryDescription || '';
          const titleContent = fixture.page_1_input.program_title || fixture.page_1_input.programTitle || '';
          
          let rawSource = '';
          if (span.sourceField === 'program_story') rawSource = storyContent;
          else if (span.sourceField === 'beneficiary_description') rawSource = beneficiaryContent;
          else if (span.sourceField === 'program_title') rawSource = titleContent;

          if (rawSource) {
            const sliced = rawSource.slice(span.startOffset, span.endOffset);
            if (sliced !== span.matchedText) {
              issues.push(`Evidence slice mismatch for "${candidate.canonicalId}": expected "${span.matchedText}", got "${sliced}".`);
            }
          }
        }
      }

      // Assertion B: Alias Resolution
      const hasDeprecatedAlias = candidates.some(c => c.canonicalId === 'OPF-013');
      if (hasDeprecatedAlias) {
        issues.push(`Alias resolution failure: extracted OPF-013 but expected OPF-014.`);
      }

      // Assertion C: Expected Primary Interventions / Sectors presence in candidates
      if (fixture.expected_mapping.interventions_primary) {
        for (const expectedArch of fixture.expected_mapping.interventions_primary) {
          const found = candidates.some(c => c.canonicalId === expectedArch && c.candidateType === 'archetype');
          if (!found) {
            // Note: Since P0-B does not do scoring/assembly, we assert extraction of candidates
            issues.push(`Expected Archetype candidate "${expectedArch}" was not extracted.`);
          }
        }
      }

      if (fixture.expected_mapping.sector_primary) {
        const expectedSector = fixture.expected_mapping.sector_primary;
        // Check if sector candidate was extracted or if the story context contains the sector's signals
        const found = candidates.some(c => c.canonicalId === expectedSector && c.candidateType === 'sector');
        if (!found) {
          issues.push(`Expected Sector candidate "${expectedSector}" was not extracted.`);
        }
      }

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      issues.push(`Execution error: ${errMsg}`);
    }

    const passed = issues.length === 0;
    if (passed) passedFixturesCount++;
    else failedFixturesCount++;

    results.push({
      fixtureId: fixture.fixture_id,
      passed,
      issues
    });
  }

  return {
    status: 'P0_B_EXTRACTION_ASSERTIONS', // As required, we return extraction assertions status
    loadedFixtures: REGRESSION_FIXTURES.length,
    passedFixturesCount,
    failedFixturesCount,
    results
  };
}
export function getExecutionProofStatus(): string {
  return 'P0_E_EXECUTION_NOT_YET_PROVEN'; // Do not fake P0-E pass
}
