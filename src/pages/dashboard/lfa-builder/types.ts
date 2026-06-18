export interface LfaProject {
  id: string;
  org_id: string;
  name: string;
  sector?: string | null;
  location?: string | null;
  duration_months?: number | null;
  start_date?: string | null;
  beneficiary_count?: number | null;
  beneficiary_description?: string | null;
  status?: string | null;
  donor_feedback?: string | null;
  linked_grant_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface LfaEntry {
  id?: string;
  project_id: string;
  org_id: string;
  level: 'goal' | 'purpose' | 'output' | 'activity';
  sequence?: number | null;
  parent_id?: string | null;
  description?: string | null;
  indicator?: string | null;
  means_of_verification?: string | null;
  assumption?: string | null;
  responsible_party?: string | null;
  timeline_start?: number | null;
  timeline_end?: number | null;
  ai_suggestion?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AiActivity {
  sequence?: number;
  description?: string;
  indicator?: string;
  means_of_verification?: string;
  assumption?: string;
  timeline_start?: number;
  timeline_end?: number;
}

export interface WbsItem {
  id: string;
  lfa_project_id: string;
  org_id: string;
  level: 1 | 2 | 3 | 4;
  parent_id: string | null;
  name: string;
  start_month: number;
  duration_weeks: number;
  pic?: string | null;
  method?: 'Workshop' | 'FGD' | 'Survey' | 'Pelatihan' | 'Pendampingan' | 'Rapat' | 'Lainnya' | null;
  indicator?: string | null;
  notes?: string | null;
  dependencies?: string[] | null;
  sort_order: number;
  mode: 'simple' | 'professional';
  carbon_enabled?: boolean | null;
  carbon_factor?: number | null;
  carbon_unit?: string | null;
  carbon_source?: string | null;
  carbon_description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetItem {
  id: string;
  lfa_project_id: string;
  org_id: string;
  wbs_item_id?: string | null;
  activity_name?: string | null;
  category?: string | null; // For Simple Mode (Honorarium, Transport, etc.)
  cost_category?: string | null; // For Professional Mode (Personnel & Consultants, etc.)
  item_name: string;
  volume: number;
  unit?: string | null;
  unit_price_idr: number;
  funding_source: 'grant' | 'self' | 'partner' | 'inkind';
  justification?: string | null;
  needs_donor_approval: boolean;
  sort_order: number;
  mode: 'simple' | 'professional';
  actual_amount_idr?: number | null;
  realisasi_date?: string | null;
  realisasi_notes?: string | null;
  realisasi_evidence_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MealItem {
  id: string;
  lfa_project_id: string;
  org_id: string;
  lfa_level: 'goal' | 'purpose' | 'output';
  indicator_text: string;
  target_value?: number | null;
  target_unit?: string | null;
  collection_method?: string | null;
  collection_tool?: string | null;
  frequency?: string | null;
  pic?: string | null;
  status: 'Belum Mulai' | 'Sedang Berjalan' | 'Selesai';
  baseline?: number | null;
  midline_target?: number | null;
  endline_target?: number | null;
  secondary_source?: string | null;
  disaggregation: string[];
  data_assumption?: string | null;
  monitoring_risk?: string | null;
  mode: 'simple' | 'professional';
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface MealTrackingEntry {
  id: string;
  meal_item_id: string;
  lfa_project_id: string;
  org_id: string;
  recorded_value: number;
  recorded_date: string;
  recorded_by?: string | null;
  evidence_source_type?: 'manual_url' | 'onedrive' | 'other' | null;
  evidence_url?: string | null;
  evidence_note?: string | null;
  onedrive_drive_id?: string | null;
  onedrive_item_id?: string | null;
  onedrive_web_url?: string | null;
  library_document_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MealLearningQuestion {
  id: string;
  lfa_project_id: string;
  org_id: string;
  question_text: string;
  answer_method?: string | null;
  timeline_month: number;
  pic?: string | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface MealAccountability {
  id: string;
  lfa_project_id: string;
  org_id: string;
  mechanism: string;
  frequency?: string | null;
  pic?: string | null;
  escalation_procedure?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LfaSroiConfig {
  id: string;
  lfa_project_id: string;
  org_id: string;
  total_investment_idr: number;
  discount_rate: number;
  analysis_period_years: number;
  beneficiary_count: number | null;
  mode: 'simple' | 'professional';
  sroi_ratio: number;
  total_gross_value_idr: number;
  total_present_value_idr: number;
  ai_narrative: string | null;
  sensitivity_result: any | null;
  created_at?: string;
  updated_at?: string;
}

export interface LfaSroiOutcome {
  id: string;
  lfa_project_id: string;
  org_id: string;
  meal_item_id: string | null;
  outcome_name: string;
  quantity: number;
  unit: string | null;
  proxy_value_idr: number;
  proxy_source: string | null;
  proxy_citation: string | null;
  proxy_category: string | null;
  duration_years: number;
  attribution_pct: number;
  deadweight_pct: number;
  displacement_pct: number;
  dropoff_pct_per_year: number;
  gross_value_idr: number;
  present_value_idr: number;
  mode: 'simple' | 'professional';
  sort_order: number;
  is_registry_linked?: boolean;
  outcome?: string;
  proxy_value?: number;
  duration?: number;
  attribution?: number;
  dropoff?: number;
  created_at?: string;
  updated_at?: string;
}
