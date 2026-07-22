/**
 * Materializes parameters for INITIAL-HEURISTIC-CONFIG-V1 and SCORING-CONTRACT-V1.
 */
export const SCORING_CONFIG = {
  contract_version: "SCORING-CONTRACT-V1",
  heuristic_config_version: "INITIAL-HEURISTIC-CONFIG-V1",

  // Candidate eligibility
  eligibility: {
    minimum_non_morphology_confidence: 0.50,
    morphology_confidence_cap: 0.40,
    field_diversity_boost: 0.05,
    max_field_diversity_boost: 0.15,
  },

  // Sector scoring parameters
  sector_scoring: {
    weights: {
      problem_family_alignment: 0.25,
      outcome_family_alignment: 0.25,
      target_actor_alignment: 0.15,
      intervention_alignment: 0.15,
      indicator_family_alignment: 0.10,
      language_alignment: 0.05,
      supporting_document_bonus: 0.05,
    },
    saturation_thresholds: {
      problem_family_alignment: 3.0,
      outcome_family_alignment: 2.0,
      target_actor_alignment: 1.0,
      intervention_alignment: 2.0,
      indicator_family_alignment: 2.0,
      language_alignment: 2.0,
      supporting_document_bonus: 1.0,
    },
    thresholds: {
      primary: 0.70,
      secondary: 0.50,
      optional: 0.40,
    },
    limits: {
      max_primary: 1,
      max_secondary: 2,
    },
    ambiguity_margin: 0.10,
  },

  // SDG scoring parameters
  sdg_scoring: {
    weights: {
      problem_family_alignment: 0.15,
      outcome_family_alignment: 0.30,
      target_actor_alignment: 0.05,
      intervention_alignment: 0.08,
      indicator_family_alignment: 0.25,
      cross_cutting_relevance: 0.04,
      explicit_donor_alignment: 0.03,
      official_target_alignment: 0.10,
    },
    saturation_thresholds: {
      problem_family_alignment: 3.0,
      outcome_family_alignment: 2.0,
      target_actor_alignment: 1.0,
      intervention_alignment: 2.0,
      indicator_family_alignment: 2.0,
      cross_cutting_relevance: 1.0,
      explicit_donor_alignment: 1.0,
      official_target_alignment: 1.0,
    },
    thresholds: {
      primary: 0.75,
      secondary: 0.55,
      optional: 0.40,
    },
    limits: {
      max_primary: 2,
      max_secondary: 2,
    },
  },

  // Global penalties
  penalties: {
    anti_signal_default: -0.25,
    anti_signal_generic_only: -0.15,
    unsupported_claim_penalty: -0.30,
    unverified_inference_penalty: -0.15,
  },

  // Numeric policy
  precision: {
    decimal_places: 4,
    rounding_mode: "ROUND_HALF_UP",
    clamp_range: [0.0000, 1.0000] as [number, number],
  },
};
