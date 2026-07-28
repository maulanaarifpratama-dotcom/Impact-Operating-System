export interface AssertionResult {
  assertionId: string;
  stage: 'P0_B' | 'P0_C' | 'P0_D' | 'CROSS_STAGE';
  assertionType: string;
  category?: string;
  executed?: boolean;
  expectedSource?: string;
  actualField?: string;
  passed: boolean;
  message: string;
  expected: unknown;
  actual: unknown;
}

export interface FixtureOracleReport {
  fixtureId: string;
  passed: boolean;
  assertionsCount: number;
  passedAssertionsCount: number;
  failedAssertionsCount: number;
  assertions: AssertionResult[];
}

export interface MetamorphicTestResult {
  mrId: string;
  name: string;
  passed: boolean;
  message: string;
}

export interface MutationKillResult {
  targetId: string;
  name: string;
  killed: boolean;
  killingAssertionId?: string;
  message: string;
}

export interface P0EExecutionReport {
  timestamp: string;
  baselineCommit: string;
  manifestVersion: string;
  fixturesReport: {
    totalFixtures: number;
    passedFixtures: number;
    failedFixtures: number;
    reports: FixtureOracleReport[];
  };
  metamorphicReport: {
    totalMRs: number;
    passedMRs: number;
    failedMRs: number;
    results: MetamorphicTestResult[];
  };
  mutationReport: {
    totalMutations: number;
    killedMutations: number;
    failedMutations: number;
    results: MutationKillResult[];
  };
}
