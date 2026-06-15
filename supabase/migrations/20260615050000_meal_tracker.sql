-- Migration: MEAL Tracker MVP Schema
-- Path: supabase/migrations/20260615050000_meal_tracker.sql

CREATE TABLE IF NOT EXISTS lfa_meal_tracking_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_item_id UUID NOT NULL REFERENCES lfa_meal_items(id) ON DELETE CASCADE,
  lfa_project_id UUID NOT NULL REFERENCES lfa_projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Achievement tracking values
  recorded_value NUMERIC NOT NULL,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by TEXT, -- Email/name of the user logging this entry
  
  -- Simple Evidence UX fields
  evidence_source_type TEXT CHECK (evidence_source_type IN ('manual_url', 'onedrive', 'other')),
  evidence_url TEXT,
  evidence_note TEXT,
  
  -- Behind the scenes OneDrive storage coordinates
  onedrive_drive_id TEXT,
  onedrive_item_id TEXT,
  onedrive_web_url TEXT,
  
  -- Optional future integrations
  library_document_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE lfa_meal_tracking_entries ENABLE ROW LEVEL SECURITY;

-- Row Level Security Isolation Policy
DROP POLICY IF EXISTS "org_isolation_lfa_meal_tracking_entries" ON lfa_meal_tracking_entries;
CREATE POLICY "org_isolation_lfa_meal_tracking_entries" ON lfa_meal_tracking_entries
  FOR ALL USING (org_id = (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() LIMIT 1
  ));

-- Optimize queries
CREATE INDEX IF NOT EXISTS idx_meal_tracking_entries_item ON lfa_meal_tracking_entries(meal_item_id);
CREATE INDEX IF NOT EXISTS idx_meal_tracking_entries_project ON lfa_meal_tracking_entries(lfa_project_id);
