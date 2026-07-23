/**
 * TypeScript types and interfaces for the GrantWriter Deterministic Mapping Engine.
 * Aligned with specification version 1.2.
 */

export interface NormalizerOutput {
  original: string;
  normalized: string;
  indexMapping: number[]; // maps index in normalized to original
}

export interface EvidenceSpan {
  sourceField: string;
  originalText: string;
  matchedText: string;
  normalizedMatch: string;
  startOffset: number;
  endOffset: number;
  signalType: string; // e.g., 'positive_action_signal', 'object_signal', 'explicit_user_phrase', etc.
  registryId: string;
  signalId?: string; // or value matched
}

export interface CanonicalCandidate {
  canonicalId: string;
  candidateType: 'sector' | 'archetype' | 'outcome' | 'output' | 'actor' | 'problem' | 'indicator' | 'cross_cutting' | 'missing_info' | 'sdg';
  matchedSignals: string[];
  negativeSignals: string[];
  antiSignals: string[];
  confusableCandidateIds: string[];
  rawEvidenceSpans: EvidenceSpan[];
  minimumEvidenceStatus: 'met' | 'unmet' | 'unknown';
  registryVersion: string;
  provenanceType?: 'DIRECT' | 'DERIVED_FROM_OUTCOME';
  sourceOutcomeFamilyId?: string;
  derivationPath?: string;
}

export interface InterventionArchetype {
  archetype_id: string;
  name_id: string;
  name_en: string;
  definition: string;
  positive_action_signals: string[];
  object_signals: string[];
  actor_signals: string[];
  explicit_user_phrases: string[];
  problem_family_ids: string[];
  expected_output_family_ids: string[];
  expected_intermediate_outcome_ids: string[];
  expected_outcome_family_ids: string[];
  wbs_pattern_ids: string[];
  cost_driver_pattern_ids: string[];
  meal_pattern_ids: string[];
  negative_signals: string[];
  anti_signals: string[];
  confusable_archetype_ids: { archetype_id: string; disambiguation: string }[];
  minimum_evidence: string;
  disambiguation_questions: string;
  epistemic_label: string;
  sources: string[];
}

export interface OutcomeFamily {
  outcome_family_id: string;
  canonical_name_id: string;
  canonical_name_en: string;
  definition: string;
  allowed_target_actor_types: string[];
  positive_predicates_id: string[];
  positive_predicates_en: string[];
  object_of_change_ids: string[];
  negative_signals: string[];
  anti_signals: string[];
  minimum_evidence: string;
  likely_sectors: string[];
  likely_archetypes: string[];
  indicator_family_ids: string[];
  sdg_affinities: { sdg_id: string; official_target_ids: string[]; condition: string }[];
  time_horizon_guidance: string;
  common_output_confusions: string[];
  common_activity_confusions: string[];
  causal_leap_risks: string[];
  epistemic_label: string;
  sources: string[];
}

export interface OutputFamily {
  output_family_id: string;
  canonical_name: string;
  project_control_level: 'FULL' | string;
  expected_verification: string;
  likely_outcome_family_ids: string[];
  common_confusions: string;
  positive_signals?: string[]; // Custom added for P0-B lexical matching
}

export interface Sector {
  id: string;
  name: string;
  positive_signals: string[];
  negative_signals: string[];
}

export interface Actor {
  id: string;
  name: string;
  positive_signals: string[];
}

export interface ProblemFamily {
  id: string;
  name: string;
  positive_signals: string[];
}

export interface MissingInformationRule {
  id: string;
  name: string;
  trigger_condition: string;
}

export interface AntiSignalRule {
  id: string;
  target_id: string; // e.g. SDG_2
  positive_signals: string[];
}

export interface Page1Input {
  program_title?: string;
  programTitle?: string;
  location?: string;
  duration_value?: number;
  durationValue?: number;
  duration_unit?: string;
  durationUnit?: string;
  beneficiary_description?: string;
  beneficiaryDescription?: string;
  beneficiary_count?: number;
  beneficiaryCount?: number;
  beneficiary_unit?: string;
  beneficiaryUnit?: string;
  funding_amount?: number;
  fundingAmount?: number;
  currency?: string;
  donor_or_call_optional?: string | null;
  donorOrCallOptional?: string | null;
  program_story?: string;
  programStory?: string;
  background?: string;
  proposed_solution?: string;
  proposedSolution?: string;
  expected_outcomes?: string;
  expectedOutcomes?: string;
  partners_and_actors?: string;
  partnersAndActors?: string;
  budget_breakdown?: string;
  budgetBreakdown?: string;
}

export interface ExpectedMapping {
  sector_primary?: string;
  sector_secondary?: string[];
  interventions_primary?: string[];
  actor_roles?: Record<string, string[]>;
  outcome_families?: string[];
  output_families?: string[];
  sdg_primary?: string[];
  sdg_secondary?: string[];
  sdg_rejected_as_primary?: string[];
  warnings_expected?: string[];
  missing_information_expected?: string[];
}

export interface Fixture {
  fixture_id: string;
  fixture_type: 'hard_negative' | 'gold';
  language: string;
  page_1_input: Page1Input;
  incorrect_mapping?: {
    sdg_primary?: string[];
    reason_it_looks_right?: string;
  };
  expected_mapping: ExpectedMapping;
  anti_signal_ids?: string[];
  expected_confidence_behavior?: string;
  pass_criteria?: string;
  source_ref?: string;
  epistemic_label?: string;
}

export interface FixtureRunnerOutput {
  status: 'P0_B_EXTRACTION_ASSERTIONS' | 'P0_E_EXECUTION_NOT_YET_PROVEN';
  loadedFixtures: number;
  passedFixturesCount: number;
  failedFixturesCount: number;
  results: {
    fixtureId: string;
    passed: boolean;
    issues: string[];
  }[];
}
