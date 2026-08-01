// src/lib/reports/types.ts
import { ESGSummaryPayload } from '@/lib/esg/types';

export type ReportTemplateType = 'GRI' | 'SEOJK' | 'SDG' | 'EXECUTIVE';

export interface UnifiedReportPayload {
  organization: {
    id: string;
    name: string;
    legal_entity?: string;
  };
  program: {
    id?: string;
    name?: string;
    goal_statement?: string;
    purpose_statement?: string;
  };
  execution_summary: {
    total_wbs_activities: number;
    completed_activities: number;
    completion_rate_percentage: number;
    evidence_verification_rate: number;
  };
  financial_summary: {
    total_planned_budget_idr: number;
    total_actual_spend_idr: number;
    budget_realization_percentage: number;
  };
  performance_results: {
    total_indicators_tracked: number;
    average_target_achievement_percentage: number;
  };
  social_impact: {
    total_beneficiaries: number;
    female_percentage: number;
    youth_percentage: number;
    vulnerable_percentage: number;
    social_value_generated_idr: number;
    sroi_ratio: number;
  };
  environmental_impact: {
    gross_emissions_kg: number;
    gross_reductions_kg: number;
    net_impact_co2e_kg: number;
    net_impact_co2e_tons: number;
    trees_equivalent: number;
    monetized_environmental_value_idr: number;
    eroi_ratio: number;
  };
  esg_summary: ESGSummaryPayload;
  ai_narratives?: {
    executive_statement?: string;
    esg_highlights?: string;
    sdg_contribution_summary?: string;
  };
}

export interface ReportSnapshotRecord {
  id: string;
  org_id: string;
  report_title: string;
  report_type: ReportTemplateType;
  report_period: string;
  snapshot_json: UnifiedReportPayload;
  pdf_storage_url?: string | null;
  docx_storage_url?: string | null;
  created_by?: string | null;
  created_at: string;
}
