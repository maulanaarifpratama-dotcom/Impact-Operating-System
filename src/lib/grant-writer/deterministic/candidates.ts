import type { CanonicalCandidate, EvidenceSpan, Page1Input } from './types';
import { normalizeText } from './normalization';
import { findRawMatches, applyLongestMatchFirst, buildEvidenceSpans, RawMatch } from './evidence';
import {
  INTERVENTION_ARCHETYPES,
  OUTCOME_FAMILIES,
  OUTPUT_FAMILIES,
  SECTORS,
  ACTORS,
  PROBLEM_FAMILIES,
  INDICATOR_FAMILIES,
  ANTI_SIGNALS,
  ALIAS_MAPPINGS,
  REGISTRY_VERSION
} from './registry';

/**
 * Collects, resolves aliases, groups, and deduplicates canonical candidates from Page 1 inputs.
 * Strictly zero-token and deterministic.
 */
export function collectCandidates(input: Page1Input): CanonicalCandidate[] {
  const candidatesMap = new Map<string, CanonicalCandidate>();

  // Eligible text fields for P0-B extraction
  const fieldsToScan: { name: string; content: string | undefined | null }[] = [
    { name: 'program_story', content: input.program_story || input.programStory },
    { name: 'beneficiary_description', content: input.beneficiary_description || input.beneficiaryDescription },
    { name: 'program_title', content: input.program_title || input.programTitle },
    { name: 'background', content: input.background },
    { name: 'proposed_solution', content: input.proposed_solution || input.proposedSolution },
    { name: 'expected_outcomes', content: input.expected_outcomes || input.expectedOutcomes },
    { name: 'partners_and_actors', content: input.partners_and_actors || input.partnersAndActors },
    { name: 'budget_breakdown', content: input.budget_breakdown || input.budgetBreakdown }
  ];

  // Helper to add/merge a candidate into candidatesMap
  function addCandidate(
    rawId: string,
    type: CanonicalCandidate['candidateType'],
    spans: EvidenceSpan[],
    confusables: string[],
    matchedSigs: string[],
    negSigs: string[],
    antiSigs: string[]
  ) {
    // Early alias resolution (e.g. OPF-013 -> OPF-014)
    const canonicalId = ALIAS_MAPPINGS[rawId] || rawId;

    // Do not emit unknown or deferred candidates as canonical
    if (canonicalId === 'OPF-013' || canonicalId.toLowerCase().includes('deferred') || canonicalId.toLowerCase().includes('unsupported')) {
      return;
    }

    const key = `${canonicalId}::${type}`;
    const existing = candidatesMap.get(key);

    if (existing) {
      // Merge matched signals
      existing.matchedSignals = Array.from(new Set([...existing.matchedSignals, ...matchedSigs]));
      existing.negativeSignals = Array.from(new Set([...existing.negativeSignals, ...negSigs]));
      existing.antiSignals = Array.from(new Set([...existing.antiSignals, ...antiSigs]));
      existing.confusableCandidateIds = Array.from(new Set([...existing.confusableCandidateIds, ...confusables]));

      // Merge and deduplicate evidence spans (exact same field, start, end, and ID is duplicate)
      for (const span of spans) {
        const isDuplicate = existing.rawEvidenceSpans.some(
          s => s.sourceField === span.sourceField &&
               s.startOffset === span.startOffset &&
               s.endOffset === span.endOffset &&
               s.registryId === span.registryId
        );
        if (!isDuplicate) {
          existing.rawEvidenceSpans.push(span);
        }
      }
    } else {
      candidatesMap.set(key, {
        canonicalId,
        candidateType: type,
        matchedSignals: Array.from(new Set(matchedSigs)),
        negativeSignals: Array.from(new Set(negSigs)),
        antiSignals: Array.from(new Set(antiSigs)),
        confusableCandidateIds: Array.from(new Set(confusables)),
        rawEvidenceSpans: [...spans],
        minimumEvidenceStatus: spans.length > 0 ? 'met' : 'unmet',
        registryVersion: REGISTRY_VERSION,
        provenanceType: type === 'indicator' ? 'DIRECT' : undefined
      });
    }
  }

  // Scan each field and collect matches
  for (const field of fieldsToScan) {
    if (!field.content) continue;

    const normResult = normalizeText(field.content);
    if (!normResult.normalized) continue;

    const rawMatches: RawMatch[] = [];

    // 1. Scan Sectors
    for (const sector of SECTORS) {
      rawMatches.push(...findRawMatches(normResult.normalized, sector.positive_signals, 'positive_signal', sector.id));
    }

    // 2. Scan Intervention Archetypes
    for (const arch of INTERVENTION_ARCHETYPES) {
      rawMatches.push(...findRawMatches(normResult.normalized, arch.positive_action_signals, 'positive_action_signal', arch.archetype_id));
      rawMatches.push(...findRawMatches(normResult.normalized, arch.object_signals, 'object_signal', arch.archetype_id));
      rawMatches.push(...findRawMatches(normResult.normalized, arch.explicit_user_phrases, 'explicit_user_phrase', arch.archetype_id));
    }

    // 3. Scan Outcome Families
    for (const outcome of OUTCOME_FAMILIES) {
      rawMatches.push(...findRawMatches(normResult.normalized, outcome.positive_predicates_id, 'positive_predicate_id', outcome.outcome_family_id));
      rawMatches.push(...findRawMatches(normResult.normalized, outcome.positive_predicates_en, 'positive_predicate_en', outcome.outcome_family_id));
      rawMatches.push(...findRawMatches(normResult.normalized, outcome.object_of_change_ids, 'object_of_change_id', outcome.outcome_family_id));
    }

    // 4. Scan Output Families
    for (const output of OUTPUT_FAMILIES) {
      if (output.positive_signals) {
        rawMatches.push(...findRawMatches(normResult.normalized, output.positive_signals, 'positive_signal', output.output_family_id));
      }
    }

    // 5. Scan Actors
    for (const actor of ACTORS) {
      rawMatches.push(...findRawMatches(normResult.normalized, actor.positive_signals, 'positive_signal', actor.id));
    }

    // 6. Scan Problem Families
    for (const prob of PROBLEM_FAMILIES) {
      rawMatches.push(...findRawMatches(normResult.normalized, prob.positive_signals, 'positive_signal', prob.id));
    }

    // 7. Scan Indicator Families
    for (const ind of INDICATOR_FAMILIES) {
      if (ind.signals) {
        rawMatches.push(...findRawMatches(normResult.normalized, ind.signals, 'positive_signal', ind.id));
      }
    }

    // Apply Longest Match First partitioned by candidate category to allow
    // multiple layers of metadata (e.g. Archetype and Output) on the same string span.
    const partitionMatches: Record<string, RawMatch[]> = {};
    for (const match of rawMatches) {
      const regId = match.registryId;
      let category = 'other';
      if (regId.startsWith('ARCH-')) category = 'archetype';
      else if (regId.startsWith('OF-')) category = 'outcome';
      else if (regId.startsWith('OPF-')) category = 'output';
      else if (regId.startsWith('ACT-')) category = 'actor';
      else if (regId.startsWith('PF-')) category = 'problem';
      else if (regId.startsWith('SECTOR-')) category = 'sector';
      else if (regId.startsWith('IND-')) category = 'indicator';

      if (!partitionMatches[category]) {
        partitionMatches[category] = [];
      }
      partitionMatches[category].push(match);
    }

    const acceptedRaw: RawMatch[] = [];
    for (const cat of Object.keys(partitionMatches)) {
      acceptedRaw.push(...applyLongestMatchFirst(partitionMatches[cat]));
    }

    const spans = buildEvidenceSpans(acceptedRaw, normResult.original, normResult.indexMapping, field.name);

    // Group the generated spans by registry ID and add to Candidates Map
    for (const span of spans) {
      const regId = span.registryId;

      // Identify corresponding metadata
      let type: CanonicalCandidate['candidateType'] = 'sector';
      let confusables: string[] = [];
      const matchedSigs: string[] = [span.signalId || ''];
      const negSigs: string[] = [];
      let antiSigs: string[] = [];

      // Determine the candidate type and load associated metadata
      if (regId.startsWith('ARCH-')) {
        type = 'archetype';
        const item = INTERVENTION_ARCHETYPES.find(a => a.archetype_id === regId);
        if (item) {
          confusables = item.confusable_archetype_ids.map(c => c.archetype_id);
          // Look for any negative signals in this field
          for (const neg of item.negative_signals) {
            if (normResult.normalized.includes(normalizeText(neg).normalized)) {
              negSigs.push(neg);
            }
          }
          // Collect anti signals
          antiSigs = item.anti_signals;
        }
      } else if (regId.startsWith('OF-')) {
        type = 'outcome';
        const item = OUTCOME_FAMILIES.find(o => o.outcome_family_id === regId);
        if (item) {
          for (const neg of item.negative_signals) {
            if (normResult.normalized.includes(normalizeText(neg).normalized)) {
              negSigs.push(neg);
            }
          }
          antiSigs = item.anti_signals;
        }
      } else if (regId.startsWith('OPF-')) {
        type = 'output';
      } else if (regId.startsWith('ACT-')) {
        type = 'actor';
      } else if (regId.startsWith('PF-')) {
        type = 'problem';
      } else if (regId.startsWith('IND-')) {
        type = 'indicator';
      } else if (regId.startsWith('SECTOR-')) {
        type = 'sector';
        const item = SECTORS.find(s => s.id === regId);
        if (item) {
          for (const neg of item.negative_signals) {
            if (normResult.normalized.includes(normalizeText(neg).normalized)) {
              negSigs.push(neg);
            }
          }
        }
      }

      addCandidate(regId, type, [span], confusables, matchedSigs, negSigs, antiSigs);
    }

    // 7. Extract Global Anti-Signals explicitly as required by specification
    for (const rule of ANTI_SIGNALS) {
      const matchedSigs = findRawMatches(normResult.normalized, rule.positive_signals, 'anti_signal', rule.id);
      if (matchedSigs.length > 0) {
        const antiSpans = buildEvidenceSpans(matchedSigs, normResult.original, normResult.indexMapping, field.name);
        addCandidate(rule.id, 'sdg', antiSpans, [], matchedSigs.map(m => m.matchedValue), [], []);
      }
    }
  }

  // Derive canonical indicator candidates from outcome candidates via OF.indicator_family_ids
  const outcomeCandidates = Array.from(candidatesMap.values()).filter(c => c.candidateType === 'outcome');
  for (const ofCand of outcomeCandidates) {
    const ofItem = OUTCOME_FAMILIES.find(o => o.outcome_family_id === ofCand.canonicalId);
    if (ofItem && ofItem.indicator_family_ids && ofItem.indicator_family_ids.length > 0) {
      for (const indId of ofItem.indicator_family_ids) {
        const indKey = `${indId}::indicator`;
        if (!candidatesMap.has(indKey)) {
          candidatesMap.set(indKey, {
            canonicalId: indId,
            candidateType: 'indicator',
            matchedSignals: [...ofCand.matchedSignals],
            negativeSignals: [],
            antiSignals: [],
            confusableCandidateIds: [],
            rawEvidenceSpans: [...ofCand.rawEvidenceSpans],
            minimumEvidenceStatus: ofCand.minimumEvidenceStatus,
            registryVersion: ofCand.registryVersion,
            provenanceType: 'DERIVED_FROM_OUTCOME',
            sourceOutcomeFamilyId: ofCand.canonicalId,
            derivationPath: `${ofCand.canonicalId} -> indicator_family_ids -> ${indId}`
          });
        }
      }
    }
  }

  // Convert map to sorted list. Deterministic sorting by Canonical ID ascending, then by Candidate Type.
  return Array.from(candidatesMap.values()).sort((a, b) => {
    if (a.canonicalId !== b.canonicalId) {
      return a.canonicalId.localeCompare(b.canonicalId);
    }
    return a.candidateType.localeCompare(b.candidateType);
  });
}
