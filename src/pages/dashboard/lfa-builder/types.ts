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

export type WbsStatus = 'draft' | 'not_started' | 'ready' | 'in_progress' | 'blocked' | 'in_review' | 'completed' | 'cancelled';

// PM-P5 canonical Finance lifecycle (see src/lib/project-management/financeModel.ts,
// the single source of truth for labels/validation). 'blocked_by_finance' removed —
// a financial obstruction is a Bottleneck (category = financial), not a status value.
export type WbsFinancialStatus = 'draft' | 'committed' | 'disbursement_requested' | 'paid' | 'closed';

// PM-P4D canonical Bottleneck taxonomy (see src/lib/project-management/bottleneckModel.ts,
// the single source of truth for labels/options). 'donor_disbursement' -> 'financial',
// 'vendor_delay' -> 'vendor' (PM-P4D migration); Bottleneck is the risk domain, Finance
// (financeModel.ts) is the resource-flow domain — a financial obstruction is a Bottleneck
// with category = 'financial', never a FinancialStatus value.
export type WbsBlockerCategory =
  | 'field_condition'
  | 'financial'
  | 'procurement'
  | 'vendor'
  | 'human_resources'
  | 'stakeholder'
  | 'internal_approval'
  | 'regulatory'
  | 'security'
  | 'force_majeure'
  | 'other';

export interface WbsItem {
  id: string;
  lfa_project_id: string;
  lfa_entry_id?: string | null;
  owner_id?: string | null;
  reviewer_id?: string | null;
  stage_id?: string | null;
  financial_status?: WbsFinancialStatus | null;
  blocker_category?: WbsBlockerCategory | null;
  blocker_notes?: string | null;
  org_id: string;
  level: 1 | 2 | 3 | 4;
  parent_id: string | null;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
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
  carbon_quantity?: number | null;
  carbon_scope?: 'scope_1' | 'scope_2' | 'scope_3' | null;
  status?: WbsStatus;
  progress_percent?: number;
  blocked_reason?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
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

export type MealIndicatorType = 'cumulative_number' | 'snapshot_percentage' | 'ratio' | 'index_score' | 'monetary_value';

export type MealAggregationMethod = 'sum' | 'latest' | 'average' | 'max';

export type MealVerificationState = 'draft' | 'submitted' | 'verified' | 'rejected';

export interface MealItem {
  id: string;
  lfa_project_id: string;
  wbs_item_id?: string | null;
  objective_id?: string | null;
  stage_id?: string | null;
  deliverable_id?: string | null;
  org_id: string;
  lfa_level: 'goal' | 'purpose' | 'output';
  indicator_text: string;
  indicator_type?: MealIndicatorType | null;
  aggregation_method?: MealAggregationMethod | null;
  unit_type?: string | null;
  verification_state?: MealVerificationState | null;
  assigned_user?: string | null;
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
  wbs_evidence_id?: string | null;
  verification_state?: MealVerificationState | null;
  verified_by?: string | null;
  verified_at?: string | null;
  verification_notes?: string | null;
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
  stakeholder_group?: string | null;
  mode: 'simple' | 'professional';
  sort_order: number;
  is_registry_linked?: boolean;
  outcome?: string;
  proxy_value?: number;
  duration?: number;
  attribution?: number;
  dropoff?: number;
  attribution_rationale?: string | null;
  deadweight_rationale?: string | null;
  displacement_rationale?: string | null;
  dropoff_rationale?: string | null;
  wbs_evidence_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type WbsCompletionClaimStatus = 'draft' | 'submitted' | 'verified' | 'rejected' | 'needs_revision' | 'cancelled';

// ACR Facts (PM ACR v1 Phase 1): simple {label, value} rows — default counters
// plus custom rows. Activity-level notes only, no indicator mapping in v1.
export interface WbsFact {
  label: string;
  value: string;
}

export interface WbsCompletionClaim {
  id: string;
  org_id: string;
  lfa_project_id: string;
  wbs_item_id: string;
  claimed_by: string;
  claimed_at: string;
  claim_note?: string | null;
  claimed_progress?: number | null;
  status: WbsCompletionClaimStatus;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  review_note?: string | null;
  created_at?: string;
  updated_at?: string;
  // ACR Facts & Notes (PM + MEAL v1 Final Simplification). Lessons Learned /
  // Recommendations / Next Action were removed — Learning is derived later
  // from Evidence + Facts + Notes, not captured as separate fields here.
  facts?: WbsFact[] | null;
  observations?: string | null;
}

export type WbsEvidenceType = 'file' | 'link' | 'note' | 'manual_url' | 'onedrive' | 'other';

export interface WbsCompletionEvidence {
  id: string;
  org_id: string;
  claim_id: string;
  evidence_type?: WbsEvidenceType | null;
  storage_reference?: string | null;
  title?: string | null;
  description?: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

export type DeliverableStatus = 'not_started' | 'in_progress' | 'submitted' | 'approved';

export interface ProjectDeliverable {
  id: string;
  org_id: string;
  project_id: string;
  name: string;
  description: string | null;
  due_date: string | null;
  owner: string | null;
  status: DeliverableStatus;
  created_at?: string;
  updated_at?: string;
  archived_at: string | null;
}

export interface ProjectDeliverableActivity {
  deliverable_id: string;
  wbs_item_id: string;
}

export type MilestoneStatus = 'upcoming' | 'achieved' | 'delayed';

export interface ProjectMilestone {
  id: string;
  org_id: string;
  project_id: string;
  name: string;
  target_date: string | null;
  status: MilestoneStatus;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  archived_at: string | null;
}

export type EvaluationFindingSeverity = 'informational' | 'minor' | 'major' | 'critical';

// MEAL-P1 (revised per stop-gate review): Learning is NOT an independent
// entity — it is a derived view over wbs_completion_claims.facts/observations
// (see ControlCenterTab in ProjectMEALPage.tsx). Evaluation Finding is the
// one genuinely new PM+MEAL entity: the fewer, formal, periodic judgment
// layer, owner/admin only, referencing ACR Evidence/Activity/Deliverable by
// id rather than duplicating them.
export interface ProjectEvaluationFinding {
  id: string;
  org_id: string;
  project_id: string;
  title: string;
  finding: string;
  severity: EvaluationFindingSeverity;
  recommendation: string | null;
  wbs_item_id: string | null;
  deliverable_id: string | null;
  evidence_id: string | null;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}
