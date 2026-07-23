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
} from '../../../../generated/registry.generated';
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
export { evaluateMethodologyQualityGate } from './methodology-gate';

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

// 27.5k Brain Full 5-Layer Engine Exports
export { expandOutcomes, getImpactCategory } from './outcome-expansion';
export { expandOutputs, getDeliverableType } from './output-expansion';
export { decomposeActivities } from './activity-decomposition';
export { scaffoldOutcomeIndicators, scaffoldOutputIndicators } from './indicator-scaffolding';
export { extractCostDrivers } from './cost-driver-extraction';
export { evaluateBQS27K } from './bqs-27k';
export { assembleCanonicalProposalV2 } from './assemble-canonical-proposal-v2';




