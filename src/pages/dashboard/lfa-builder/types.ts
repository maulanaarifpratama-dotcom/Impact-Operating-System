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
