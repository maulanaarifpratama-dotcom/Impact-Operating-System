
export interface ComponentScore {
  componentName: string;
  rawScore: number;
  weight: number;
  saturatedScore: number;
}

export interface DetailedScoringResult {
  targetId: string;
  rawScore: number;
  intermediaryScore: number;
  finalScore: number;
  components: ComponentScore[];
  penaltiesApplied: {
    id: string;
    amount: number;
    type: 'anti_signal' | 'negative_signal' | 'conflict' | 'unverified_span' | 'unsupported_override';
  }[];
}

export interface RecommendationResult {
  primarySector: string | null;
  secondarySectors: string[];
  primaryInterventions: string[];
  supportingInterventions: string[];
  primarySDGs: string[];
  secondarySDGs: string[];
  warnings: string[];
  missingInformation: string[];
  confidenceScore: number;
  isAmbiguous: boolean;
  provenanceLogs: string[];
}
