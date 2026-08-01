// src/lib/esg/types.ts
import { CarbonSummaryOutput } from '@/lib/carbon/types';

export interface ESGEnvironmentalMetrics {
  carbon: CarbonSummaryOutput;
  energy_kwh_total: number;
  water_m3_total: number;
}

export interface ESGSocialMetrics {
  total_beneficiaries: number;
  female_percentage: number;
  youth_percentage: number;
  vulnerable_percentage: number;
  social_value_idr: number;
  sroi_ratio: number;
}

export interface ESGGovernanceMetrics {
  evidence_verification_rate: number;
  impact_readiness_score: number;
  compliance_score: number;
  active_risks_count: number;
}

export interface ESGSDGMetrics {
  aligned_sdg_numbers: number[];
  primary_sdg: number;
}

export interface ESGSummaryPayload {
  organization_id: string;
  organization_name: string;
  environment: ESGEnvironmentalMetrics;
  social: ESGSocialMetrics;
  governance: ESGGovernanceMetrics;
  sdgs: ESGSDGMetrics;
  combined_impact_multiple: number; // SROI Ratio + EROI Ratio
}
