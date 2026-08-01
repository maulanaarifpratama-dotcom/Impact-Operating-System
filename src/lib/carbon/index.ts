// src/lib/carbon/index.ts

export * from './types';
export * from './benchmarks';
export * from './formatters';
export * from './calculators';
export * from './engine';

// Backward compatibility export for aggregation.ts
export { computeCarbonSummary } from './aggregation';
