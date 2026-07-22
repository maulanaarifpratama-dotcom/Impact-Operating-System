export * from './types';
export { normalizeText } from './normalization';
export { isMorphologyOnlyMatch } from './morphology';
export {
  INTERVENTION_ARCHETYPES,
  OUTCOME_FAMILIES,
  OUTPUT_FAMILIES,
  SECTORS,
  ACTORS,
  PROBLEM_FAMILIES,
  ANTI_SIGNALS,
  verifyRegistryIntegrity
} from './registry';
export { collectCandidates } from './candidates';
export { REGRESSION_FIXTURES } from './fixtures';
export { runRegressionFixtures, getExecutionProofStatus } from './runner';

// P0-C Scoring and Recommendation Engine Exports
export * from './scoring-types';
export { SCORING_CONFIG } from './scoring-config';
export {
  roundHalfUp,
  getSpanConfidence,
  getCandidateConfidence,
  preprocessEligibility,
  scoreSector,
  scoreSDG,
  processConflictsAndPenalties,
  getTriggeredMissingInformationRules,
  assignRecommendations,
  runScoringPipeline
} from './scoring-runner';

// P0-D Program Blueprint and Page 2 Integration Exports
export * from './blueprint-types';
export { BLUEPRINT_TEMPLATES, BLUEPRINT_FALLBACKS } from './blueprint-config';
export { validateCausalOrdering, deriveCausalSupportSnapshot, evaluateCausalGuardrails, checkCausalLeap } from './causal-guardrails';
export { assembleBlueprint } from './blueprint-assembler';
export {
  createPage2Payload,
  convertToProvisionalDomainResponse,
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
  buildApprovedSessionSnapshot
} from './page2-payload';
