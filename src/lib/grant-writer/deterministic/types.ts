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

/**
 * "The user did not tell us", as distinct from a value of zero.
 *
 * The wizard has to keep these apart: a programme with no budget entered yet is
 * not a programme with a budget of nothing, and only the first should raise
 * MISS-004. The scoring engine tests for both spellings by hand — see
 * getTriggeredMissingInformationRules — so they are part of the contract, not
 * an accident of the form.
 */
export type Unanswered = 'unknown' | 'unentered';

/**
 * Everything the deterministic engine will accept on page one.
 *
 * Two things about this interface look like mistakes and are not.
 *
 * Every field appears in both snake_case and camelCase because the engine is
 * fed from two directions — the wizard hands it camelCase state, the fixtures
 * and stored payloads use snake_case — and each reader tries both in turn.
 *
 * The numeric fields accept Unanswered because the wizard genuinely produces
 * it. This interface used to declare only `beneficiaryCount?: number`, so the
 * one type that mattered disagreed with the code around it: the engine's own
 * `count === 'unentered'` checks compared values TypeScript said could never be
 * strings, and every fixture in deterministic.test.ts was rejected for passing
 * exactly what the wizard passes in production. That is why the test imported
 * its Page1Input from provisionalAdapter instead — a second, incompatible
 * definition of the same name, which then disagreed with the engine in the
 * other direction.
 *
 * The declaration was narrower than the contract the code already implemented.
 * Widening it changes no behaviour; it just stops the type lying about what
 * these functions take.
 */
export interface Page1Input {
  id?: string;
  organization_id?: string;

  program_title?: string;
  programTitle?: string;

  location?: string;
  locationValue?: string;
  geography?: string;
  geographyLevel?: string;
  geographyStatus?: 'known' | Unanswered;

  duration_value?: number;
  durationValue?: number;
  durationMonths?: number | Unanswered;
  duration_unit?: string;
  durationUnit?: string;

  beneficiary_description?: string;
  beneficiaryDescription?: string;
  beneficiary_count?: number | Unanswered;
  beneficiaryCount?: number | Unanswered;
  beneficiaryCountValue?: number;
  beneficiary_unit?: string;
  beneficiaryUnit?: string;

  funding_amount?: number;
  fundingAmount?: number;
  budgetIdr?: number | Unanswered;
  currency?: string;

  donor_or_call_optional?: string | null;
  donorOrCallOptional?: string | null;
  target_donor?: string;
  targetDonor?: string;
  donorStandard?: string;

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

// ============================================================================
// CANONICAL PROPOSAL CONTRACT V2 (27.5K BRAIN ENGINE SPECIFICATION)
// ============================================================================

export interface CostDriverV2 {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;                     // e.g., "orang", "paket", "unit", "sesi", "bulan"
  frequency: number;
  duration_days?: number;
  estimated_unit_cost_idr?: number;
  price_basis?: string;             // e.g., "Standard SBM 2026", "Survei Pasar"
}

export interface IndicatorV2 {
  id: string;
  indicator_name: string;
  baseline_value: string | number;
  target_value: string | number;
  unit_of_measure: string;
  means_of_verification: string;    // e.g., "Laporan Absensi", "Berita Acara ODF", "Log System"
}

export interface CanonicalActivityV2 {
  id: string;
  parent_output_id: string;         // Explicit parent reference
  code: string;                     // e.g., "ACT-1.1.1"
  activity_name: string;
  description: string;
  activity_type: 'workshop' | 'procurement' | 'coaching' | 'construction' | 'software_dev' | 'campaign';
  owner_role: string;               // e.g., "Project Manager", "Field Facilitator"
  cost_drivers: CostDriverV2[];
}

export interface CanonicalOutputV2 {
  id: string;
  parent_outcome_id: string;        // Explicit parent reference
  code: string;                     // e.g., "OUT-1.1"
  output_name: string;
  description: string;
  deliverable_type: 'tangible_good' | 'training_completed' | 'sop_document' | 'digital_system' | 'service';
  indicators: IndicatorV2[];
  activities: CanonicalActivityV2[];
}

export interface CanonicalOutcomeV2 {
  id: string;
  code: string;                     // e.g., "OC-1"
  outcome_name: string;
  description: string;
  impact_category: 'economic' | 'health' | 'education' | 'environment' | 'governance';
  indicators: IndicatorV2[];
  outputs: CanonicalOutputV2[];
}

export interface CanonicalProposalPayloadV2 {
  project_id: string;
  organization_id: string;
  version: number;                  // Version 2
  metadata: {
    title: string;
    geography: string;
    duration_months: number;
    beneficiary_count: number;
    total_budget_idr: number;
    target_donor: string;
    donor_standard: string;
  };
  outcomes: CanonicalOutcomeV2[];   // Array of Outcomes (1-3)
  unlinked_nodes?: {
    activities: CanonicalActivityV2[];
  };
}

