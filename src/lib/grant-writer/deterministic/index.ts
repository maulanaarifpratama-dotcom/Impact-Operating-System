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
